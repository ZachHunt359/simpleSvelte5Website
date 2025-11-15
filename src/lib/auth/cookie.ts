/**
 * DB-backed session adapter.
 * - sessions stored in Sessions table
 * - admin users in AdminUsers table
 */
import type { Cookies } from "@sveltejs/kit";
import debug from "debug";
import { err, ok } from "neverthrow";
import { getDb, get, run } from "$lib/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const log = debug("app:lib:auth:cookie");

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export const cookie: AuthAdapter = {
  async validate_session({ token, opts }) {
    if (!opts?.cookies) throw new Error("must pass cookies in to options");
    if (!token) return err(new Error("no token provided"));

    const parts = token.split(":");
    if (parts.length !== 2) return err(new Error("invalid token format"));
    const [userId, sessionToken] = parts;

    try {
      const now = Math.floor(Date.now() / 1000);
      console.log('[auth] validate_session parts:', { userId, sessionToken });
      const session = await get("SELECT Token, UserId, CreatedAt, ExpiresAt FROM Sessions WHERE Token = ? AND UserId = ?", [sessionToken, userId]);
      console.log('[auth] session row:', session);

      if (!session) return err(new Error("no session found"));

      if (session.ExpiresAt && session.ExpiresAt < now) {
        await run("DELETE FROM Sessions WHERE Token = ?", [sessionToken]);
        return err(new Error("session expired"));
      }

      const userRow = await get("SELECT Id, Email FROM AdminUsers WHERE Id = ? OR lower(Email) = lower(?)", [userId, userId]);
      console.log('[auth] userRow:', userRow);
      if (!userRow) return err(new Error("no user found"));

      const user = { id: String(userRow.Id), email: userRow.Email, isAdmin: true };
      return ok(user);
    } catch (e) {
      console.error('[auth] validate_session exception:', e);
      return err(new Error('server error'));
    }
  },

  async login({ email, password, opts }) {
  console.log("[auth.login] Attempting login for email:", email);

  const row = await get("SELECT Id, Email, PasswordHash FROM AdminUsers WHERE lower(Email) = lower(?)", [email]);
  console.log("[auth.login] DB query result for email:", email, row);
  if (!row) {
    console.error("[auth.login] No user found for email:", email);
    return err(new Error("no user found"));
  }

  const matches = bcrypt.compareSync(password, row.PasswordHash);
  console.log("[auth.login] Password comparison result for email:", email, matches);

  if (!matches) {
    console.error("[auth.login] Invalid credentials for email:", email);
    return err(new Error("invalid credentials"));
  }

  console.log("[auth.login] Login successful for email:", email);
  // create session token
  const sessionToken = randomBytes(32).toString("hex");
  const epoch = Math.floor(Date.now() / 1000);
  const expiresAt = epoch + SESSION_MAX_AGE;

  // Use REPLACE for SQLite compatibility (works in both SQLite and MySQL)
  await run(`
    REPLACE INTO Sessions (Token, UserId, CreatedAt, ExpiresAt)
    VALUES (?, ?, ?, ?)
  `, [sessionToken, String(row.Id), epoch, expiresAt]);

  // set cookie as "<userId>:<sessionToken>"
  opts.cookies.set("auth_token", `${row.Id}:${sessionToken}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === 'production'
  });

  const user = { id: String(row.Id), email: row.Email, isAdmin: true };
  return ok(user);
  },

  async signup({ email, password, password_confirm, opts }) {
    // For admins, you probably use invite/registration flow instead.
    return err(new Error("signup not supported via cookie adapter"));
  },

  async logout({ token, opts }) {
    if (!opts?.cookies) return err(new Error("must pass cookies in to options"));
    if (token) {
      const parts = token.split(":");
      if (parts.length === 2) {
        const [, sessionToken] = parts;
        try {
          await run("DELETE FROM Sessions WHERE Token = ?", [sessionToken]);
        } catch (e) {
          // ignore
        }
      }
    }
    opts.cookies.delete("auth_token", { path: "/" });
    return;
  }
};