#!/bin/sh
npx prisma migrate deploy
node bot.js
