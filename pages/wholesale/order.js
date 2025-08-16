// pages/wholesale/order.js
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";

// --- маленькие утилиты ---
const cn = (...a) => a.filter(Boolean).join(" ");
const fmtN = (n) => (n == null ? "" : String(n));
const nowISO = () => new Date().toISOString().replace("T", " ").slice(0, 19);

// --- примитивные UI-компоненты (без Tailwind-плагинов, только классы) ---
const Shell = ({ children }) => (
  <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
    <Head><title>Оптовый заказ — kawa.by</title></Head>
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-semibold">kawa.by — МЭР ТРЕЙД</a>
        <nav className="text-sm flex gap-2">
          <a href="/#catalog" className="px-3 py-2 rounded-xl hover:bg-slate-100">Каталог</a>
          <a href="/#wholesale" className="px-3 py-2 rounded-xl hover:bg-slate-100">Оптовая заявка</a>
          <a href="/wholesale/order" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Оптовый заказ</a>
        </nav>
      </div>
    </header>
    <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    <footer className="border-t border-slate-100 mt-10">
      <div className="max-w-7xl mx-auto px-4 py-6 text-sm text-slate-500">
        © {new Date().getFullYear()} kawa.by (ООО «МЭР ТРЕЙД»)
      </div>
    </footer>
  </div>
);

const Card = ({ className, children }) => (
  <div className={cn("bg-white border border-slate-200 rounded-2xl shadow-sm p-4", className)}>{children}</div>
);

const Button = ({ children, className, ...rest }) => (
  <button
    {...rest}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition",
      "bg-slate-900 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
  >
    {children}
  </button>
);

const ButtonGhost = ({ children, className, ...rest }) => (
  <button
    {...rest}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition",
      "bg-transparent text-slate-900 border border-slate-200 hover:bg-slate-50 disabled:opacity-50",
      className
    )}
  >
    {children}
  </button>
);

// ------------------ Главный экран оптового заказа ------------------
export default function WholesaleOrderPage() {
  // ---------- Профиль ("личный кабинет" на localStorage) ----------
  const [profile, setProfile] = useState({
    company: "", inn: "", contact: "", email: "", phone: "", city: "", comment: ""
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("whProfile");
      if (raw) {
        const saved = JSON.parse(raw);
        setProfile((p) => ({ ...p, ...saved }));
      }
    } catch {}
  }, []);

  const saveProfile = () => {
    localStorage.setItem("whProfile", JSON.stringify(profile));
  };

  // ---------- Каталог ----------
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch("/api/b2b-products", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (ok) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (e) {
        if (ok) setErr(String(e?.message || e));
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, []);

  // поиск/фильтры
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const cats = useMemo(() => Array.from(new Set(products.map(p => p.category))).filter(Boolean), [products]);

  const filtered = useMemo(() =>
    products.filter(p =>
      (!cat || p.category === cat) &&
      (!q || (p.title || "").toLowerCase().includes(q.toLowerCase()))
    ), [products, cat, q]);

  // ---------- Корзина ----------
  const [cart, setCart] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("whCart");
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("whCart", JSON.stringify(cart));
  }, [cart]);

  const stockOf = (id) => {
    const p = products.find(x => x.id === id);
    const stock = Number(p?.stock ?? 0);
    return Number.isFinite(stock) ? Math.max(0, stock) : 0;
  };

  const addToCart = (p, qty) => {
    const want = Math.max(1, Math.floor(Number(qty || 1)));
    const max = stockOf(p.id);
    setCart((prev) => {
      const exists = prev.find(x => x.id === p.id);
      const already = exists ? exists.qty : 0;
      const allowed = Math.max(0, Math.min(max, already + want));
      const add = allowed - already;
      if (add <= 0) return prev; // нельзя превысить остаток
      const next = exists
        ? prev.map(x => x.id === p.id ? { ...x, qty: x.qty + add } : x)
        : [...prev, { id: p.id, title: p.title, price: +p.price || 0, qty: add, category: p.category, pack: p.pack }];
      return next;
    });
  };

  const setQty = (id, qtyRaw) => {
    const qty = Math.max(0, Math.floor(Number(qtyRaw || 0)));
    const max = stockOf(id);
    const clamped = Math.min(qty, max);
    setCart((prev) => prev.map(x => x.id === id ? { ...x, qty: clamped } : x).filter(x => x.qty > 0));
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter(x => x.id !== id));
  const clearCart = () => setCart([]);

  const total = useMemo(() => cart.reduce((s, x) => s + (x.price * x.qty), 0), [cart]);

  // ---------- История заказов (localStorage) ----------
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("whOrders");
      if (raw) setOrders(JSON.parse(raw));
    } catch {}
  }, []);
  const pushOrderToHistory = (order) => {
    const next = [order, ...orders].slice(0, 100);
    setOrders(next);
    localStorage.setItem("whOrders", JSON.stringify(next));
  };

  // ---------- Оформление заказа ----------
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  const canCheckout = cart.length > 0 && profile.company && profile.email && profile.phone;

  const onSubmitOrder = async () => {
    setSubmitMsg(null);

    // финальная проверка остатков
    for (const line of cart) {
      const max = stockOf(line.id);
      if (line.qty > max) {
        setSubmitMsg({ ok: false, text: `Товар «${line.title}»: максимум ${max} шт.` });
        return;
      }
    }

    // “фиксация” профиля
    saveProfile();

    const payload = {
      kind: "wholesale-order",
      placed_at: nowISO(),
      profile,
      items: cart.map(({ id, title, qty, price }) => ({ id, title, qty, price })),
      total
    };

    try {
      setSubmitting(true);
      // отправим в уже существующий эндпоинт (договорились раньше, что он принимает JSON)
      const r = await fetch("/api/wholesale-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      const order = {
        id: `ORD-${Date.now()}`,
        ...payload,
        status: "Отправлен",
      };
      pushOrderToHistory(order);
      clearCart();
      setSubmitMsg({ ok: true, text: "Заказ отправлен! Мы свяжемся с вами по указанным контактам." });
    } catch (e) {
      setSubmitMsg({ ok: false, text: `Не удалось отправить заказ: ${String(e?.message || e)}` });
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------- Рендер -------------------
  return (
    <Shell>
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Профиль */}
        <Card className="lg:col-span-1">
          <div className="font-semibold mb-3">Профиль (для выставления счёта)</div>
          <div className="grid gap-2">
            <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Компания*"
                   value={profile.company} onChange={(e)=>setProfile({...profile, company: e.target.value})}/>
            <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="УНП / ИНН"
                   value={profile.inn} onChange={(e)=>setProfile({...profile, inn: e.target.value})}/>
            <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Контактное лицо"
                   value={profile.contact} onChange={(e)=>setProfile({...profile, contact: e.target.value})}/>
            <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Email*"
                   value={profile.email} onChange={(e)=>setProfile({...profile, email: e.target.value})}/>
            <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Телефон*"
                   value={profile.phone} onChange={(e)=>setProfile({...profile, phone: e.target.value})}/>
            <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Город"
                   value={profile.city} onChange={(e)=>setProfile({...profile, city: e.target.value})}/>
            <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Комментарий"
                   value={profile.comment} onChange={(e)=>setProfile({...profile, comment: e.target.value})}/>
            <div className="flex gap-2">
              <ButtonGhost onClick={saveProfile}>Сохранить профиль</ButtonGhost>
              <ButtonGhost onClick={() => { localStorage.removeItem("whProfile"); setProfile({company:"",inn:"",contact:"",email:"",phone:"",city:"",comment:""}); }}>
                Очистить
              </ButtonGhost>
            </div>
          </div>
        </Card>

        {/* Каталог + Поиск */}
        <div className="lg:col-span-2 grid gap-4">
          <Card>
            <div className="font-semibold mb-3">Каталог (опт)</div>
            <div className="grid md:grid-cols-3 gap-2 mb-3">
              <input
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                placeholder="Поиск по названию"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={cat}
                onChange={(e)=>setCat(e.target.value)}
              >
                <option value="">Все категории</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ButtonGhost onClick={()=>{setQ(""); setCat("");}}>Сбросить фильтры</ButtonGhost>
            </div>

            {loading && <div className="text-sm text-slate-500">Загрузка каталога…</div>}
            {err && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{err}</div>}

            {!loading && !err && (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((p) => {
                  const max = stockOf(p.id);
                  const [qty, setLocalQty] = useState ? useState(1) : [1, () => {}]; // защитный хак для рендер-цикла
                  // но useState в map нельзя; сделаем простым контролем через dataset:
                  return (
                    <div className="border border-slate-200 rounded-2xl p-3" key={p.id}>
                      <div className="text-sm text-slate-500 mb-1">{p.category || "—"}</div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-slate-500">{p.pack || ""}</div>
                      <div className="mt-2 text-sm">
                        {p.price != null ? <>Цена: <b>{p.price}</b></> : "Цена: —"}
                        <span className="text-slate-500"> · Остаток: {max}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={max}
                          defaultValue={1}
                          data-id={p.id}
                          className="w-20 border border-slate-200 rounded-xl px-2 py-2 text-sm"
                          onChange={(e) => {
                            const v = Math.max(1, Math.min(max, Math.floor(Number(e.target.value || 1))));
                            e.currentTarget.value = String(v);
                          }}
                        />
                        <Button
                          disabled={max <= 0}
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement.querySelector("input[data-id]");
                            const want = Math.max(1, Math.min(max, Math.floor(Number(input?.value || 1))));
                            addToCart(p, want);
                          }}
                        >
                          В корзину
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Корзина */}
          <Card>
            <div className="font-semibold mb-3">Корзина</div>
            {cart.length === 0 ? (
              <div className="text-sm text-slate-500">Корзина пуста</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-2">Товар</th>
                    <th className="py-2 pr-2">Цена</th>
                    <th className="py-2 pr-2">Кол-во</th>
                    <th className="py-2 pr-2">Сумма</th>
                    <th className="py-2"></th>
                  </tr>
                  </thead>
                  <tbody>
                  {cart.map((x) => {
                    const max = stockOf(x.id);
                    return (
                      <tr key={x.id} className="border-t border-slate-100">
                        <td className="py-2 pr-2">
                          <div className="font-medium">{x.title}</div>
                          <div className="text-xs text-slate-500">Макс. {max} шт.</div>
                        </td>
                        <td className="py-2 pr-2">{fmtN(x.price)}</td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0}
                            max={max}
                            value={x.qty}
                            onChange={(e)=>setQty(x.id, e.target.value)}
                            className="w-24 border border-slate-200 rounded-xl px-2 py-1"
                          />
                        </td>
                        <td className="py-2 pr-2">{fmtN((x.price||0) * (x.qty||0))}</td>
                        <td className="py-2">
                          <ButtonGhost onClick={()=>removeFromCart(x.id)}>Убрать</ButtonGhost>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-slate-500">Итого позиций: {cart.length}</div>
                  <div className="text-lg font-semibold">Итого: {fmtN(total)}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <ButtonGhost onClick={clearCart}>Очистить корзину</ButtonGhost>
                  <Button disabled={!canCheckout || submitting} onClick={onSubmitOrder}>
                    {submitting ? "Отправка…" : "Оформить заказ"}
                  </Button>
                </div>
                {submitMsg && (
                  <div
                    className={cn(
                      "mt-3 rounded-xl px-3 py-2 text-sm border",
                      submitMsg.ok
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    )}
                  >
                    {submitMsg.text}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* История заказов */}
          <Card>
            <div className="font-semibold mb-3">История заказов (локально)</div>
            {orders.length === 0 ? (
              <div className="text-sm text-slate-500">Пока нет заказов</div>
            ) : (
              <div className="grid gap-3">
                {orders.map((o) => (
                  <div key={o.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{o.id}</div>
                      <div className="text-sm">{o.placed_at}</div>
                    </div>
                    <div className="text-sm text-slate-600">Статус: {o.status}</div>
                    <div className="mt-2 text-sm">
                      {o.items.map((i) => (
                        <div key={i.id} className="flex justify-between">
                          <span>{i.title} × {i.qty}</span>
                          <span>{fmtN(i.price * i.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 font-semibold">Итого: {fmtN(o.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
