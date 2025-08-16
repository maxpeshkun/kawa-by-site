import { useEffect, useState } from "react";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error("Ошибка:", err));
  }, []);

  if (!user) {
    return <p className="p-4">Загрузка...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Добро пожаловать, {user.name || user.email}!</h1>
      <p className="mt-2">Это твой личный кабинет 👋</p>
    </div>
  );
}