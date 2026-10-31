/** Provider calls accept a transport so tests never need network access. */

export interface ProviderConfig {
  provider: 'disabled' | 'openai-compatible' | 'anthropic';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  allowedHosts?: string[];
  allowLocalHttp?: boolean;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  text: string;
}

export interface ProviderInstance {
  generate(opts: { messages: ModelMessage[]; signal?: AbortSignal }): Promise<{ status: string; text?: string }>;
}

export function validateProviderConfig(config: any): ProviderConfig {
  if (!config || config.provider === 'disabled') return { provider: 'disabled' };
  if (
    !['openai-compatible', 'anthropic'].includes(config.provider) ||
    !config.model ||
    !config.apiKey ||
    !Array.isArray(config.allowedHosts)
  ) {
    throw new Error('Invalid provider configuration');
  }
  const url = new URL(config.baseUrl);
  if (url.username || url.password || url.hash || url.search || !config.allowedHosts.includes(url.hostname)) {
    throw new Error('Provider host is not allowed');
  }
  if (
    url.protocol !== 'https:' &&
    !(
      config.allowLocalHttp === true &&
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
    )
  ) {
    throw new Error('Provider requires HTTPS');
  }
  if (
    !Number.isInteger(config.timeoutMs) ||
    config.timeoutMs < 1 ||
    config.timeoutMs > 120000 ||
    !Number.isInteger(config.maxOutputTokens) ||
    config.maxOutputTokens < 1 ||
    config.maxOutputTokens > 4096
  ) {
    throw new Error('Invalid provider limits');
  }
  return { ...config, baseUrl: url.toString().replace(/\/$/, '') };
}

export function createProvider(input: any, transport: typeof fetch = fetch): ProviderInstance {
  const config = validateProviderConfig(input);
  if (config.provider === 'disabled') return { generate: async () => ({ status: 'disabled' }) };

  return {
    async generate({ messages, signal }: { messages: ModelMessage[]; signal?: AbortSignal }) {
      if (
        !Array.isArray(messages) ||
        messages.length === 0 ||
        messages.some((m) => !['system', 'user', 'assistant'].includes(m.role) || typeof m.text !== 'string' || m.text.length > 20000)
      ) {
        throw new Error('Invalid messages');
      }
      const anthropic = config.provider === 'anthropic';
      const cleanBase = (config.baseUrl || '').replace(/\/v1\/?$/, '');
      const url = `${cleanBase}${anthropic ? '/v1/messages' : '/v1/chat/completions'}`;
      const body = anthropic
        ? {
            model: config.model,
            max_tokens: config.maxOutputTokens,
            messages: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.text })),
            system: messages.find((m) => m.role === 'system')?.text,
          }
        : {
            model: config.model,
            max_tokens: config.maxOutputTokens,
            messages: messages.map((m) => ({ role: m.role, content: m.text })),
          };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      const cancel = () => controller.abort();
      if (signal?.aborted) controller.abort();
      else signal?.addEventListener('abort', cancel, { once: true });

      try {
        const response = await transport(url, {
          method: 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            ...(anthropic
              ? { 'x-api-key': config.apiKey!, 'anthropic-version': '2023-06-01' }
              : {
                  authorization: `Bearer ${config.apiKey}`,
                  'HTTP-Referer': 'https://ijuru.rw',
                  'X-Title': 'Ijuru Signal',
                }),
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
        const data = (await response.json()) as any;
        const text = anthropic
          ? data?.content
              ?.filter((part: any) => part.type === 'text')
              .map((part: any) => part.text)
              .join('')
          : data?.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || !text || text.length > 50000) throw new Error('Invalid provider response');
        return { status: 'ok', text };
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', cancel);
      }
    },
  };
}
