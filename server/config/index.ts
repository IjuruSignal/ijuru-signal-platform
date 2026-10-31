/**
 * Validated server configuration for Ijuru Signal.
 * Enforces security constraints, non-memory durable SQLite storage,
 * and strict host allowlisting for AI providers.
 */

export interface DbConfigSqlite {
  provider: 'sqlite';
  sqlitePath: string;
}

export interface DbConfigPostgres {
  provider: 'postgres';
  databaseUrl: string;
}

export type DbConfig = DbConfigSqlite | DbConfigPostgres;

export interface AiConfigDisabled {
  provider: 'disabled';
}

export interface AiConfigEnabled {
  provider: 'openai-compatible' | 'anthropic';
  model: string;
  apiKey: string;
  baseUrl: string;
  allowedHosts: readonly string[];
  timeoutMs: number;
  maxOutputTokens: number;
  allowLocalHttp: boolean;
}

export type AiConfig = AiConfigDisabled | AiConfigEnabled;

export interface AuthConfig {
  sessionTtlMs: number;
  lockoutThreshold: number;
  lockoutDurationMs: number;
}

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  db: DbConfig;
  ai: AiConfig;
  auth: AuthConfig;
}

function parseInteger(value: string | undefined | null, fallback: number, min: number, max: number, name: string): number {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(`Invalid ${name}: must be an integer between ${min} and ${max}`);
  }
  return num;
}

function parseAllowedHosts(value: string | string[] | undefined | null): string[] {
  if (Array.isArray(value)) return value.map((h) => String(h).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
  }
  return [];
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const nodeEnv = (env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: must be development, production, or test`);
  }

  // Database configuration (prioritize postgres if DATABASE_URL or POSTGRES_URL is provided)
  const rawDbUrl = (env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRESQL_URL || '').trim();
  const dbProvider = rawDbUrl ? 'postgres' : (env.DB_PROVIDER || 'sqlite');
  if (!['sqlite', 'postgres'].includes(dbProvider)) {
    throw new Error(`Invalid DB_PROVIDER: must be sqlite or postgres`);
  }

  let db: DbConfig;
  if (dbProvider === 'sqlite') {
    const sqlitePath = env.SQLITE_PATH || './data/app.sqlite';
    if (typeof sqlitePath !== 'string' || !sqlitePath.trim() || sqlitePath === ':memory:') {
      throw new Error('A durable SQLite path is required; in-memory database is not permitted');
    }
    db = Object.freeze({
      provider: 'sqlite',
      sqlitePath: sqlitePath.trim(),
    });
  } else {
    const databaseUrl = rawDbUrl;
    if (!databaseUrl || typeof databaseUrl !== 'string') {
      throw new Error('DATABASE_URL is required when DB_PROVIDER=postgres');
    }
    try {
      const parsed = new URL(databaseUrl);
      if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
        throw new Error('DATABASE_URL must use postgres: or postgresql: protocol');
      }
    } catch (err: any) {
      throw new Error(`Invalid DATABASE_URL: ${err.message}`);
    }
    db = Object.freeze({
      provider: 'postgres',
      databaseUrl: databaseUrl.trim(),
    });
  }

  // AI Provider configuration
  const rawAiProvider = env.AI_PROVIDER?.trim();
  const openrouterApiKey = env.OPENROUTER_API_KEY?.trim();
  const generalApiKey = env.AI_API_KEY?.trim();

  let ai: AiConfig;

  // Simplified OpenRouter / OpenAI-compatible shortcut:
  // If AI_PROVIDER is not explicitly set (or is empty), but OPENROUTER_API_KEY or AI_API_KEY is provided
  if (!rawAiProvider && (openrouterApiKey || generalApiKey)) {
    const apiKey = (openrouterApiKey || generalApiKey)!;
    const model = env.AI_MODEL?.trim() || 'openrouter/free';
    const rawBaseUrl = env.AI_BASE_URL?.trim() || 'https://openrouter.ai/api';

    let url: URL;
    try {
      url = new URL(rawBaseUrl);
    } catch (err: any) {
      throw new Error(`Invalid AI_BASE_URL: ${err.message}`);
    }

    if (url.username || url.password || url.hash || url.search) {
      throw new Error('AI_BASE_URL must not contain credentials, query parameters, or hash');
    }

    const allowedHosts = env.AI_ALLOWED_HOSTS
      ? parseAllowedHosts(env.AI_ALLOWED_HOSTS)
      : ['openrouter.ai', 'api.openai.com'];

    if (!allowedHosts.includes(url.hostname)) {
      throw new Error(`AI_BASE_URL host '${url.hostname}' is not in AI_ALLOWED_HOSTS`);
    }

    const isLocalHttpAllowed =
      nodeEnv !== 'production' &&
      env.AI_ALLOW_LOCAL_HTTP === 'true' &&
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);

    if (url.protocol !== 'https:' && !isLocalHttpAllowed) {
      throw new Error('AI_BASE_URL requires HTTPS protocol');
    }

    const timeoutMs = parseInteger(env.AI_TIMEOUT_MS, 30000, 1, 120000, 'AI_TIMEOUT_MS');
    const maxOutputTokens = parseInteger(env.AI_MAX_OUTPUT_TOKENS, 1024, 1, 4096, 'AI_MAX_OUTPUT_TOKENS');

    ai = Object.freeze({
      provider: 'openai-compatible',
      model,
      apiKey,
      baseUrl: url.toString().replace(/\/$/, ''),
      allowedHosts: Object.freeze(allowedHosts),
      timeoutMs,
      maxOutputTokens,
      allowLocalHttp: isLocalHttpAllowed,
    });
  } else {
    const aiProvider = rawAiProvider || 'disabled';
    if (!['disabled', 'openai-compatible', 'anthropic'].includes(aiProvider)) {
      throw new Error(`Invalid AI_PROVIDER: must be disabled, openai-compatible, or anthropic`);
    }

    if (aiProvider === 'disabled') {
      ai = Object.freeze({ provider: 'disabled' });
    } else {
      // Default to openrouter/free if not specified
      const model = env.AI_MODEL?.trim() || (openrouterApiKey || env.AI_BASE_URL?.includes('openrouter') ? 'openrouter/free' : undefined);
      if (!model || typeof model !== 'string' || !model.trim()) {
        throw new Error('AI_MODEL is required when AI_PROVIDER is enabled');
      }

      const apiKey = env.AI_API_KEY;
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('AI_API_KEY is required when AI_PROVIDER is enabled');
      }

      const rawBaseUrl = env.AI_BASE_URL;
      if (!rawBaseUrl || typeof rawBaseUrl !== 'string') {
        throw new Error('AI_BASE_URL is required when AI_PROVIDER is enabled');
      }

      let url: URL;
      try {
        url = new URL(rawBaseUrl);
      } catch (err: any) {
        throw new Error(`Invalid AI_BASE_URL: ${err.message}`);
      }

      if (url.username || url.password || url.hash || url.search) {
        throw new Error('AI_BASE_URL must not contain credentials, query parameters, or hash');
      }

      const allowedHosts = parseAllowedHosts(env.AI_ALLOWED_HOSTS);
      if (!allowedHosts.includes(url.hostname)) {
        throw new Error(`AI_BASE_URL host '${url.hostname}' is not in AI_ALLOWED_HOSTS`);
      }

      const isLocalHttpAllowed =
        nodeEnv !== 'production' &&
        env.AI_ALLOW_LOCAL_HTTP === 'true' &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);

      if (url.protocol !== 'https:' && !isLocalHttpAllowed) {
        throw new Error('AI_BASE_URL requires HTTPS protocol');
      }

      const timeoutMs = parseInteger(env.AI_TIMEOUT_MS, 30000, 1, 120000, 'AI_TIMEOUT_MS');
      const maxOutputTokens = parseInteger(env.AI_MAX_OUTPUT_TOKENS, 1024, 1, 4096, 'AI_MAX_OUTPUT_TOKENS');

      ai = Object.freeze({
        provider: aiProvider as 'openai-compatible' | 'anthropic',
        model: model.trim(),
        apiKey: apiKey.trim(),
        baseUrl: url.toString().replace(/\/$/, ''),
        allowedHosts: Object.freeze(allowedHosts),
        timeoutMs,
        maxOutputTokens,
        allowLocalHttp: isLocalHttpAllowed,
      });
    }
  }

  // Auth configuration
  const sessionTtlMs = parseInteger(
    env.SESSION_TTL_MS,
    8 * 60 * 60 * 1000,
    60000,
    86400000,
    'SESSION_TTL_MS'
  );
  const lockoutThreshold = parseInteger(env.LOCKOUT_THRESHOLD, 5, 1, 20, 'LOCKOUT_THRESHOLD');
  const lockoutDurationMs = parseInteger(
    env.LOCKOUT_DURATION_MS,
    15 * 60 * 1000,
    60000,
    3600000,
    'LOCKOUT_DURATION_MS'
  );

  const auth: AuthConfig = Object.freeze({
    sessionTtlMs,
    lockoutThreshold,
    lockoutDurationMs,
  });

  return Object.freeze({
    nodeEnv,
    db,
    ai,
    auth,
  });
}
