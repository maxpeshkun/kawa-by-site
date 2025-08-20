// lib/cookies.js
export function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      out[k] = v;
    }
  });
  return out;
}

export function setCookie(res, name, value, { maxAge = 60 * 60 * 24 * 7, path = "/", httpOnly = true, sameSite = "Lax", secure } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (maxAge) parts.push(`Max-Age=${maxAge}`);
  if (httpOnly) parts.push(`HttpOnly`);
  if (sameSite) parts.push(`SameSite=${sameSite}`);
  // На Vercel используется HTTPS — ставим Secure
  parts.push(`Secure`);
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearCookie(res, name, { path = "/" } = {}) {
  res.setHeader("Set-Cookie", `${name}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Lax; Secure`);
}