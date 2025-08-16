// pages/api/auth/me.js
import { verifyJWT } from "@/lib/jwt";

const COOKIE_NAME = "kawa_session";

export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";
  const token = (cookie.split(";").map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`)) || "")
    .split("=")[1];

  const payload = verifyJWT(token, process.env.JWT_SECRET);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.status(200).json({ ok: true, user: { email: payload.email } });
}
