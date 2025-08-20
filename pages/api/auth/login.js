// pages/api/auth/login.js
import { setSession } from "../../../lib/sessions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  // TODO: проверьте креды (БД/хардкод)
  if (email === "demo@kawa.by" && password === "demo123") {
    setSession(res, { user: { id: "1", email } });
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "Invalid credentials" });
}
