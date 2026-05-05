FROM node:20.19.1-alpine

WORKDIR /bot

ENV DATABASE_URL="file:/bot/data/rats.db"
VOLUME /bot/data

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

RUN npm run prisma:generate

COPY assets ./assets

copy prisma.config.ts ./

COPY start.sh ./
RUN chmod +x start.sh

ENTRYPOINT ["./start.sh"]