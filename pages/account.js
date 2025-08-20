// pages/account.js
import React, { useEffect, useMemo, useState } from "react";

// ---- простые утилиты/компоненты (локальные, без внешних зависимостей) ----
const cx = (...a) => a.filter(Boolean).join(" ");

const Card = ({ className = "", children }) => (
  <div className={cx("rounded-2xl border border-gray-200 bg-white p-4 shadow-sm", className)}>{children}</div>
);

const Button = ({ children, onClick, type = "button", variant = "solid", disabled = false, className = "" }) => {
  const styles =
    variant === "solid"
      ? "bg-gray-900 text-white hover:opacity-90"
      : variant === "outline"
      ? "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
      : "bg-transparent text-gray-900 hover:bg-gray-100";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm transition disabled:opacity-50",
        styles,
        className
      )}
    >
      {children}
    </button>
  );
};

const Field = ({ label, ...props }) => (
  <label className="grid gap-1 text-sm">
    <span className="text-gray-600">{label}</span>
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-gray-300"
      )}
    />
  </label>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-gray-300 bg-white/70 px-3 py-1 text-xs text-gray-700">
    {children}
  </span>
);

// ---- мини-шапка, чтобы не конфликтовать с существующим AppShell ----
const HeaderMini = () => (
  <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/70 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <a href="/" className="font-semibold hover:underline">
        kawa.by — МЭР ТРЕЙД
      </a>
      <div className="text-sm text-gray-600">Личный кабинет</div>
    </div>
  </div>
);

// ---- мок-данные заказов (пока без API) ----
const MOCK_ORDERS = [
  {
    id: "ORD-2024-0012",
    date: "2024-08-20 12:14",
    status: "Выполнен",
    total: 428.5,
    items: [
      { id: "1001", title: "Кофе зерновой Arabica 1 кг", price: 12.5, qty: 10, stock: 32, category: "Кофе" },
      { id: "2001", title: "Чай чёрный листовой 500 г", price: 7.9, qty: 5, stock: 18, category: "Чай" },
      { id: "3007", title: "Средство для посуды 5 л", price: 9.2, qty: 8, stock: 11, category: "Бытовая химия" }
    ],
    comment: "Доставка в будни до 17:00",
  },
  {
    id: "ORD-2024-0009",
    date: "2024-08-12 09:40",
    status: "Отгружен",
    total: 189.0,
    items: [
      { id: "1001", title: "Кофе зерновой Arabica 1 кг", price: 12.5, qty: 6, stock: 32, category: "Кофе" },
      { id: "3011", title: "Гель для стирки 3 л", price: 15.5, qty: 3, stock: 9, category: "Бытовая химия" }
    ],
    comment: "",
  },
  {
    id: "ORD-2024-0003",
    date: "2024-07-29 16:02",
    status: "В обработке",
    total: 72.8,
    items: [
      { id: "2001", title: "Чай чёрный листовой 500 г", price: 7.9, qty: 4, stock: 18, category: "Чай" },
      { id: "2003", title: "Чай зелёный в пакетиках, 100 шт", price: 4.8, qty: 6, stock: 24, category: "Чай" }
    ],
    comment: "Просьба позвонить перед доставкой",
  },
];

// ---- работа с localStorage.cart (массив позиций) ----
function readCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cart");
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeCart(list) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("cart", JSON.stringify(list || []));
  } catch {}
}

// аккуратно добавляем позиции с учётом остатков
function addItemsToCart(items) {
  const cart = readCart();
  const byId = new Map(cart.map((c) => [c.id, c]));
  const notes = [];

  items.forEach((it) => {
    const current = byId.get(it.id) || { ...it, qty: 0 };
    const want = current.qty + it.qty;
    const limit = typeof it.stock === "number" ? Math.max(0, it.stock) : want;
    const finalQty = Math.min(want, limit);
    if (want > limit) {
      notes.push(`«${it.title}» урезано до ${finalQty} (на складе ${limit})`);
    }
    byId.set(it.id, { ...current, qty: finalQty, price: it.price, title: it.title, stock: it.stock, category: it.category });
  });

  const next = Array.from(byId.values()).filter((x) => x.qty > 0);
  writeCart(next);
  return notes;
}

// ---- модалка ----
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// ---- основная страница ----
export default function AccountPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [show, setShow] = useState(null); // заказ для просмотра в модалке
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // setOrders(MOCK_ORDERS)
  }, []);

  const statuses = useMemo(
    () => Array.from(new Set(orders.map((o) => o.status))).filter(Boolean),
    [orders]
  );

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const okQ = !query || o.id.toLowerCase().includes(query.toLowerCase());
      const okS = !status || o.status === status;
      return okQ && okS;
    });
  }, [orders, query, status]);

  const totalOrders = filtered.length;

  const handleReorder = (ord) => {
    const notes = addItemsToCart(ord.items);
    setToast(
      notes.length
        ? `Добавлено в корзину (с ограничениями): ${notes.join(" · ")}`
        : "Позиции заказа добавлены в корзину"
    );
    setTimeout(() => setToast(null), 4500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <HeaderMini />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Всего заказов</div>
              <Badge>История</Badge>
            </div>
            <div className="mt-2 text-2xl font-semibold">{totalOrders}</div>
          </Card>
          <Card>
            <div className="text-sm text-gray-600">Поиск по номеру</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например, ORD-2024-0012"
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </Card>
          <Card>
            <div className="text-sm text-gray-600">Статус</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Card>
        </div>

        <div className="grid gap-3">
          {filtered.map((o) => (
            <Card key={o.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="grid gap-1">
                  <div className="text-sm text-gray-600">
                    № {o.id} • {o.date}
                  </div>
                  <div className="text-sm">
                    Статус: <b>{o.status}</b>
                  </div>
                  <div className="text-sm">
                    Сумма: <b>{o.total.toFixed(2)}</b> BYN
                  </div>
                  {o.comment ? <div className="text-xs text-gray-500">Комментарий: {o.comment}</div> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setShow(o)}>
                    Просмотр
                  </Button>
                  <Button onClick={() => handleReorder(o)}>Повторить заказ</Button>
                </div>
              </div>
            </Card>
          ))}

          {filtered.length === 0 && (
            <Card className="text-sm text-gray-600">Заказы не найдены. Измени фильтры.</Card>
          )}
        </div>
      </main>

      <Modal open={!!show} onClose={() => setShow(null)}>
        {show && (
          <div className="grid gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Заказ</div>
                <div className="text-lg font-semibold">№ {show.id}</div>
                <div className="text-xs text-gray-500">{show.date} • {show.status}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Итого</div>
                <div className="text-xl font-semibold">{show.total.toFixed(2)} BYN</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-2 text-left">Товар</th>
                    <th className="p-2 text-left">Категория</th>
                    <th className="p-2 text-right">Цена</th>
                    <th className="p-2 text-right">Кол-во</th>
                    <th className="p-2 text-right">Остаток</th>
                    <th className="p-2 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {show.items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-2">{it.title}</td>
                      <td className="p-2">{it.category || "—"}</td>
                      <td className="p-2 text-right">{it.price.toFixed(2)}</td>
                      <td className="p-2 text-right">{it.qty}</td>
                      <td className="p-2 text-right">{typeof it.stock === "number" ? it.stock : "—"}</td>
                      <td className="p-2 text-right">{(it.price * it.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {show.comment ? <div className="text-xs text-gray-500">Комментарий: {show.comment}</div> : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => setShow(null)}>
                Закрыть
              </Button>
              <Button onClick={() => { handleReorder(show); setShow(null); }}>
                Повторить заказ
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Тост-уведомление */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 shadow">
          {toast}
        </div>
      )}

      {/* простой футер */}
      <div className="mt-10 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} kawa.by (ООО «МЭР ТРЕЙД»)
        </div>
      </div>

      {/* базовые стили (если нет tailwind) */}
      <style jsx global>{`
        html, body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"; }
        :root { color-scheme: light; }
      `}</style>
    </div>
  );
}
