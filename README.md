# Ijuru Signal

An independent Next.js concept for climate evidence and field verification in Rwanda. The location briefing shows explicit unavailable states; no external data or AI integration is connected. Private field checks and administration are not yet available.

## Run

The web app requires Node.js 20+ and pnpm. The experimental SQLite CLI uses the built-in `node:sqlite` module and was verified on Node 26.12.0; Node 20 cannot run it. From this directory run `pnpm install`, then `pnpm dev`. Run `pnpm build` for a production build. This project has its own dependencies, UI components, design system and Git repository.

## Mobile prototype

Open [the main user prototype](prototype/index.html) or [the admin dashboard prototype](prototype/dashboard.html) directly in a browser. It is an interactive mockup with illustrative content; it does not connect to services or save data.

## Local SQLite foundation

`SQLITE_PATH=./data/app.sqlite pnpm db:migrate` explicitly creates the initial schema. Use a durable local filesystem, not ephemeral or network storage. `SQLITE_PATH=./data/app.sqlite pnpm db:backup /secure/path/new-backup.sqlite` creates a consistent SQLite snapshot using `VACUUM INTO`; the destination must not exist. Protect the backup with filesystem permissions and test restoration in an isolated location. The web app does not yet read or write this database, and authentication and private field checks are not implemented.

### Offline administrator bootstrap

After migrating an existing SQLite database, an operator with filesystem access can create the first administrator. The command accepts the login as an argument and the password on standard input; it refuses to run if an administrator already exists. For example, in Bash:

```bash
read -rs -p "Administrator passphrase: " ijuru_passphrase
printf '\n'
printf '%s\n' "$ijuru_passphrase" | pnpm admin:bootstrap admin
unset ijuru_passphrase
```

Use the same `SQLITE_PATH` as the migration command and protect the database and backups. This is an offline bootstrap only: the web app has no sign-in endpoint or admin operations yet. There is no account recovery or user-management interface. Protect the operator's shell and avoid putting the passphrase in command arguments, shell history or environment variables.

PostgreSQL 18 remains planned; see [implementation architecture](docs/09-implementation-architecture.md) and the `.env` examples. No data is migrated by changing an environment variable.

## Documentation

- [Product and MVP](docs/02-product.md)
- [Research and competition](docs/01-research.md)
- [Architecture and data integrations](docs/03-architecture.md)
- [Delivery and pitch](docs/04-delivery-and-pitch.md)
- [Implementation architecture and AI orchestration](docs/09-implementation-architecture.md) (authoritative)
- [System design and architecture diagram](docs/07-system-design.md) (earlier workflow context)
- [Tasks and acceptance gates](TASKS.md) and [agent starting prompt](AGENT_PROMPT.md)
- [Validation and delivery plan](docs/08-validation-and-delivery.md)
- [Agent instructions](AGENTS.md) and [project memory](MEMORY.md)
- [Production prompt](docs/05-production-prompt.md)
- [Name screening](docs/06-name-clearance.md)
- [Design foundation](DESIGN.md) and [product context](PRODUCT.md)
