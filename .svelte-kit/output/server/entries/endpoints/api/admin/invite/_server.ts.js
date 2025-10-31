import { r as run } from "../../../../../chunks/db.js";
import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { i as isAdmin, g as getUserFromCookies } from "../../../../../chunks/helpers.js";
import { l as logInfo, a as logError } from "../../../../../chunks/logger.js";
import { p as private_env } from "../../../../../chunks/shared-server.js";
const transporter = nodemailer.createTransport({
  host: private_env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(private_env.SMTP_PORT ?? 587),
  secure: Number(private_env.SMTP_PORT ?? 587) === 465,
  auth: private_env.SMTP_USER && private_env.SMTP_PASS ? { user: private_env.SMTP_USER, pass: private_env.SMTP_PASS } : void 0
});
const POST = async ({ request, cookies }) => {
  try {
    if (!await isAdmin(cookies)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
    const { email } = await request.json();
    if (!email) return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
    const code = randomBytes(24).toString("hex");
    const epoch = Math.floor(Date.now() / 1e3);
    await run("INSERT INTO InviteCodes (Code, Used, CreatedAt) VALUES (?, 0, ?)", [code, epoch]);
    try {
      const actor = await getUserFromCookies(cookies);
      const actorEmail = actor?.email ?? "unknown";
      await logInfo("[invite] created", { actor: actorEmail, code, email, createdAt: epoch });
    } catch (e) {
    }
    const origin = private_env.SITE_ORIGIN ?? "http://localhost:5173";
    const registerUrl = `${origin}/register?code=${encodeURIComponent(code)}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Comic Invites" <no-reply@local>',
      to: email,
      subject: "Admin invite",
      text: `You were invited as an admin. Register: ${registerUrl}
Code: ${code}`,
      html: `<p>You were invited as an admin.</p><p><a href="${registerUrl}">Register</a></p><p>Code: <strong>${code}</strong></p>`
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    try {
      logError("[invite] error", { message: err?.message ?? String(err), stack: err?.stack ?? null });
    } catch (e) {
    }
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
};
export {
  POST
};
