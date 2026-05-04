FROM node:20.19.1-alpine

WORKDIR /bot

ENV DATABASE_URL="file:/bot/data/rats.db"
VOLUME /bot/data

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

RUN npx prisma generate

COPY dist ./dist
COPY ratimages ./ratimages

COPY start.sh ./
RUN chmod +x start.sh

ENTRYPOINT ["./start.sh"]