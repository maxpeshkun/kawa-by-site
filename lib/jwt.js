// lib/jwt.js
import crypto from "crypto";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlJSON(obj) {
  return b64url(JSON.stringify(obj));
}

export function signJWT(payload, secret, expiresInSec = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(60, expiresInSec);

  const body = { ...payload, iat, exp };

  const part1 = b64urlJSON(header);
  const part2 = b64urlJSON(body);
  const data = `${part1}.${part2}`;

  const sig = crypto
    .createHmac("sha256", String(secret || "dev-secret"))
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${sig}`;
}

export function verifyJWT(token, secret) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto
    .createHmac("sha256", String(secret || "dev-secret"))
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (s !== expected) return null;

  try {
    const payload = JSON.parse(Buffer.from(p, "base64").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
