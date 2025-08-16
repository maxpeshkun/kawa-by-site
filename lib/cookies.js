// lib/cookies.js

function serialize(name, val, options = {}) {
  const opt = { path: "/", ...options };
  let cookie = `${name}=${encodeURIComponent(val)}`;

  if (opt.maxAge != null) cookie += `; Max-Age=${Math.floor(opt.maxAge)}`;
  if (opt.domain) cookie += `; Domain=${opt.domain}`;
  if (opt.path) cookie += `; Path=${opt.path}`;
  if (opt.expires) cookie += `; Expires=${opt.expires.toUTCString()}`;
  if (opt.httpOnly) cookie += `; HttpOnly`;
  if (opt.secure) cookie += `; Secure`;
  if (opt.sameSite) cookie += `; SameSite=${opt.sameSite}`;

  return cookie;
}

export function setCookie(res, name, value, options) {
  const prev = res.getHeader("Set-Cookie");
  const next = serialize(name, value, options);
  if (!prev) {
    res.setHeader("Set-Cookie", next);
  } else if (Array.isArray(prev)) {
    res.setHeader("Set-Cookie", [...prev, next]);
  } else {
    res.setHeader("Set-Cookie", [prev, next]);
  }
}

export function clearCookie(res, name) {
  setCookie(res, name, "", {
    maxAge: 0,
    path: "/",
  });
}
