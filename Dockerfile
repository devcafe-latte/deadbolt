FROM node:10.16-alpine as node

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
RUN npm install
COPY . .
RUN npx tsc
CMD ["node", "/app/build/app.js"]