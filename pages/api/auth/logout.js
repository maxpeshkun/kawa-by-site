// pages/api/auth/logout.js
import { clearCookie } from "@/lib/cookies";

const COOKIE_NAME = "kawa_session";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  clearCookie(res, COOKIE_NAME);
  return res.status(200).json({ ok: true });
}
