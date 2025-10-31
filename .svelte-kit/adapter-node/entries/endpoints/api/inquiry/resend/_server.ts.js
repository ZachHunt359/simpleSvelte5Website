import { g as get, r as run } from "../../../../../chunks/db.js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { a as logError } from "../../../../../chunks/logger.js";
function loadEnv() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, "utf8");
        for (const line of raw.split(/\r?\n/)) {
          const l = line.trim();
          if (!l || l.startsWith("#")) continue;
          const eq = l.indexOf("=");
          if (eq === -1) continue;
          const key = l.slice(0, eq).trim();
          let val = l.slice(eq + 1).trim();
          if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      }
    } catch (e) {
      console.warn("resend: failed to load .env", e && e.message ? e.message : e);
    }
  }
}
function makeTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      requireTLS: Number(process.env.SMTP_PORT) === 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}
const POST = async ({ request }) => {
  try {
    const { id } = await request.json();
    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    loadEnv();
    const row = await get("SELECT Id, Email, Message, Reply FROM Inquiries WHERE Id = ?", [id]);
    if (!row) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    if (!row.Email) return new Response(JSON.stringify({ error: "No email on record" }), { status: 400 });
    try {
      await run("CREATE TABLE IF NOT EXISTS SendAttempts (Id INTEGER PRIMARY KEY AUTOINCREMENT, InquiryId INTEGER NOT NULL, AttemptedAt INTEGER NOT NULL, Success INTEGER NOT NULL, MessageId TEXT, Response TEXT)");
    } catch (e) {
    }
    const thirty = Math.floor(Date.now() / 1e3) - 30;
    const lastSuccess = await get("SELECT AttemptedAt FROM SendAttempts WHERE InquiryId = ? AND Success = 1 ORDER BY AttemptedAt DESC LIMIT 1", [id]);
    if (lastSuccess && lastSuccess.AttemptedAt >= thirty) {
      return new Response(JSON.stringify({ error: "Rate limit: try again later" }), { status: 429 });
    }
    const transporter = makeTransporter();
    let info = {};
    let success = 0;
    let responseText = "";
    try {
      info = await transporter.sendMail({ from: process.env.SMTP_FROM || '"Comic Replies" <no-reply@local>', to: row.Email, subject: "Reply to your inquiry", text: `Your question:
${row.Message}

Our reply:
${row.Reply}` });
      success = 1;
      responseText = info.response || "";
    } catch (err) {
      responseText = err && err.message ? err.message : String(err);
    }
    try {
      await run("ALTER TABLE Inquiries ADD COLUMN SentMessageId TEXT");
    } catch (e) {
    }
    await run("UPDATE Inquiries SET SeenByUser = 1, SentMessageId = ? WHERE Id = ?", [info.messageId || null, id]);
    await run("INSERT INTO SendAttempts (InquiryId, AttemptedAt, Success, MessageId, Response) VALUES (?,?,?,?,?)", [id, Math.floor(Date.now() / 1e3), success, info.messageId || null, responseText]);
    if (success) return new Response(JSON.stringify({ success: true, messageId: info.messageId, accepted: info.accepted || [] }), { status: 200 });
    return new Response(JSON.stringify({ error: "Send failed", response: responseText, __fallbackError: "Resend failed (see server logs)" }), { status: 500 });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[resend] error", { stack });
    return new Response(JSON.stringify({ error: "Server error", __fallbackError: "Resend failed (see server logs)" }), { status: 500 });
  }
};
export {
  POST
};
