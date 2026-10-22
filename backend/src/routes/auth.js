import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db.js";
import { config } from "../config.js";
import { HttpError, asyncHandler } from "../errors.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
const failedLogins = new Map();
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function loginAttemptKey(req, username) {
  return `${req.ip}:${username.toLowerCase()}`;
}

function enforceLoginLimit(req, username) {
  const key = loginAttemptKey(req, username);
  const now = Date.now();
  const attempts = (failedLogins.get(key) ?? []).filter((time) => now - time < LOGIN_WINDOW_MS);
  failedLogins.set(key, attempts);
  if (attempts.length >= LOGIN_LIMIT) {
    const retryAfter = Math.ceil((LOGIN_WINDOW_MS - (now - attempts[0])) / 1000);
    throw new HttpError(429, "Too many failed login attempts. Please try again later.", { retryAfter });
  }
  return key;
}

function recordFailedLogin(key) {
  failedLogins.set(key, [...(failedLogins.get(key) ?? []), Date.now()]);
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const attemptKey = enforceLoginLimit(req, username);
    const { rows } = await pool.query(
      `SELECT id, name, username, password_hash, role, active
       FROM users WHERE LOWER(username) = LOWER($1)`,
      [username],
    );
    const user = rows[0];
    if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
      recordFailedLogin(attemptKey);
      throw new HttpError(401, "Invalid username or password");
    }
    failedLogins.delete(attemptKey);

    const token = jwt.sign(
      { sub: user.id, name: user.name, username: user.username, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN },
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    });
  }),
);

router.get("/me", authenticate, (req, res) => {
  const { sub, name, username, role } = req.user;
  res.json({ user: { id: sub, name, username, role } });
});

export default router;
