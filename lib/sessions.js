// lib/sessions.js
// Простейшее in-memory хранилище для демо.
// На проде заменить на Redis/БД.
const store = new Map(); // token -> { email, createdAt }

export function createSession(email) {
  const token = `t_${Math.random().toString(36).slice(2)}${Date.now()}`;
  store.set(token, { email, createdAt: Date.now() });
  return token;
}

export function getSession(token) {
  if (!token) return null;
  const s = store.get(token);
  return s || null;
}

export function destroySession(token) {
  if (!token) return;
  store.delete(token);
}