// pages/api/auth/me.js
import { setCookie, parseCookies, clearCookie } from "../../lib/cookies";
import { createSession, getSession, destroySession } from "../../lib/sessions"

export default async function handler(req, res) {
  // мягкая проверка — всегда 200
  try {
    const cookies = parseCookies(req);
    const token = cookies.auth_token;
    const sess = getSession(token);
    if (!sess) {
      return res.status(200).json({ authenticated: false });
    }
    return res.status(200).json({
      authenticated: true,
      email: sess.email,
      createdAt: sess.createdAt,
    });
  } catch (e) {
    return res.status(200).json({ authenticated: false });
  }
}
