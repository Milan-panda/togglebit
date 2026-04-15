FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/sdk/package.json packages/sdk/package.json

RUN pnpm install --frozen-lockfile

COPY apps/dashboard apps/dashboard
COPY packages/sdk packages/sdk

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_TOGGLEBIT_API_KEY
ARG NEXT_PUBLIC_TOGGLEBIT_API_URL
ARG NEXT_PUBLIC_TOGGLEBIT_ENV

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_TOGGLEBIT_API_KEY=$NEXT_PUBLIC_TOGGLEBIT_API_KEY
ENV NEXT_PUBLIC_TOGGLEBIT_API_URL=$NEXT_PUBLIC_TOGGLEBIT_API_URL
ENV NEXT_PUBLIC_TOGGLEBIT_ENV=$NEXT_PUBLIC_TOGGLEBIT_ENV

RUN pnpm --filter ./packages/sdk build
RUN pnpm --filter ./apps/dashboard build

EXPOSE 3000

CMD ["pnpm", "--filter", "./apps/dashboard", "start"]
