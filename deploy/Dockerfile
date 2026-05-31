FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY packages/server/package.json packages/server/tsconfig.json packages/server/tsconfig.build.json packages/server/nest-cli.json packages/server/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src packages/shared/src/
COPY packages/server/src packages/server/src/
COPY packages/server/prisma packages/server/prisma/

RUN pnpm --filter @ai-account/shared build
RUN pnpm --filter @ai-account/server build

FROM node:20-alpine AS production

RUN apk add --no-cache tini curl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

COPY --from=base /app/packages/shared/dist /app/packages/shared/dist/
COPY --from=base /app/packages/server/dist /app/packages/server/dist/
COPY --from=base /app/packages/server/prisma /app/packages/server/prisma/

RUN pnpm install --prod --frozen-lockfile

RUN pnpm --filter @ai-account/server prisma:generate

ENV NODE_ENV=production

EXPOSE 3000

USER node

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "packages/server/dist/main.js"]