// pages/api/auth/logout.js
import { destroySession } from "../../../lib/sessions";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  destroySession(res);
  res.status(200).json({ ok: true });
}
