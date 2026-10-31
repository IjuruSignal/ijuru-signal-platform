#!/bin/sh
set -e

# Handle OpenRouter / AI environment setup
if [ -n "$OPENROUTER_API_KEY" ]; then
  export AI_API_KEY="${AI_API_KEY:-$OPENROUTER_API_KEY}"
  export AI_MODEL="${AI_MODEL:-openrouter/free}"
  export AI_PROVIDER="${AI_PROVIDER:-openai-compatible}"
  export AI_BASE_URL="${AI_BASE_URL:-https://openrouter.ai/api/v1}"
  export AI_ALLOWED_HOSTS="${AI_ALLOWED_HOSTS:-openrouter.ai}"
fi

# Auto-detect DB_PROVIDER if DATABASE_URL is set (e.g. Render Postgres)
if [ -n "$DATABASE_URL" ] && [ -z "$DB_PROVIDER" ]; then
  export DB_PROVIDER="postgres"
fi

# Ensure data directory exists for SQLite durable persistence
if [ "${DB_PROVIDER:-sqlite}" = "sqlite" ]; then
  SQLITE_PATH="${SQLITE_PATH:-/app/data/app.sqlite}"
  SQLITE_DIR=$(dirname "$SQLITE_PATH")
  mkdir -p "$SQLITE_DIR"
fi

echo "=== Running Database Migrations ==="
node scripts/db-migrate.ts

# Determine if auto-seeding is requested or database is empty
AUTO_SEED_FLAG="${AUTO_SEED:-false}"
SHOULD_SEED=false

if [ "$AUTO_SEED_FLAG" = "true" ] || [ "$AUTO_SEED_FLAG" = "1" ]; then
  SHOULD_SEED=true
else
  IS_EMPTY=$(node -e "
    import('./server/config/index.ts').then(async ({ loadConfig }) => {
      const config = loadConfig(process.env);
      if (config.db.provider === 'sqlite') {
        const { openDatabase } = await import('./server/db/sqlite.ts');
        const db = openDatabase(config.db.sqlitePath);
        try {
          const row = db.prepare('SELECT COUNT(*) as count FROM areas').get();
          console.log(row && row.count === 0 ? 'empty' : 'not_empty');
        } catch {
          console.log('empty');
        } finally {
          db.close();
        }
      } else {
        const { createPool } = await import('./server/db/postgres.ts');
        const pool = createPool(config.db.databaseUrl);
        try {
          const res = await pool.query('SELECT COUNT(*) as count FROM areas');
          console.log(parseInt(res.rows[0]?.count || '0', 10) === 0 ? 'empty' : 'not_empty');
        } catch {
          console.log('empty');
        } finally {
          await pool.end();
        }
      }
    }).catch(() => console.log('empty'));
  " 2>/dev/null || echo "empty")

  if [ "$IS_EMPTY" = "empty" ]; then
    SHOULD_SEED=true
  fi
fi

if [ "$SHOULD_SEED" = "true" ]; then
  echo "=== Seeding Database (Empty DB or AUTO_SEED enabled) ==="
  node scripts/db-seed.ts
else
  echo "=== Database already initialized; skipping seed ==="
fi

echo "=== Starting Ijuru Signal on port ${PORT:-3000} ==="
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
