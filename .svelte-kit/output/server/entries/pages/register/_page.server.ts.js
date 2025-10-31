import { error, fail, redirect } from "@sveltejs/kit";
import { g as get, r as run } from "../../../chunks/db.js";
import bcrypt from "bcryptjs";
const load = async ({ url }) => {
  const code = url.searchParams.get("code");
  if (!code) throw error(404, "Invite code required");
  const row = await get("SELECT Code, Used FROM InviteCodes WHERE Code = ?", [code]);
  if (!row || row.Used) throw error(404, "Invalid or used invite code");
  return { code };
};
const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const email = (form.get("email") || "").trim().toLowerCase();
    const password = form.get("password") || "";
    const code = (form.get("code") || "").trim();
    if (!email || !password || !code) {
      return fail(400, { error: "All fields required", code, email });
    }
    if (password.length < 8) {
      return fail(400, { error: "Password must be at least 8 characters", code, email });
    }
    const invite = await get("SELECT Code, Used FROM InviteCodes WHERE Code = ?", [code]);
    if (!invite || invite.Used) {
      return fail(400, { error: "Invalid or already used invite code" });
    }
    const existing = await get("SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)", [email]);
    if (existing) {
      return fail(400, { error: "An admin with that email already exists" });
    }
    const hash = bcrypt.hashSync(password, 10);
    const epoch = Math.floor(Date.now() / 1e3);
    const info = await run("INSERT INTO AdminUsers (Email, PasswordHash, CreatedAt) VALUES (?, ?, ?)", [email, hash, epoch]);
    const newAdminId = info && (info.insertId ?? info.lastInsertRowid) || null;
    await run("UPDATE InviteCodes SET Used = 1, UsedBy = ?, UsedAt = ? WHERE Code = ?", [newAdminId ?? email, epoch, code]);
    throw redirect(303, "/login");
  }
};
export {
  actions,
  load
};
