// lib/cookies.js
export function getCookies(req) {
  const raw = req.headers?.cookie || "";
  return raw.split(";").reduce((acc, p) => {
    const [k, ...v] = p.split("=");
    if (!k) return acc;
    acc[k.trim()] = decodeURIComponent(v.join("=").trim());
    return acc;
  }, {});
}

export function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=/`];
  if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.httpOnly) parts.push(`HttpOnly`);
  if (opts.secure) parts.push(`Secure`);
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  res.setHeader("Set-Cookie", parts.join("; "));
}
