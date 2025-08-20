// pages/api/auth/verify.js
import { getCookies, setCookie } from "../../../lib/cookies";
import { setSession, destroySession } from "../../../lib/sessions";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { email, code } = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) || {};
      if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: "Укажите корректный email" });
      if (code !== "0000") return res.status(400).json({ error: "Неверный код" });
      // логиним по коду — создаём сессию
      setSession(res, { user: { id: "email:" + email, email } });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "Verify error", details: String(e?.message || e) });
    }
  }

  if (req.method === "DELETE") {
    // logout
    destroySession(res);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}
