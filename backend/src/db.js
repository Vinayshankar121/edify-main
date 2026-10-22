import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { config } from "./config.js";

function prepare(sql, values = []) {
  const params = [...values];
  let text = sql.replace(/COALESCE\(\$(\d+)::uuid,\s*gen_random_uuid\(\)\)/gi, (_match, index) => {
    const position = Number(index) - 1;
    params[position] ??= crypto.randomUUID();
    return `$${index}`;
  });
  text = text.replace(/gen_random_uuid\(\)/gi, "UUID()").replace(/::uuid|::date|::int|::text/gi, "").replace(/ILIKE/gi, "LIKE").replace(/FOR UPDATE OF [\w, ]+/gi, "FOR UPDATE");
  const returning = text.match(/\s+RETURNING\s+(.+?)\s*;?$/i);
  if (returning) text = text.slice(0, returning.index);
  const ordered = [];
  text = text.replace(/\$(\d+)/g, (_match, index) => { ordered.push(params[Number(index) - 1]); return "?"; });
  const insert = text.match(/^\s*INSERT\s+INTO\s+([a-z_]+)\s*\(([^)]*)\)\s*VALUES\s*\(/i);
  let generatedId;
  if (insert && !insert[2].split(",").map((column) => column.trim()).includes("id")) {
    generatedId = crypto.randomUUID();
    text = text.replace(insert[0], `INSERT INTO ${insert[1]} (id, ${insert[2]}) VALUES (?, `);
    ordered.unshift(generatedId);
  }
  return { text, ordered, returning: returning?.[1]?.trim(), params, generatedId };
}

async function run(raw, sql, values) {
  const { text, ordered, returning, params, generatedId } = prepare(sql, values);
  const [result] = ordered.length ? await raw.execute(text, ordered) : await raw.query(text);
  if (!returning) return { rows: Array.isArray(result) ? result : [], rowCount: result.affectedRows ?? 0 };
  const table = text.match(/^\s*(?:INSERT\s+INTO|UPDATE)\s+([a-z_]+)/i)?.[1];
  const whereId = sql.match(/WHERE\s+id\s*=\s*\$(\d+)/i)?.[1];
  const id = whereId ? params[Number(whereId) - 1] : generatedId ?? params[0];
  if (!result.affectedRows || !table || !id) return { rows: [], rowCount: result.affectedRows ?? 0 };
  if (/^id$/i.test(returning)) return { rows: [{ id }], rowCount: result.affectedRows };
  const [rows] = await raw.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return { rows, rowCount: result.affectedRows };
}

export const pool = mysql.createPool(config.DATABASE_URL
  ? { uri: config.DATABASE_URL, waitForConnections: true, connectionLimit: 10, multipleStatements: true }
  : { host: config.DB_HOST, port: config.DB_PORT, user: config.DB_USER, password: config.DB_PASSWORD, database: config.DB_NAME, waitForConnections: true, connectionLimit: 10, multipleStatements: true });
const rawQuery = pool.query.bind(pool);
pool.query = (sql, values = []) => run({ execute: pool.execute.bind(pool), query: rawQuery }, sql, values);

export async function transaction(callback) {
  const connection = await pool.getConnection();
  const client = { query: (sql, values = []) => run(connection, sql, values) };
  try {
    await connection.beginTransaction();
    const result = await callback(client);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
