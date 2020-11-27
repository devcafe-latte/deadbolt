# -- Compiler --
FROM node:12.18-alpine as compiler

# Add Python to build node dependencies.
RUN apk add --update \
    python \
    python-dev \
    py-pip \
    build-base \
  && pip install virtualenv \
  && rm -rf /var/cache/apk/*

LABEL version="2.1.3"

WORKDIR /app
COPY package*.json ./
# Build deps
RUN npm install
COPY . .
RUN npx tsc

# Remove dev deps
RUN npm install --only=production

# Todo maybe build a test phase here.

# -- Release build --
FROM node:12.18-alpine
WORKDIR /app
COPY --from=compiler /app .

CMD ["node", "/app/build/app.js"]