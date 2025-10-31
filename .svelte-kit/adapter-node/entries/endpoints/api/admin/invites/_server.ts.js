import { i as isAdmin } from "../../../../../chunks/helpers.js";
import { q as query } from "../../../../../chunks/db.js";
const GET = async ({ cookies }) => {
  if (!await isAdmin(cookies)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  const rows = await query(
    `SELECT ic.Code, ic.Used, ic.CreatedAt, ic.UseBy, ic.UsedAt, ic.AdminUsed, au.Email AS AdminEmail
       FROM InviteCodes ic
       LEFT JOIN AdminUsers au ON au.Id = ic.AdminUsed
       ORDER BY ic.CreatedAt DESC`
  );
  const invites = rows.map((r) => {
    let useByNum = null;
    if (r.UseBy == null) {
      useByNum = null;
    } else if (typeof r.UseBy === "number") {
      useByNum = r.UseBy;
    } else if (typeof r.UseBy === "string") {
      const parsed = Number(r.UseBy);
      if (Number.isFinite(parsed)) useByNum = parsed;
      else useByNum = typeof r.CreatedAt === "number" ? r.CreatedAt + 24 * 60 * 60 : null;
    }
    return {
      Code: r.Code,
      Used: !!r.Used,
      CreatedAt: r.CreatedAt,
      UseBy: useByNum,
      UsedAt: r.UsedAt || null,
      AdminUsed: r.AdminUsed || null,
      AdminEmail: r.AdminEmail || null
    };
  });
  return new Response(JSON.stringify({ invites }), { headers: { "Content-Type": "application/json" } });
};
export {
  GET
};
