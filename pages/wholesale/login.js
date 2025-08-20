// pages/wholesale/login.js
import { useEffect, useState } from "react";
import Link from "next/link";

export default function WholesaleLogin() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // уже залогинен? перекинем в кабинет
    fetch("/api/auth/me").then(r => r.json()).then(j => {
      if (j?.auth) window.location.href = "/wholesale/account";
    }).catch(()=>{});
  }, []);

  const start = async () => {
    setErr(""); setInfo(""); setLoading(true);
    try {
      const resp = await fetch("/api/auth/start", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setInfo(`Код для входа: ${data.code} (демо)`);
      setStep(2);
    } catch(e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setErr(""); setInfo(""); setLoading(true);
    try {
      const resp = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email, code })
      });
      const data = await resp.json().catch(()=> ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      window.location.href = "/wholesale/account";
    } catch(e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Вход в кабинет оптовика</h1>
        <p className="text-sm text-gray-600 mt-1">Введи email и одноразовый код (демо: 0000).</p>

        {info && <div className="mt-3 text-sm px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">{info}</div>}
        {err && <div className="mt-3 text-sm px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">{err}</div>}

        {step === 1 && (
          <div className="mt-4 grid gap-3">
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button
              onClick={start}
              disabled={loading}
              className="w-full rounded-2xl bg-gray-900 text-white px-4 py-2 text-sm"
            >
              {loading ? "Отправка…" : "Получить код"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 grid gap-3">
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="Код из письма (демо: 0000)"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            <button
              onClick={verify}
              disabled={loading}
              className="w-full rounded-2xl bg-gray-900 text-white px-4 py-2 text-sm"
            >
              {loading ? "Проверка…" : "Войти"}
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full rounded-2xl bg-white border border-gray-200 text-gray-900 px-4 py-2 text-sm"
            >
              Изменить email
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <Link className="underline text-gray-700" href="/wholesale/account">Перейти в кабинет</Link>
        </div>
      </div>
    </div>
  );
}
