import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { r as run, g as get } from "../../../../../chunks/db.js";
import { a as logError } from "../../../../../chunks/logger.js";
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
      console.log("Loaded .env into process.env for send-email endpoint");
    }
  } catch (e) {
    console.warn("Failed to read .env file for send-email endpoint:", e && e.message ? e.message : e);
  }
}
let transporter;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  console.log("Using SMTP transport for nodemailer", process.env.SMTP_HOST || "smtp.gmail.com", "user=", process.env.SMTP_USER);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    requireTLS: Number(process.env.SMTP_PORT) === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    logger: true,
    debug: true
  });
} else {
  transporter = nodemailer.createTransport({ jsonTransport: true });
  console.log("Using jsonTransport for nodemailer (no SMTP credentials)");
}
const POST = async ({ request }) => {
  try {
    const { id, email, message, reply } = await request.json();
    if (!id || !email || !reply) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }
    try {
      await run("CREATE TABLE IF NOT EXISTS SendAttempts (Id INTEGER PRIMARY KEY AUTOINCREMENT, InquiryId INTEGER NOT NULL, AttemptedAt INTEGER NOT NULL, Success INTEGER NOT NULL, MessageId TEXT, Response TEXT)");
      const thirty = Math.floor(Date.now() / 1e3) - 30;
      const lastSuccess = await get("SELECT AttemptedAt FROM SendAttempts WHERE InquiryId = ? AND Success = 1 ORDER BY AttemptedAt DESC LIMIT 1", [id]);
      if (lastSuccess && lastSuccess.AttemptedAt >= thirty) {
        return new Response(JSON.stringify({ error: "Rate limit: try again later" }), { status: 429 });
      }
    } catch (e) {
      logError("[send-email] rate-limit check failed", { err: e && e.stack ? e.stack : String(e), id, email });
    }
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Comic Replies" <no-reply@local>',
      to: email,
      subject: "Reply to your inquiry",
      text: `Your question:
${message}

Our reply:
${reply}`
    });
    try {
      try {
        await run("ALTER TABLE Inquiries ADD COLUMN SentMessageId TEXT");
      } catch (e) {
      }
      await run("UPDATE Inquiries SET SeenByUser = 1, SentMessageId = ? WHERE Id = ?", [info.messageId || null, id]);
    } catch (e) {
      logError("[send-email] DB update failed", { err: e && e.stack ? e.stack : String(e), id, email });
    }
    return new Response(JSON.stringify({ success: true, messageId: info.messageId, accepted: info.accepted || [] }), { status: 200 });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[send-email] error", { stack });
    return new Response(JSON.stringify({ error: "Server error", __fallbackError: "Failed to send email (see server logs)" }), { status: 500 });
  }
};
export {
  POST
};
