FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install

COPY src src
COPY tsconfig.json .
# COPY public public

ENV NODE_ENV production
ENV PORT 8000
CMD ["bun", "src/index.ts"]

EXPOSE 8000