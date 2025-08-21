// pages/wholesale/checkout.js
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, Barcode } from "lucide-react";
import { getJSON, setJSON } from "@/lib/safeStorage";

const STORAGE_KEY = "kawa.cart.v1";
const money = (n) => Number(n||0).toLocaleString("ru-RU",{minimumFractionDigits:2, maximumFractionDigits:2});

export default function CheckoutPage() {
  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, []));
  useEffect(()=> setJSON(STORAGE_KEY, cart), [cart]);

  const totalQty = useMemo(()=> cart.reduce((s,r)=> s + (Number(r.qty)||0), 0), [cart]);
  const totalSum = useMemo(()=> cart.reduce((s,r)=> s + (Number(r.qty)||0)*(Number(r.price)||0), 0), [cart]);

  const setQty = (id, q) => setCart(prev => {
    const i = prev.findIndex(r=>r.id===id); if (i<0) return prev;
    const row = {...prev[i]}; const qty = Math.max(0, Number(q||0));
    const next = [...prev]; if (qty===0) next.splice(i,1); else next[i]={...row, qty};
    return next;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="flex items-center justify-between">
          <a href="/wholesale/order" className="inline-flex items-center gap-2 text-sm text-gray-700">
            <ArrowLeft size={16}/> Назад к каталогу
          </a>
          <div className="text-base md:text-lg font-semibold">Оформление заказа</div>
          <div className="w-24" />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
          {cart.length === 0 && <div className="text-sm text-gray-600">Корзина пуста. Добавьте товары в каталоге.</div>}

          {cart.map((r)=>(
            <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-gray-600">
                  {r.pack_qty ? <>В упаковке: <b>{r.pack_qty} шт</b> • </> : null}
                  {r.brand ? <>{r.brand} • </> : null}
                  {r.barcode && <span className="inline-flex items-center gap-1"><Barcode size={14}/>{r.barcode}</span>}
                </div>
              </div>
              <div className="w-24 text-right text-sm">{money(r.price)}</div>
              <div className="flex items-center gap-2">
                <button onClick={()=>setQty(r.id, Number(r.qty||0)-1)} disabled={(Number(r.qty||0))===0} className="h-8 w-8 rounded-lg border border-gray-200">−</button>
                <input type="number" min={0} value={Number(r.qty||0)} onChange={e=>setQty(r.id, e.target.value)} className="w-16 text-center rounded-lg border border-gray-200 px-2 py-1 text-sm h-8"/>
                <button onClick={()=>setQty(r.id, Number(r.qty||0)+1)} className="h-8 w-8 rounded-lg border border-gray-200">+</button>
              </div>
              <div className="w-28 text-right font-semibold">{money((Number(r.qty||0)*Number(r.price||0)))}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 grid gap-3">
          <div className="flex items-center justify-between text-sm">
            <div>Позиций: <b>{cart.length}</b></div>
            <div>Всего шт: <b>{totalQty}</b></div>
            <div>Итого: <b>{money(totalSum)}</b></div>
          </div>

          {/* Заглушка формы данных покупателя */}
          <div className="grid md:grid-cols-2 gap-3">
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Компания*" />
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Email*" />
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Телефон*" />
            <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Комментарий к заказу" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <a href="/wholesale/order" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm">
              <ArrowLeft size={16}/> Вернуться в каталог
            </a>
            <button
              disabled={cart.length===0}
              onClick={()=> alert("Заявка отправлена (заглушка). Тут вызов /api/orders или /api/cart-submit")}
              className={cart.length ? "inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm hover:opacity-90"
                                     : "inline-flex items-center gap-2 rounded-xl bg-gray-200 text-gray-500 px-4 py-2 text-sm cursor-not-allowed"}
            >
              Отправить заказ <ArrowRight size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}