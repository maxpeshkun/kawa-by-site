// pages/api/orders.js

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { customer, items, totalQty, totalSum } = req.body || {};

    if (!customer || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // простейшая «валидация остатков» — на стороне сервера ещё раз проверим qty >= 0
    for (const i of items) {
      if (!i || !i.id || !Number.isFinite(i.qty) || i.qty <= 0) {
        return res.status(400).json({ error: "Invalid item in cart" });
      }
    }

    // TODO: здесь добавим запись в БД / отправку письма / проксирование в 1С
    console.log("Wholesale order received:", { customer, items, totalQty, totalSum });

    // сгенерируем простой номер заказа
    const orderId = Math.floor(100000 + Math.random() * 900000);

    return res.status(200).json({ ok: true, orderId });
  } catch (e) {
    return res.status(500).json({ error: "Server error", details: String(e?.message || e) });
  }
}