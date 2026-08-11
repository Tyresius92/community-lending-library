# base node image
FROM node:24-bullseye-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /myapp

ADD package.json package-lock.json .npmrc ./
ADD prisma ./prisma
ADD prisma.config.ts .
RUN npm install --include=dev

# Setup production node_modules
FROM base as production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json package-lock.json .npmrc ./
RUN npm prune --omit=dev

# Build the app
FROM base as build

# VITE_SENTRY_ENVIRONMENT tags client-side Sentry events as staging/production
# (differs per `flyctl deploy --app` invocation in the deploy workflow).
# SENTRY_AUTH_TOKEN lets the Sentry Vite plugin upload source maps on build.
ARG VITE_SENTRY_ENVIRONMENT
ARG SENTRY_AUTH_TOKEN

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules

ADD prisma ./prisma
ADD prisma.config.ts .
RUN npx prisma generate

ADD . .
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /myapp

COPY --from=production-deps /myapp/node_modules /myapp/node_modules

COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/public /myapp/public
ADD . .

CMD ["npm", "start"]
