FROM node:20-alpine

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/bookstore.db

EXPOSE 3001

# Data volume for SQLite persistence
VOLUME ["/data"]

CMD ["node", "src/app.js"]
