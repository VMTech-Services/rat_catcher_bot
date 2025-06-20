FROM node:20.19.1-alpine

ENV DATABASE_URL=file:../data/rats.db
WORKDIR /bot
VOLUME /bot/data

COPY . .
RUN npm ci
RUN npx prisma generate

ENTRYPOINT [ "./start.sh" ]
