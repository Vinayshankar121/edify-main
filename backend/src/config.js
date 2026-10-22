import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = configSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid backend configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (!parsed.data.DATABASE_URL && !(parsed.data.DB_HOST && parsed.data.DB_USER && parsed.data.DB_PASSWORD && parsed.data.DB_NAME)) {
  console.error("Invalid backend configuration: set DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.");
  process.exit(1);
}

export const config = parsed.data;
