FROM node:20.19.1-alpine

WORKDIR /bot

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate
RUN npx prisma migrate deploy

CMD [ "node", "bot.js" ]