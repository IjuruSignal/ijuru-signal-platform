import { claim, fail, finish } from './sqlite.mjs';

// A handler receives only its stored payload and an abort signal. Handlers must
// make external effects idempotent: a lease can expire while they are running.
export async function runOne(db, {workerId, handlers, leaseMs = 30000, timeoutMs = 20000, clock = () => new Date()}) {
 if (!handlers || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs >= leaseMs) throw new Error('Invalid worker configuration');
 const timestamp = () => clock().toISOString();
 const job = claim(db, workerId, timestamp(), leaseMs);
 if (!job) return {status:'idle'};
 const handler = Object.hasOwn(handlers, job.kind) ? handlers[job.kind] : undefined;
 if (typeof handler !== 'function') {
  const recorded = fail(db,{id:job.id,workerId,attempt:job.attempt,now:timestamp(),retryable:false,errorCode:'unknown_kind'});
  return {status:recorded ? 'failed' : 'lost_lease', id:job.id};
 }
 const controller = new AbortController();
 let timer;
 try {
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, timeoutMs); });
  const result = await Promise.race([Promise.resolve().then(() => handler(JSON.parse(job.payload), {signal:controller.signal, jobId:job.id})), timeout]);
  const recorded = finish(db,{id:job.id,workerId,attempt:job.attempt,now:timestamp(),result});
  return {status:recorded ? 'succeeded' : 'lost_lease', id:job.id};
 } catch (error) {
  // Persist only a controlled code, never exception text or source payload.
  const timedOut = controller.signal.aborted;
  const retryable = timedOut || error?.retryable === true;
  const recorded = fail(db,{id:job.id,workerId,attempt:job.attempt,now:timestamp(),retryable,retryDelayMs:Math.min(60000,1000 * 2 ** (job.attempt - 1)),errorCode:timedOut ? 'timeout' : 'handler_failed'});
  return {status:recorded ? (retryable && job.attempt < job.max_attempts ? 'queued' : 'failed') : 'lost_lease', id:job.id};
 } finally { clearTimeout(timer); }
}
