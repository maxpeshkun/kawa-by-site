// pages/api/auth/start.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { email } = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) || {};
    if (!email || !/.+@.+\..+/.test(email)) {
      return res.status(400).json({ error: "Укажите корректный email" });
    }
    // демо-код:
    const code = "0000";
    // В реале тут отправка письма со ссылкой/кодом.
    return res.status(200).json({ ok: true, code }); // показываем код прямо в ответе для теста
  } catch (e) {
    return res.status(500).json({ error: "Auth start error", details: String(e?.message || e) });
  }
}