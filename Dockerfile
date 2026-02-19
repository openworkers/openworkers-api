FROM oven/bun:1-alpine AS installer

RUN mkdir -p /build

WORKDIR /build

## Copy package files
COPY bun.lock /build/
COPY package.json /build/

## Install dependencies
RUN bun install --frozen-lockfile

# Source Image
FROM installer AS sources

## Copy sources
COPY src /build/src
COPY static /build/static
COPY examples /build/examples
COPY svelte.config.ts /build/
COPY vite.config.ts /build/
COPY tsconfig.json /build/
COPY server.ts /build/

# Builder Image
FROM sources AS builder

WORKDIR /build
RUN bun run build

# Final image
FROM oven/bun:1-alpine

WORKDIR /build

COPY --from=builder /build/.svelte-kit/output/server .svelte-kit/output/server
COPY --from=builder /build/node_modules node_modules
COPY --from=builder /build/server.ts .

EXPOSE 7000

CMD ["bun", "server.ts"]
