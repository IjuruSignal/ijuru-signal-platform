import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../server/config/index.mjs";

test("loadConfig produces default secure SQLite configuration", () => {
  const config = loadConfig({});
  assert.equal(config.nodeEnv, "development");
  assert.equal(config.db.provider, "sqlite");
  assert.equal(config.db.sqlitePath, "./data/app.sqlite");
  assert.equal(config.ai.provider, "disabled");
  assert.equal(config.auth.sessionTtlMs, 8 * 60 * 60 * 1000);
  assert.equal(config.auth.lockoutThreshold, 5);
  assert.equal(config.auth.lockoutDurationMs, 15 * 60 * 1000);
});

test("loadConfig accepts custom SQLITE_PATH and trims whitespace", () => {
  const config = loadConfig({ SQLITE_PATH: "  /secure/storage/app.sqlite  " });
  assert.equal(config.db.sqlitePath, "/secure/storage/app.sqlite");
});

test("loadConfig rejects in-memory or empty SQLite paths", () => {
  assert.throws(
    () => loadConfig({ SQLITE_PATH: ":memory:" }),
    /durable SQLite path is required/
  );
  assert.throws(
    () => loadConfig({ SQLITE_PATH: "   " }),
    /durable SQLite path is required/
  );
});

test("loadConfig validates Postgres configuration", () => {
  const config = loadConfig({
    DB_PROVIDER: "postgres",
    DATABASE_URL: "postgresql://app_user:secret@localhost:55431/ijuru_db",
  });
  assert.equal(config.db.provider, "postgres");
  assert.equal(
    config.db.databaseUrl,
    "postgresql://app_user:secret@localhost:55431/ijuru_db"
  );

  assert.throws(
    () => loadConfig({ DB_PROVIDER: "postgres" }),
    /DATABASE_URL is required/
  );
  assert.throws(
    () =>
      loadConfig({
        DB_PROVIDER: "postgres",
        DATABASE_URL: "mysql://user:pass@localhost/db",
      }),
    /must use postgres: or postgresql:/
  );
});

test("loadConfig rejects invalid DB_PROVIDER and NODE_ENV", () => {
  assert.throws(
    () => loadConfig({ DB_PROVIDER: "oracle" }),
    /Invalid DB_PROVIDER/
  );
  assert.throws(
    () => loadConfig({ NODE_ENV: "staging" }),
    /Invalid NODE_ENV/
  );
});

test("loadConfig validates enabled AI provider configuration", () => {
  const validOpenAi = {
    AI_PROVIDER: "openai-compatible",
    AI_MODEL: "gpt-4o-mini",
    AI_API_KEY: "sk-test-key",
    AI_BASE_URL: "https://api.openai.com/v1",
    AI_ALLOWED_HOSTS: "api.openai.com, custom-host.org",
    AI_TIMEOUT_MS: "45000",
    AI_MAX_OUTPUT_TOKENS: "2048",
  };
  const config = loadConfig(validOpenAi);
  assert.equal(config.ai.provider, "openai-compatible");
  assert.equal(config.ai.model, "gpt-4o-mini");
  assert.equal(config.ai.baseUrl, "https://api.openai.com/v1");
  assert.deepEqual(config.ai.allowedHosts, ["api.openai.com", "custom-host.org"]);
  assert.equal(config.ai.timeoutMs, 45000);
  assert.equal(config.ai.maxOutputTokens, 2048);
});

test("loadConfig enforces AI host allowlist and HTTPS protocol", () => {
  const base = {
    AI_PROVIDER: "anthropic",
    AI_MODEL: "claude-3-5-sonnet",
    AI_API_KEY: "sk-ant-test",
    AI_BASE_URL: "https://api.anthropic.com",
    AI_ALLOWED_HOSTS: "api.openai.com",
  };
  assert.throws(
    () => loadConfig(base),
    /host 'api.anthropic.com' is not in AI_ALLOWED_HOSTS/
  );

  assert.throws(
    () =>
      loadConfig({
        ...base,
        AI_BASE_URL: "http://api.openai.com",
        AI_ALLOWED_HOSTS: "api.openai.com",
      }),
    /requires HTTPS/
  );

  assert.throws(
    () =>
      loadConfig({
        ...base,
        AI_BASE_URL: "https://user:pass@api.openai.com",
        AI_ALLOWED_HOSTS: "api.openai.com",
      }),
    /credentials, query parameters, or hash/
  );
});

test("loadConfig allows local HTTP for dev testing only when explicitly permitted", () => {
  const localConfig = loadConfig({
    NODE_ENV: "development",
    AI_PROVIDER: "openai-compatible",
    AI_MODEL: "local-model",
    AI_API_KEY: "local-key",
    AI_BASE_URL: "http://localhost:11434/v1",
    AI_ALLOWED_HOSTS: "localhost",
    AI_ALLOW_LOCAL_HTTP: "true",
  });
  assert.equal(localConfig.ai.baseUrl, "http://localhost:11434/v1");
  assert.equal(localConfig.ai.allowLocalHttp, true);

  // In production, local HTTP must be rejected
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: "production",
        AI_PROVIDER: "openai-compatible",
        AI_MODEL: "local-model",
        AI_API_KEY: "local-key",
        AI_BASE_URL: "http://localhost:11434/v1",
        AI_ALLOWED_HOSTS: "localhost",
        AI_ALLOW_LOCAL_HTTP: "true",
      }),
    /requires HTTPS/
  );
});

test("loadConfig validates auth and bounds constraints", () => {
  assert.throws(
    () => loadConfig({ SESSION_TTL_MS: "10" }),
    /Invalid SESSION_TTL_MS/
  );
  assert.throws(
    () => loadConfig({ LOCKOUT_THRESHOLD: "0" }),
    /Invalid LOCKOUT_THRESHOLD/
  );
  assert.throws(
    () => loadConfig({ LOCKOUT_DURATION_MS: "1000" }),
    /Invalid LOCKOUT_DURATION_MS/
  );
});
