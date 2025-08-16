// pages/api/auth/login.js
import { signJWT } from "@/lib/jwt";
import { setCookie } from "@/lib/cookies";

const COOKIE_NAME = "kawa_session";
const TTL_SEC = 60 * 60 * 24 * 7; // 7 дней

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!/.+@.+\..+/.test(email)) {
      return res.status(400).json({ error: "Неверный email" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Пароль слишком короткий" });
    }

    // ВАЖНО: сейчас это демо-бэк без БД.
    // Любая пара email/пароль проходит. Позже подключим реальную проверку.
    const token = signJWT({ sub: email, email }, process.env.JWT_SECRET, TTL_SEC);

    setCookie(res, COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: TTL_SEC,
    });

    return res.status(200).json({ ok: true, user: { email } });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
