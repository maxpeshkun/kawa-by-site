// pages/api/wholesale-apply.js

export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body; // данные из формы

      // 👉 тут позже добавим сохранение в базу или отправку на почту
      console.log("Заявка от оптовика:", data);

      res.status(200).json({
        success: true,
        message: "Заявка успешно отправлена",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Ошибка обработки заявки",
      });
    }
  } else if (req.method === "GET") {
    res.status(200).json({ status: "ok" });
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
