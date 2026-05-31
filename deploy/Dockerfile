FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY prisma prisma/
COPY src src/
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

RUN pnpm prisma:generate
RUN pnpm build

FROM node:20-alpine AS production

RUN apk add --no-cache tini curl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

COPY --from=base /app/dist /app/dist/
COPY --from=base /app/prisma /app/prisma/

RUN pnpm install --prod --frozen-lockfile
RUN pnpm prisma:generate

ENV NODE_ENV=production

EXPOSE 3000

USER node

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"]