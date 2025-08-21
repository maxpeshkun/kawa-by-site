// pages/wholesale/order.js
import React, { useMemo, useState, useEffect } from "react";
import {
  Search, Filter, ShoppingCart, Minus, Plus, Barcode,
  UserCircle2, ArrowRight, X
} from "lucide-react";

type Product = {
  id: string;
  title: string;
  brand?: string;
  category: string;
  price: number;
  pack?: string;        // "12 шт."
  barcode?: string;
  image?: string;
  limit?: number;       // максимально можно добавить (ограничение)
};

// --- ДЕМО-КАТАЛОГ С КАРТИНКАМИ И ЛИМИТАМИ ---
const PRODUCTS: Product[] = [
  // Бытовая химия
  { id:"c1", title:"CleanUp Средство для посуды 500мл", brand:"CleanUp", category:"Бытовая химия", price:3.20, pack:"24 шт", barcode:"4699999000001", image:"https://images.unsplash.com/photo-1585386959984-a41552231656?q=80&w=800&auto=format&fit=crop", limit:24 },
  { id:"c2", title:"CleanUp Гель для стирки 3л",        brand:"CleanUp", category:"Бытовая химия", price:9.90, pack:"6 шт",  barcode:"4699999000002", image:"https://images.unsplash.com/photo-1585386959984-a41552231656?q=80&w=800&auto=format&fit=crop", limit:6 },
  { id:"c3", title:"CleanUp Кондиционер для белья 2л",  brand:"CleanUp", category:"Бытовая химия", price:7.50, pack:"8 шт",  barcode:"4699999000003", image:"https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop", limit:8 },
  { id:"c4", title:"CleanUp Средство для пола 1л",      brand:"CleanUp", category:"Бытовая химия", price:4.60, pack:"12 шт", barcode:"4699999000004", image:"https://images.unsplash.com/photo-1581579188871-45ea61f2a0c8?q=80&w=800&auto=format&fit=crop", limit:12 },

  // Кофе
  { id:"k1", title:"KAWA Espresso 1kg", brand:"KAWA", category:"Кофе", price:25.90, pack:"12 шт", barcode:"4601234567890", image:"https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop", limit:48 },
  { id:"k2", title:"KAWA Crema 1kg",    brand:"KAWA", category:"Кофе", price:28.50, pack:"8 шт",  barcode:"4601234567891", image:"https://images.unsplash.com/photo-1510707577719-ae7c14908d9f?q=80&w=800&auto=format&fit=crop", limit:48 },
  { id:"k3", title:"KAWA Arabica 250g", brand:"KAWA", category:"Кофе", price:8.90,  pack:"24 шт", barcode:"4601234567892", image:"https://images.unsplash.com/photo-1485808191679-5f86510681a2?q=80&w=800&auto=format&fit=crop", limit:96 },

  // Чай
  { id:"t1", title:"KAWA Black Tea 100", brand:"KAWA", category:"Чай", price:7.90, pack:"12 шт", barcode:"4609876501234", image:"https://images.unsplash.com/photo-1505577058444-a3dab90d4253?q=80&w=800&auto=format&fit=crop", limit:60 },
  { id:"t2", title:"KAWA Green Tea 50",  brand:"KAWA", category:"Чай", price:5.50, pack:"24 шт", barcode:"4609876501235", image:"https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=800&auto=format&fit=crop", limit:60 },
];

type Cart = Record<string, number>;
const money = (n:number) => Number(n||0).toLocaleString("ru-RU",{minimumFractionDigits:2, maximumFractionDigits:2});

export default function WholesaleOrderPage() {
  // фильтры
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  // корзина
  const [cart, setCart] = useState<Cart>({});
  const items = useMemo(()=> Object.entries(cart).map(([id, qty]) => ({ product: PRODUCTS.find(p=>p.id===id)!, qty })), [cart]);
  const totalQty = items.reduce((s,i)=> s + i.qty, 0);
  const totalSum = items.reduce((s,i)=> s + i.qty * (i.product?.price || 0), 0);
  const [showCart, setShowCart] = useState(false);
  useEffect(()=>{ if (totalQty===0) setShowCart(false); }, [totalQty]);

  // список (одна колонка) + компактное отображение для мобильных
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return PRODUCTS.filter(p =>
      (!cat || p.category === cat) &&
      (!qq || `${p.title} ${p.brand||""} ${p.pack||""} ${p.barcode||""}`.toLowerCase().includes(qq))
    );
  }, [q, cat]);

  const categories = useMemo(()=> Array.from(new Set(PRODUCTS.map(p=>p.category))).sort(), []);
  const grouped = useMemo(()=>{
    const m = new Map<string, Product[]>(); filtered.forEach(p => {
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push(p);
    });
    return Array.from(m.entries());
  }, [filtered]);

  // логика ограничения: не показываем количество на карточке, но «+» блокируем на лимите
  const qtyOf = (id:string) => cart[id] || 0;
  const canAdd = (p:Product) => qtyOf(p.id) < (p.limit ?? Infinity);
  const add = (p:Product, delta:number) => setCart(c => {
    const cur = c[p.id] || 0;
    const max = p.limit ?? Infinity;
    const next = Math.max(0, Math.min(cur + delta, max));
    return { ...c, [p.id]: next };
  });
  const setQty = (p:Product, q:number) => setCart(c => ({ ...c, [p.id]: Math.max(0, Math.min(q, p.limit ?? Infinity)) }));
  const remove = (id:string) => setCart(c => { const t={...c}; delete t[id]; return t; });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      {/* Верхний фиксированный виджет — компактнее на мобилке */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-2 space-y-2">
          <div className="text-base font-semibold">Оформление оптового заказа</div>
          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400"/>
              <input
                value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Поиск по названию, бренду, штрихкоду…"
                className="pl-9 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={cat} onChange={e=>setCat(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Все категории</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm">
                <Filter size={16}/> Фильтр
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Контент — одна колонка, компактные карточки, изображения товаров */}
      <div className="mx-auto max-w-3xl px-4 py-3">
        {grouped.map(([group, list]) => (
          <section key={group} className="mb-4">
            <h2 className="sticky top-[90px] z-10 bg-white/90 backdrop-blur px-1 py-2 text-sm font-semibold border-l-4 border-gray-900">
              {group}
            </h2>
            <div className="mt-1 grid gap-2">
              {list.map(p => {
                const qty = qtyOf(p.id);
                return (
                  <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-3 flex items-center gap-3">
                    {/* картинка — фикс. размер, чтобы список не «гулял» */}
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {p.image
                        ? <img src={p.image} alt={p.title} className="h-full w-full object-cover"/>
                        : <div className="h-full w-full grid place-items-center text-xs text-gray-400">нет фото</div>}
                    </div>

                    {/* текст — ужатый, чтобы влезало на мобильном */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                        {p.pack && <span>В упаковке: <b>{p.pack}</b></span>}
                        {p.barcode && <span className="inline-flex items-center gap-1"><Barcode size={12}/>{p.barcode}</span>}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold">{money(p.price)}</div>
                    </div>

                    {/* контролы количества: БЕЗ отображения числа на карточке */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center"
                        onClick={() => add(p, -1)}
                        disabled={qty === 0}
                        aria-label="Убавить"
                      >
                        <Minus size={16}/>
                      </button>
                      <button
                        className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center"
                        onClick={() => add(p, +1)}
                        disabled={!canAdd(p)}
                        aria-label="Добавить"
                        title={canAdd(p) ? "В корзину" : "Достигнут лимит по позиции"}
                      >
                        <Plus size={16}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Нижний фиксированный виджет (адаптирован под мобилку) */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={()=> setShowCart(v => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <ShoppingCart size={16}/> Корзина ({totalQty})
            </button>
            <div className="text-gray-700">Позиций: <b>{Object.keys(cart).length}</b> • Σ: <b>{money(totalSum)}</b></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/wholesale/account" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm">
              <UserCircle2 size={16}/> Личный кабинет
            </a>
            <button
              disabled={totalQty===0}
              onClick={()=> { window.location.href="/wholesale/checkout"; }}
              className={totalQty ? "inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm hover:opacity-90"
                                  : "inline-flex items-center gap-2 rounded-xl bg-gray-200 text-gray-500 px-4 py-2 text-sm cursor-not-allowed"}
            >
              <ArrowRight size={16}/> Оформить заказ
            </button>
          </div>
        </div>

        {/* мини‑корзина — открывается ТОЛЬКО по кнопке «Корзина» */}
        {showCart && (
          <div className="border-t border-gray-200 bg-white/95">
            <div className="mx-auto max-w-3xl px-4 py-3 grid gap-2">
              {items.map(({product:r, qty}) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1 truncate">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="text-gray-600">
                      {(r.pack ? `В упаковке: ${r.pack}` : "")} {r.brand ? `• ${r.brand}` : ""}
                      {r.barcode ? <span className="inline-flex items-center gap-1 ml-1"><Barcode size={14}/>{r.barcode}</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={()=> add(r, -1)} disabled={qty===0} className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"><Minus size={14}/></button>
                    <input
                      type="number" min={0} value={qty}
                      onChange={e=> setQty(r, Number(e.target.value||0))}
                      className="w-14 text-center rounded-lg border border-gray-200 px-2 py-1 text-xs h-8"
                    />
                    <button onClick={()=> add(r, +1)} disabled={!canAdd(r)} className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"><Plus size={14}/></button>
                  </div>
                  <div className="w-20 text-right font-semibold text-xs sm:text-sm">{money(qty*(r.price||0))}</div>
                  <button onClick={()=> remove(r.id)} className="inline-flex items-center gap-1 text-red-600 text-xs"><X size={12}/>Удалить</button>
                </div>
              ))}
              {items.length===0 && <div className="text-sm text-gray-600">Корзина пуста</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}