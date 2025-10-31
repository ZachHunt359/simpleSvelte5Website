import { t as transaction, r as run } from "../../../../../chunks/db.js";
const POST = async ({ request }) => {
  try {
    const { userId, inquiryIds } = await request.json();
    if (!userId || !Array.isArray(inquiryIds)) {
      return new Response(JSON.stringify({ error: "Missing userId or inquiryIds" }), { status: 400 });
    }
    await transaction(async (tx) => {
      for (const id of inquiryIds) {
        await run("UPDATE Inquiries SET SeenByUser = 1 WHERE Id = ? AND UserId = ?", [id, userId]);
      }
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
};
export {
  POST
};
