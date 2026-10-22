import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { pool } from "../db.js";

const credentials = z.object({
  ADMIN_NAME: z.string().trim().min(1),
  ADMIN_USERNAME: z.string().trim().min(3),
  ADMIN_PASSWORD: z.string().min(12),
});

try {
  const { ADMIN_NAME, ADMIN_USERNAME, ADMIN_PASSWORD } = credentials.parse(process.env);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (id, name, username, password_hash, role)
     VALUES ($1, $2, $3, $4, 'admin')`,
    [crypto.randomUUID(), ADMIN_NAME, ADMIN_USERNAME, passwordHash],
  );
  console.log(`Admin account '${ADMIN_USERNAME}' created.`);
} catch (error) {
  console.error("Could not create admin account:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
