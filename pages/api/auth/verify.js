// pages/api/auth/verify.js
import { setCookie, parseCookies, clearCookie } from "@/lib/cookies";
import { createSession, getSession, destroySession } from "@/lib/sessions";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { email, code } = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) || {};
      if (!email || !/.+@.+\..+/.test(email)) {
        return res.status(400).json({ error: "Укажите корректный email" });
      }
      // демо-проверка кода
      if (code !== "0000") {
        return res.status(400).json({ error: "Неверный код" });
      }
      const token = createSession(email);
      setCookie(res, "auth_token", token, { maxAge: 60 * 60 * 24 * 7 });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "Verify error", details: String(e?.message || e) });
    }
  }

  if (req.method === "DELETE") {
    // выход
    try {
      const cookies = parseCookies(req);
      const token = cookies.auth_token;
      if (token) destroySession(token);
      clearCookie(res, "auth_token");
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "Logout error", details: String(e?.message || e) });
    }
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}