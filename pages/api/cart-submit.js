// Заглушка отправки заказа.
// Сейчас просто принимает payload и отвечает 200.
// Позже сюда можно добавить запись в B2B, отправку письма, Telegram и т.д.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    // Быстрая валидация
    if (!body || !Array.isArray(body.items) || !body.items.length) {
      return res.status(400).json({ error: "Empty order" });
    }
    // здесь можно логировать
    return res.status(200).json({ ok: true, received: body });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
