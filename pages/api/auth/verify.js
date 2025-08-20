// pages/api/auth/verify.js — uses lib/sessions (single cookie) 
import { setSession, destroySession } from "../../../lib/sessions";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const { email, code } = body;
      if (!email || !/.+@.+\..+/.test(email)) {
        return res.status(400).json({ error: "Укажите корректный email" });
      }
      if (String(code) !== "0000") {
        return res.status(400).json({ error: "Неверный код" });
      }
      // создаём сессию (одна кука sid, см. lib/sessions.js)
      setSession(res, { user: { id: email, email } });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "Verify error", details: String(e?.message || e) });
    }
  }

  if (req.method === "DELETE") {
    try {
      destroySession(res);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "Logout error", details: String(e?.message || e) });
    }
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}
