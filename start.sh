#!/bin/sh
export DATABASE_URL="file:/bot/data/rats.db"
npx prisma migrate deploy
npm run prod
