// pages/wholesale/order.js
import React, { useEffect, useMemo, useState } from "react";
import { Search, Filter, ShoppingCart, Minus, Plus, Barcode, UserCircle2, ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "kawa.cart.v2";

// утилиты
const currency = (n) =>
  Number(n || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getJSON = (k, fb) => {
  if (typeof window === "undefined") return fb;
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fb;
  } catch {
    return fb;
  }
};
const setJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

// -------------------- Родитель: только проверка авторизации --------------------
export default function WholesaleOrderPage() {
  const [user, setUser] = useState(undefined); // undefined = загрузка, null = не авторизован, {email} = ок

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const d = r.ok ? await r.json().catch(() => ({})) : {};
        if (alive) setUser(d?.user || null);
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Загрузка…</div>;
  }

  if (user === null) {
    const next = encodeURIComponent("/wholesale/order");
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-white to-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
          <div className="text-xl font-semibold">Нужна авторизация</div>
          <div className="text-sm text-gray-600 mt-1">Чтобы оформить оптовый заказ, войдите в аккаунт.</div>
          <a
            href={`/wholesale/login?next=${next}`}
            className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm bg-gray-900 text-white hover:opacity-90"
          >
            Войти
          </a>
        </div>
      </div>
    );
  }

  // авторизован → экран заказа
  return <OrderScreen user={user} />;
}

// -------------------- Дочерний: каталог, фильтры, корзина --------------------
function OrderScreen({ user }) {
  // DEMO товары (можно заменить на /api/b2b-products)
  const PRODUCTS = [
    { id: "p1", title: "KAWA Espresso 1kg", brand: "KAWA", pack_qty: "12 шт", category: "Кофе", price: 25.9, barcode: "4601234567890", img: "/img/coffee1.jpg", stock: 120 },
    { id: "p2", title: "KAWA Arabica 500g", brand: "KAWA", pack_qty: "24 шт", category: "Кофе", price: 15.9, barcode: "4601234567891", img: "/img/coffee2.jpg", stock: 80 },
    { id: "p3", title: "KAWA Black Tea 100", brand: "KAWA", pack_qty: "12 шт", category: "Чай", price: 7.9, barcode: "4609876501234", img: "/img/tea1.jpg", stock: 340 },
    { id: "p4", title: "KAWA Green Tea 50", brand: "KAWA", pack_qty: "24 шт", category: "Чай", price: 5.5, barcode: "4609876501235", img: "/img/tea2.jpg", stock: 260 },
    { id: "p5", title: "CleanUp Средство 500мл", brand: "CleanUp", pack_qty: "12 шт", category: "Бытовая химия", price: 3.2, barcode: "4699999000001", img: "/img/chem1.jpg", stock: 90 },
    { id: "p6", title: "CleanUp Порошок 1кг", brand: "CleanUp", pack_qty: "12 шт", category: "Бытовая химия", price: 4.9, barcode: "4699999000002", img: "/img/chem2.jpg", stock: 55 },
  ];

  // состояние
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, [])); // массив позиций [{id,title,price,qty,stock,pack_qty,image}]
  const [showCart, setShowCart] = useState(false);

  // сохранить корзину
  useEffect(() => setJSON(STORAGE_KEY, cart), [cart]);

  // индексы/итоги
  const cartIndex = useMemo(() => {
    const m = new Map();
    cart.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [cart]);
  const items = cart;
  const totalQty = useMemo(() => cart.reduce((s, r) => s + (r.qty || 0), 0), [cart]);
  const totalSum = useMemo(() => cart.reduce((s, r) => s + (Number(r.price || 0) * (r.qty || 0)), 0), [cart]);

  // фильтр
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return PRODUCTS.filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!qq ||
          (p.title || "").toLowerCase().includes(qq) ||
          (p.brand || "").toLowerCase().includes(qq) ||
          (p.barcode || "").toLowerCase().includes(qq))
    );
  }, [q, cat]);

  // операции с корзиной (без отображения числа на карточке, с ограничением по stock)
  function add(p, delta = 1) {
    const idx = cartIndex.get(p.id);
    const max = Number.isFinite(p.stock) ? Math.max(0, Number(p.stock)) : Infinity;
    if (idx == null) {
      const qty = Math.min(delta, max);
      if (qty <= 0) return;
      setCart((prev) => [
        ...prev,
        { id: p.id, title: p.title, price: p.price, qty, stock: p.stock, pack_qty: p.pack_qty, image: p.img },
      ]);
    } else {
      setCart((prev) => {
        const next = [...prev];
        const row = { ...next[idx] };
        row.qty = Math.min(max, (row.qty || 0) + delta);
        if (row.qty <= 0) next.splice(idx, 1);
        else next[idx] = row;
        return next;
      });
    }
  }
  function remove(id) {
    setCart((prev) => prev.filter((r) => r.id !== id));
  }

  useEffect(() => {
    if (totalQty === 0) setShowCart(false);
  }, [totalQty]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ВЕРХ: поиск/фильтр (sticky) */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 space-y-2">
          <div className="text-lg font-semibold">Оформление оптового заказа</div>
          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по названию, бренду, штрихкоду…"
                className="pl-9 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Все категории</option>
                {[...new Set(PRODUCTS.map((p) => p.category))].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm">
                <Filter size={16} />
                Фильтр
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* СПИСОК: одна колонка, мобильный-first */}
      <div className="mx-auto max-w-md px-2 py-3 grid gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col gap-2">
            <img src={p.img} alt={p.title} className="w-full h-40 object-cover rounded-lg" />
            <div className="text-base font-semibold">{p.title}</div>
            <div className="text-xs text-gray-600 uppercase">{p.category}</div>
            <div className="text-sm text-gray-600">{p.brand} • в упаковке {p.pack_qty}</div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="font-semibold">{currency(p.price)}</span>
              <span className="inline-flex items-center gap-1 text-gray-600">
                <Barcode size={14} /> {p.barcode}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => add(p, -1)}
                className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center"
                aria-label="Убавить"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => add(p, +1)}
                className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center"
                aria-label="Прибавить"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* НИЖНИЙ ВИДЖЕТ: корзина/сумма/переходы (sticky) */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setShowCart((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-2 py-1 text-sm"
            >
              <ShoppingCart size={16} /> Корзина ({totalQty})
            </button>
            <div className="text-gray-700 text-xs sm:text-sm">
              Сумма: <b>{currency(totalSum)}</b>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/wholesale/account"
              className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-2 py-1 text-sm"
            >
              <UserCircle2 size={16} /> Личный кабинет
            </a>
            <a
              href="/wholesale/checkout"
              className={
                "inline-flex items-center gap-1 rounded-xl px-2 py-1 text-sm " +
                (totalQty === 0 ? "bg-gray-200 text-gray-500 pointer-events-none" : "bg-gray-900 text-white hover:opacity-90")
              }
              aria-disabled={totalQty === 0}
            >
              <ArrowRight size={16} />
              Оформить заказ
            </a>
          </div>
        </div>

        {showCart && (
          <div className="border-t border-gray-200 bg-white/95 max-h-60 overflow-y-auto">
            <div className="mx-auto max-w-md px-3 py-2 grid gap-2">
              {items.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1 truncate">
                    <div className="truncate font-medium">{r.title}</div>
                    {r.pack_qty ? <div className="text-gray-600">{r.pack_qty}</div> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => add({ id: r.id, stock: r.stock }, -1)}
                      className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"
                      aria-label="Убавить"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm">{r.qty}</span>
                    <button
                      onClick={() => add({ id: r.id, stock: r.stock }, +1)}
                      className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"
                      aria-label="Прибавить"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="w-16 text-right font-semibold text-xs sm:text-sm">{currency(r.qty * (r.price || 0))}</div>
                  <button onClick={() => remove(r.id)} className="inline-flex items-center gap-1 text-red-600 text-xs">
                    <X size={12} />
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
