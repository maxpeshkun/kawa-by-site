// pages/wholesale/checkout.js
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ShoppingCart, X } from "lucide-react";

const STORAGE_KEY = "kawa.cart.v2";

// === те же утилиты картинок по EAN ===
function eanToPath(ean) {
  const s = String(ean || "").replace(/\D/g, "");
  if (s.length < 8) return null;
  return [s.slice(0, 3), s.slice(3, 6), s.slice(6, 9), s.slice(9)].filter(Boolean).join("/");
}
function candidatesByBarcode(ean) {
  const s = String(ean || "").trim();
  const offPath = eanToPath(s);
  const list = [
    `/images/products/${s}.webp`,
    `/images/products/${s}.jpg`,
    `/images/products/${s}.png`,
  ];
  if (offPath) {
    list.push(
      `https://images.openfoodfacts.org/images/products/${offPath}/front.400.jpg`,
      `https://images.openfoodfacts.org/images/products/${offPath}/front_en.400.jpg`
    );
  }
  list.push(`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(s)}&code=EAN13&translate-esc=off`);
  return list;
}
function SmartImg({ barcode, alt = "", className = "" }) {
  const [idx, setIdx] = useState(0);
  const cands = useMemo(() => candidatesByBarcode(barcode), [barcode]);
  const src = cands[Math.min(idx, cands.length - 1)];
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setIdx((i) => (i + 1 < cands.length ? i + 1 : i))}
      loading="lazy"
    />
  );
}

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

export default function WholesaleCheckoutPage() {
  // 1) Корзина
  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, []));
  useEffect(() => setJSON(STORAGE_KEY, cart), [cart]);

  const totalQty = useMemo(() => cart.reduce((s, r) => s + (r.qty || 0), 0), [cart]);
  const totalSum = useMemo(() => cart.reduce((s, r) => s + (Number(r.price || 0) * (r.qty || 0)), 0), [cart]);

  // 2) Контакты/компания
  const [form, setForm] = useState({
    company: "",
    inn: "",
    contact: "",
    phone: "",
    email: "",
    comment: "",
  });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);

  if (typeof window !== "undefined" && totalQty === 0) {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-5 text-center shadow-sm">
          <div className="text-lg font-semibold">Корзина пуста</div>
          <div className="text-sm text-gray-600 mt-1">Добавьте товары на шаге 1.</div>
          <a
            href="/wholesale/order"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:opacity-90"
          >
            <ArrowLeft size={16} />
            Вернуться к товарам
          </a>
        </div>
      </div>
    );
  }

  function addQty(id, delta) {
    setCart((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const row = { ...next[idx] };
      const stock = Number.isFinite(row.stock) ? Math.max(0, Number(row.stock)) : Infinity;
      row.qty = Math.max(0, Math.min(stock, (row.qty || 0) + delta));
      if (row.qty === 0) next.splice(idx, 1);
      else next[idx] = row;
      return next;
    });
  }
  function remove(id) {
    setCart((prev) => prev.filter((r) => r.id !== id));
  }

  async function submit() {
    setMsg(null);
    const errs = [];
    if (!form.company.trim()) errs.push("Компания");
    if (!form.contact.trim()) errs.push("Контакт");
    if (!form.phone.trim()) errs.push("Телефон");
    if (!/.+@.+\..+/.test(form.email)) errs.push("Email");
    if (errs.length) {
      setMsg({ ok: false, text: `Заполните поля: ${errs.join(", ")}` });
      return;
    }
    if (!cart.length) {
      setMsg({ ok: false, text: "Корзина пуста" });
      return;
    }
    try {
      setSending(true);
      const payload = {
        customer: form,
        items: cart.map((r) => ({ id: r.id, qty: r.qty, price: r.price, title: r.title })),
        totalQty,
        totalSum,
        meta: { source: "kawa.by", at: new Date().toISOString() },
      };
      const resp = await fetch("/api/cart-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setMsg({ ok: true, text: "Заявка отправлена. Мы свяжемся с вами." });
    } catch (e) {
      setMsg({ ok: false, text: `Ошибка отправки: ${String(e?.message || e)}` });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Верхний бар */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <a
            href="/wholesale/order"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <ArrowLeft size={16} />
            К товарам
          </a>
          <div className="text-sm text-gray-700">
            <span className="inline-flex items-center gap-2">
              <ShoppingCart size={16} />
              Позиции: <b>{cart.length}</b> · Всего: <b>{totalQty}</b> · Сумма: <b>{currency(totalSum)}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="mx-auto max-w-5xl px-4 py-4 grid gap-4 lg:grid-cols-5">
        {/* Форма */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-semibold">Контактные данные</div>
            <div className="mt-3 grid gap-3">
              <input placeholder="Компания*" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="УНП / ИНН" value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="Контактное лицо*" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Телефон*" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="Email*" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <textarea placeholder="Комментарий (условия доставки, время, примечания)" rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            </div>

            {msg && (
              <div className={"mt-3 rounded-xl px-3 py-2 text-sm " + (msg.ok ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-amber-200 bg-amber-50 text-amber-800")}>
                {msg.text}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/wholesale/order" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm">
                <ArrowLeft size={16} />
                Назад к списку
              </a>
              <button onClick={submit} disabled={sending} className={"inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm " + (sending ? "bg-gray-200 text-gray-500" : "bg-gray-900 text-white hover:opacity-90")}>
                {sending ? "Отправка…" : <>Отправить заявку <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        </div>

        {/* Состав заказа */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-semibold">Состав заказа</div>

            <div className="mt-3 grid gap-2">
              {cart.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <SmartImg barcode={r.barcode} alt={r.title} className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                  <div className="min-w-0 flex-1 px-1">
                    <div className="truncate font-medium">{r.title}</div>
                    {r.pack_qty ? <div className="text-gray-600 text-xs">{r.pack_qty}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => addQty(r.id, -1)} className="h-8 w-8 rounded-lg border border-gray-200" aria-label="Убавить">−</button>
                    <div className="w-8 text-center">{r.qty}</div>
                    <button onClick={() => addQty(r.id, +1)} className="h-8 w-8 rounded-lg border border-gray-200" aria-label="Прибавить">+</button>
                  </div>
                  <div className="w-20 text-right font-semibold">{currency(r.qty * (r.price || 0))}</div>
                  <button onClick={() => remove(r.id)} className="inline-flex items-center gap-1 text-red-600 text-xs">
                    <X size={12} /> Удалить
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 border-top border-gray-200 pt-3 text-sm text-gray-700">
              Позиции: <b>{cart.length}</b> · Всего: <b>{totalQty}</b> · Сумма: <b>{currency(totalSum)}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Нижний закреп */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <span className="inline-flex items-center gap-2">
              <ShoppingCart size={16} /> Всего: <b>{totalQty}</b> · Сумма: <b>{currency(totalSum)}</b>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/wholesale/order" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm">
              <ArrowLeft size={16} /> К товарам
            </a>
            <button onClick={submit} disabled={sending} className={"inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm " + (sending ? "bg-gray-200 text-gray-500" : "bg-gray-900 text-white hover:opacity-90")}>
              Завершить заявку <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}