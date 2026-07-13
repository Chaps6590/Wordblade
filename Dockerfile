FROM node:20-alpine AS build

# node:alpine no trae git. Sin git, vite.config.js no puede resolver el commit
# desde el repo clonado y termina mostrando "sin-git". Lo instalamos para que
# `git rev-parse` funcione cuando la plataforma no inyecta el SHA por build-arg.
RUN apk add --no-cache git

WORKDIR /app

ARG VITE_API_URL=https://wordblade-api.chapstech.com
ARG VITE_GIT_COMMIT_SHA
ARG VITE_COMMIT_SHA
ARG GIT_COMMIT_SHA
ARG GIT_COMMIT
ARG COMMIT_SHA
ARG SOURCE_COMMIT
ARG SOURCE_VERSION
ARG RAILWAY_GIT_COMMIT_SHA
ARG COOLIFY_GIT_COMMIT_SHA
ARG DOKPLOY_GIT_COMMIT_SHA
ARG DOKPLOY_COMMIT_SHA
ARG VERCEL_GIT_COMMIT_SHA
ARG CF_PAGES_COMMIT_SHA
ARG RENDER_GIT_COMMIT
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GIT_COMMIT_SHA=${VITE_GIT_COMMIT_SHA}
ENV VITE_COMMIT_SHA=${VITE_COMMIT_SHA}
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV GIT_COMMIT=${GIT_COMMIT}
ENV COMMIT_SHA=${COMMIT_SHA}
ENV SOURCE_COMMIT=${SOURCE_COMMIT}
ENV SOURCE_VERSION=${SOURCE_VERSION}
ENV RAILWAY_GIT_COMMIT_SHA=${RAILWAY_GIT_COMMIT_SHA}
ENV COOLIFY_GIT_COMMIT_SHA=${COOLIFY_GIT_COMMIT_SHA}
ENV DOKPLOY_GIT_COMMIT_SHA=${DOKPLOY_GIT_COMMIT_SHA}
ENV DOKPLOY_COMMIT_SHA=${DOKPLOY_COMMIT_SHA}
ENV VERCEL_GIT_COMMIT_SHA=${VERCEL_GIT_COMMIT_SHA}
ENV CF_PAGES_COMMIT_SHA=${CF_PAGES_COMMIT_SHA}
ENV RENDER_GIT_COMMIT=${RENDER_GIT_COMMIT}

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
# git se niega a operar sobre un repo con owner "distinto" dentro del contenedor.
RUN git config --global --add safe.directory /app || true
RUN pnpm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
