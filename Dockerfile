FROM node:24-bookworm-slim

WORKDIR /app

# Enable corepack for pnpm support
RUN corepack enable

# Install project dependencies using frozen lockfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build Next.js application
ENV NODE_ENV=production
RUN pnpm build

# Create durable sqlite storage directory
RUN mkdir -p /app/data && chmod 777 /app/data
RUN chmod +x /app/scripts/docker-entrypoint.sh

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
