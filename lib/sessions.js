// lib/sessions.js
import { getCookies, setCookie } from "./cookies";

const COOKIE = "sid";
const MAX_AGE = 60 * 60 * 24 * 7;

export function getSession(req) {
  const sid = getCookies(req)[COOKIE];
  if (!sid) return null;
  try { return JSON.parse(Buffer.from(sid, "base64").toString("utf8")); }
  catch { return null; }
}

export function setSession(res, data) {
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64");
  setCookie(res, COOKIE, payload, { httpOnly: true, secure: true, sameSite: "Lax", maxAge: MAX_AGE });
}

export function destroySession(res) {
  setCookie(res, COOKIE, "", { httpOnly: true, secure: true, sameSite: "Lax", maxAge: 0 });
}
