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

WORKDIR /app
COPY package*.json ./
# Build deps
RUN npm install
COPY . .
RUN npx tsc

# Remove dev deps
RUN npm install --only=production

# -- Release build --
FROM node:12.18-alpine
WORKDIR /app
COPY --from=compiler /app .

CMD ["node", "/app/build/app.js"]