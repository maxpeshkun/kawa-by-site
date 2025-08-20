// pages/api/auth/login.js
import { setSession } from "../../../lib/sessions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password } = req.body || {};
  // TODO: заменить на реальную проверку
  if (email === "demo@kawa.by" && password === "demo123") {
    const user = { id: "1", email };
    setSession(res, { user }); // ставим cookie-сессию
    return res.status(200).json({ ok: true, user });
  }

  return res.status(401).json({ ok: false, error: "Invalid credentials" });
}
