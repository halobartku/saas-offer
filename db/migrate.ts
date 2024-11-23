import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const db = drizzle({ connection: process.env.DATABASE_URL, schema });

async function main() {
  console.log("Running migrations...");
  
  try {
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
