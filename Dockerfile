FROM oven/bun:1.3.3-alpine AS installer

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
COPY examples /build/examples
COPY tsconfig.json /build/tsconfig.json

# Builder Image
FROM sources AS builder

WORKDIR /build
RUN bun compile

# Final image
FROM alpine:3.22

RUN apk add --no-cache libstdc++ libgcc

WORKDIR /build

COPY --from=builder /build/dist /build/dist
COPY --from=builder /build/node_modules/@openworkers/croner-wasm/dist/node node_modules/@openworkers/croner-wasm/dist/node

EXPOSE 7000

CMD [ "./dist/openworkers-api" ]
