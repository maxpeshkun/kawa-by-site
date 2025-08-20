// pages/dashboard.js
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => r.json())
      .then(j => setData(j))
      .catch(() => setData({ auth: false, user: null }));
  }, []);

  if (!data) return <p className="p-4">Загрузка...</p>;
  if (!data.auth) return <p className="p-4">Не авторизован</p>;

  const user = data.user || {};
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Добро пожаловать, {user.email}!</h1>
      <p className="mt-2">Это твой личный кабинет 👋</p>
    </div>
  );
}
