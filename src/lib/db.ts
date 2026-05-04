import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

if (!process.env.DATABASE_URL){
    console.error("No DATABASE_URL provided in ENV!")
    throw 2
}

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const db = new PrismaClient({ adapter });

console.log("Database connected successfully!")

export default db;