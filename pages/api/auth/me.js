// pages/api/auth/me.js
import { getSession } from "../../../lib/sessions";

export default function handler(req, res) {
  const session = getSession(req);
  if (!session?.user) return res.status(200).json({ auth: false, user: null });
  return res.status(200).json({ auth: true, user: session.user });
}
