// pages/wholesale/login.js — magic code login (0000) unified with /api/auth/me
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function WholesaleLogin() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 email -> 2 code
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // если уже вошёл — в кабинет
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const j = await r.json();
        if (alive && (j?.authenticated || j?.user)) {
          const next = typeof router.query.next === "string" ? router.query.next : "/wholesale/account";
          router.replace(next);
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [router]);

  const start = async () => {
    setErr(""); setInfo(""); setLoading(true);
    try {
      const resp = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setInfo(`Код отправлен (демо-код: ${data.code})`);
      setStep(2);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setErr(""); setInfo(""); setLoading(true);
    try {
      const resp = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      const next = typeof router.query.next === "string" ? router.query.next : "/wholesale/account";
      router.push(next);
    } catch (e) {
      setErr(String(e?.message || e));
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
            <input className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button onClick={start} disabled={loading} className="w-full rounded-2xl bg-gray-900 text-white px-4 py-2 text-sm">
              {loading ? "Отправка…" : "Получить код"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 grid gap-3">
            <input className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Код из письма (демо: 0000)" value={code} onChange={(e) => setCode(e.target.value)} />
            <button onClick={verify} disabled={loading} className="w-full rounded-2xl bg-gray-900 text-white px-4 py-2 text-sm">
              {loading ? "Проверка…" : "Войти"}
            </button>
            <button onClick={() => setStep(1)} className="w-full rounded-2xl bg-white border border-gray-200 text-gray-900 px-4 py-2 text-sm">Изменить email</button>
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <Link className="underline text-gray-700" href="/wholesale/account">Перейти в кабинет</Link>
        </div>
      </div>
    </div>
  );
}
