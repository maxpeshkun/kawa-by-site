// pages/api/auth/me.js
import { getSession } from "../../../lib/sessions";

export default function handler(req, res) {
  try {
    const sess = getSession(req);
    if (sess?.user) {
      return res.status(200).json({
        authenticated: true,
        user: sess.user, // { id, email }
        email: sess.user.email,
      });
    }
    return res.status(200).json({ authenticated: false, user: null });
  } catch (e) {
    return res.status(200).json({ authenticated: false, user: null });
  }
}
