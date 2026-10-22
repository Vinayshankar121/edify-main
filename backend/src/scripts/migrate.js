import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

try {
  const migrationsUrl = new URL("../../migrations/", import.meta.url);
  const migrationsPath = fileURLToPath(migrationsUrl);
  const migrations = (await readdir(migrationsPath))
    .filter((file) => /^\d+_.*\.sql$/.test(file))
    .sort();
  for (const migration of migrations) {
    const sql = await readFile(new URL(`../../migrations/${migration}`, import.meta.url), "utf8");
    await pool.query(sql);
    console.log(`Applied ${migration}`);
  }
  console.log("Database migrations completed.");
} catch (error) {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
