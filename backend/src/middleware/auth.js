import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "../errors.js";
import { pool } from "../db.js";

export async function authenticate(req, _res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new HttpError(401, "Authentication required"));
  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch {
    return next(new HttpError(401, "Invalid or expired access token"));
  }
  try {
    const { rows } = await pool.query("SELECT active FROM users WHERE id = $1", [payload.sub]);
    if (!rows[0]?.active) return next(new HttpError(401, "Account is inactive"));
    req.user = payload;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, "You do not have permission to perform this action"));
    }
    return next();
  };
}