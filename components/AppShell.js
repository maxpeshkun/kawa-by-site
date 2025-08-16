// components/AppShell.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coffee, MapPin, Factory, Filter, Search,
  ShoppingCart, Layers3, Store, Phone
} from "lucide-react";

// ---------- Конфиг ----------
const YA_API_KEY =
  process.env.NEXT_PUBLIC_YA_API_KEY || "c765fc15-42cc-43b2-9c84-a705a4c4f2b0";
const YA_SCRIPT_URL = `https://api-maps.yandex.ru/2.1/?apikey=${YA_API_KEY}&lang=ru_RU`;

// ---------- Error Boundary ----------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
    this._onError = null;
  }
  static getDerivedStateFromError(error) {
    return { err: error };
  }
  componentDidCatch(error, info) {}
  componentDidMount() {
    if (typeof window === "undefined") return;
    this._onError = (e) => this.setState({ err: e?.error || e?.reason || e });
    window.addEventListener("error", this._onError);
    window.addEventListener("unhandledrejection", this._onError);
  }
  componentWillUnmount() {
    if (typeof window === "undefined") return;
    if (this._onError) {
      window.removeEventListener("error", this._onError);
      window.removeEventListener("unhandledrejection", this._onError);
    }
  }
  render() {
    const { err } = this.state;
    if (err) {
      return (
        <div className="mx-auto max-w-2xl p-4 my-8 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
          <div className="font-semibold mb-2">Что-то пошло не так на странице.</div>
          <div className="text-sm opacity-80 break-words">{String(err?.message || err)}</div>
          <div className="text-xs mt-2 opacity-70">Обновите страницу. Детали — в консоли браузера.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- Константы/типы ----------
const LOC_TYPES = ["Розница", "Опт", "Шоурум"];
const CATEGORIES = ["Кофе", "Чай", "Бытовая химия"];

// ---------- Хелперы ----------
function classNames(...list) { return list.filter(Boolean).join(" "); }
function mapsLinkYandex(lat, lon) { return `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map&rtext=${lat},${lon}`; }
function mapsLinkGoogle(lat, lon) { const q = encodeURIComponent(`${lat},${lon}`); return `https://maps.google.com/?q=${q}`; }
function dataUrlFromCsv(csv) { return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; }

// Парсер CSV под формат: разделитель — ;  и запятая в числах lat/lon
function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(";").map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    const obj = {};
    headers.forEach((h, idx) => {
      let val = (cols[idx] ?? "").trim();
      if (h === "lat" || h === "lon") {
        val = Number(val.replace(",", "."));
      }
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}

// ---------- Яндекс-карта ----------
function YandexMap({ points }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const [ready, setReady] = useState(false);

  // загрузка скрипта
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.ymaps && typeof window.ymaps.ready === "function") {
      window.ymaps.ready(() => setReady(true));
      return;
    }
    const existing = document.querySelector('script[src^="https://api-maps.yandex.ru/2.1/"]');
    if (existing) {
      const onLoad = () => setReady(true);
      existing.addEventListener("load", onLoad);
      return () => existing.removeEventListener("load", onLoad);
    }
    const s = document.createElement("script");
    s.src = YA_SCRIPT_URL;
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => console.warn("Не удалось загрузить Yandex Maps API");
    document.head.appendChild(s);
  }, []);

  // инициализация карты
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const ymaps = typeof window !== "undefined" ? window.ymaps : null;
    if (!ymaps) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      requestAnimationFrame(() => setReady((r) => !r));
      return;
    }

    try {
      const center = points.length ? [points[0].lat, points[0].lon] : [53.9, 27.56];
      mapRef.current = new ymaps.Map(
        containerRef.current,
        { center, zoom: 6, controls: ["zoomControl"] },
        { suppressMapOpenBlock: true }
      );
    } catch (e) {
      console.warn("Yandex Map init failed:", e);
      return;
    }

    clustererRef.current = new ymaps.Clusterer({
      preset: "islands#invertedDarkBlueClusterIcons",
      groupByCoordinates: false,
    });
    mapRef.current.geoObjects.add(clustererRef.current);

    const fit = () => {
      try { mapRef.current?.container?.fitToViewport(); } catch {}
    };
    fit();

    const onResize = fit;
    const onOrientation = fit;
    const onPageShow = fit;

    if (typeof window !== "undefined") {
      window.addEventListener("resize", onResize);
      window.addEventListener("orientationchange", onOrientation);
      window.addEventListener("pageshow", onPageShow);
    }

    let ro = null;
    const RO = typeof window !== "undefined" ? window.ResizeObserver : null;
    if (RO && containerRef.current) {
      ro = new RO(fit);
      ro.observe(containerRef.current);
    } else {
      setTimeout(fit, 0);
    }

    return () => {
      if (ro && typeof ro.disconnect === "function") ro.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onOrientation);
        window.removeEventListener("pageshow", onPageShow);
      }
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch {}
        mapRef.current = null;
      }
    };
  }, [ready, points]);

  // обновление меток
  useEffect(() => {
    const ymaps = typeof window !== "undefined" ? window.ymaps : null;
    if (!ready || !ymaps || !clustererRef.current || !mapRef.current) return;

    try {
      clustererRef.current.removeAll();
      const geoObjects = points.map((p) =>
        new ymaps.Placemark(
          [p.lat, p.lon],
          {
            balloonContentHeader: `<b>${p.name}</b>`,
            balloonContentBody: `${p.city}, ${p.address}<br/>Часы: ${p.hours || "-"}<br/>Тел.: ${p.phone || "-"}`,
            hintContent: p.name,
          },
          {
            preset:
              p.type === "Опт"
                ? "islands#redIcon"
                : p.type === "Шоурум"
                ? "islands#violetIcon"
                : "islands#darkGreenIcon",
          }
        )
      );
      clustererRef.current.add(geoObjects);

      if (geoObjects.length > 0) {
        const bounds = ymaps.geoQuery(geoObjects).getBounds();
        if (bounds) {
          try {
            mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
          } catch {}
        }
      }
      try { mapRef.current?.container?.fitToViewport(); } catch {}
    } catch (e) {
      console.warn("Yandex Map update failed:", e);
    }
  }, [points, ready]);

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden">
      <div ref={containerRef} className="h-[420px] sm:h-[460px] w-full" />
    </div>
  );
}

// ---------- UI ----------
const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-gray-700 border-gray-200 bg-white/60">
    {children}
  </span>
);

const Card = ({ children, className }) => (
  <div className={classNames("rounded-2xl border border-gray-100 shadow-sm bg-white p-4", className)}>{children}</div>
);

const Button = ({ children, onClick, variant = "solid", className = "", type = "button" }) => {
  const base = "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition hover:opacity-90";
  const styles =
    variant === "solid"
      ? "bg-gray-900 text-white"
      : variant === "ghost"
      ? "bg-transparent text-gray-900 hover:bg-gray-100"
      : "bg-white border border-gray-200";
  return (
    <button type={type} onClick={onClick} className={classNames(base, styles, className)}>
      {children}
    </button>
  );
};

const Select = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
  >
    <option value="">{placeholder}</option>
    {options.map((o) => {
      const val = typeof o === "string" ? o : o.value;
      const label = typeof o === "string" ? o : o.label;
      return (
        <option key={val} value={val}>
          {label}
        </option>
      );
    })}
  </select>
);

// ---------- Шапка/подвал ----------
function Header({ current, navigate }) {
  const links = [
    { id: "home", label: "Главная" },
    { id: "locations", label: "Точки продаж" },
    { id: "catalog", label: "Каталог" },
    { id: "wholesale", label: "Оптовым клиентам" }, // якорь #wholesale
    { id: "about", label: "О компании" },
    { id: "contacts", label: "Контакты" },
  ];

  return (
    <div className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("home")}
            className="h-9 w-9 rounded-xl bg-gray-900 text-white grid place-items-center"
            aria-label="На главную"
          >
            <Coffee size={18} />
          </button>
          <button
            onClick={() => navigate("home")}
            className="font-semibold hover:underline cursor-pointer"
            aria-label="На главную"
          >
            kawa.by — МЭР ТРЕЙД
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => navigate(l.id)}
              className={classNames(
                "px-3 py-2 rounded-xl text-sm",
                current === l.id ? "bg-gray-900 text-white" : "hover:bg-gray-100"
              )}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="md:hidden">
          <Select
            value={current}
            onChange={navigate}
            options={links.map((l) => ({ value: l.id, label: l.label }))}
          />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-10 border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-gray-500 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>© {new Date().getFullYear()} kawa.by (ООО «МЭР ТРЕЙД»). Все права защищены.</div>
        <div className="flex items-center gap-4">
          <a className="hover:underline" href="#">Политика конфиденциальности</a>
          <a className="hover:underline" href="#">Реквизиты</a>
        </div>
      </div>
    </div>
  );
}

// ---------- Страницы ----------
function HomePage({ navigate }) {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="grid md:grid-cols-2 gap-6 items-center mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Кофе, чай и бытовая химия<br />оптом и в розницу
          </h1>
          <p className="mt-4 text-gray-600">
            Поставки европейского качества по Беларуси и СНГ. Найдите ближайшую точку или запросите оптовый прайс.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate("locations")}>
              <MapPin size={16} /> Найти точку продаж
            </Button>
            <Button variant="outline" onClick={() => navigate("wholesale")}>
              <Factory size={16} /> Запросить оптовый прайс
            </Button>
          </div>
          <div className="mt-6 flex gap-2 flex-wrap">
            <Badge><Coffee size={14} className="mr-1" /> Кофе</Badge>
            <Badge><ShoppingCart size={14} className="mr-1" /> Чай</Badge>
            <Badge><Layers3 size={14} className="mr-1" /> Бытовая химия</Badge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="aspect-video w-full rounded-3xl bg-gradient-to-br from-amber-100 via-emerald-100 to-sky-100 grid place-items-center border border-gray-100">
            <div className="text-gray-700 text-center px-6">
              <MapPin className="mx-auto mb-2" />
              <div className="font-semibold">Интерактивная карта на Яндекс.Картах</div>
              <div className="text-sm">Страница «Точки продаж» — карта с кластеризацией.</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


function LocationsPage() {
  const [locations, setLocations] = useState([]);
  useEffect(() => {
    fetch("/data/locations.csv", { cache: "no-store" })
      .then(r => r.ok ? r.text() : Promise.reject("CSV not found"))
      .then(txt => {
        const rows = parseCSV(txt);
        const mapped = rows.map(r => ({
          id: `${(r.name||"").trim()}-${(r.city||"").trim()}`.replace(/\s+/g, "-").toLowerCase(),
          name: r.name,
          type: r.type,
          city: r.city,
          address: r.address,
          lat: Number(r.lat),
          lon: Number(r.lon),
          hours: r.hours,
          phone: r.phone,
          categories: (r.categories || "").split("|").map(s => s.trim()).filter(Boolean),
          notes: r.notes
        })).filter(x => !Number.isNaN(x.lat) && !Number.isNaN(x.lon));
        setLocations(mapped);
      })
      .catch(() => setLocations([]));
  }, []);

  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [cat, setCat] = useState("");

  const cities = useMemo(() => Array.from(new Set(locations.map((l) => l.city))).filter(Boolean), [locations]);

  const filtered = useMemo(() => {
    return locations.filter(
      (l) =>
        (!q || (l.name + " " + l.address).toLowerCase().includes(q.toLowerCase())) &&
        (!city || l.city === city) &&
        (!type || l.type === type) &&
        (!cat || l.categories.includes(cat))
    );
  }, [q, city, type, cat, locations]);

  const sampleCsv = useMemo(() => {
    const header = ["name","type","city","address","lat","lon","hours","phone","categories","notes"].join(",");
    const rows = (locations.length ? locations : []).slice(0,3).map(l =>
      [l.name, l.type, l.city, l.address, l.lat, l.lon, l.hours, l.phone, (l.categories||[]).join("|"), l.notes||""].join(",")
    );
    return [header, ...rows].join("\n");
  }, [locations]);

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mt-6 grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <div className="font-semibold mb-3 flex items-center gap-2"><Filter size={16} /> Фильтры</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">Поиск</div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5" size={16} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Название/адрес"
                    className="w-full rounded-xl border border-gray-200 px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Город</div>
                <Select value={city} onChange={setCity} options={cities} placeholder="Все города" />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Тип точки</div>
                <Select value={type} onChange={setType} options={LOC_TYPES} placeholder="Любой" />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Категория товара</div>
                <Select value={cat} onChange={setCat} options={CATEGORIES} placeholder="Любая" />
              </div>
              <a className="inline-block text-sm underline" href={dataUrlFromCsv(sampleCsv)} download="locations-template.csv">
                Скачать CSV-шаблон
              </a>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2 grid gap-3">
          <YandexMap points={filtered} />
          <div className="text-sm text-gray-600">
            Найдено: <b>{filtered.length}</b>
          </div>
          <div className="grid gap-3">
            {filtered.map((l) => (
              <Card key={l.id}>
                <div className="flex items-start gap-4">
                  <div className="hidden md:block h-28 w-36 rounded-xl bg-gray-100 grid place-items-center text-gray-500 text-xs">
                    Фото фасада
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge>{l.type}</Badge>
                      {l.categories.map((c) => (
                        <Badge key={c}>{c}</Badge>
                      ))}
                    </div>
                    <div className="mt-2 font-semibold text-lg">{l.name}</div>
                    <div className="text-gray-600 text-sm">
                      {l.city}, {l.address}
                    </div>
                    <div className="text-gray-600 text-sm">Часы: {l.hours}</div>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <a
                        className="text-gray-900 hover:underline inline-flex items-center gap-1"
                        href={`tel:${(l.phone || "").replace(/[^+\d]/g, "")}`}
                      >
                        <Phone size={14} /> {l.phone}
                      </a>
                      <a
                        className="text-gray-900 hover:underline inline-flex items-center gap-1"
                        href={mapsLinkYandex(l.lat, l.lon)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MapPin size={14} /> Маршрут (Яндекс)
                      </a>
                      <a
                        className="text-gray-500 hover:underline inline-flex items-center gap-1"
                        href={mapsLinkGoogle(l.lat, l.lon)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Google
                      </a>
                    </div>
                    {l.notes && <div className="mt-2 text-xs text-gray-500">{l.notes}</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- КАТАЛОГ: тянем с /api/b2b-products ----------
function CatalogPage() {
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true); setErr(null);
      try {
        const resp = await fetch(`/api/b2b-products`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (alive) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (e) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  const cats = useMemo(() => Array.from(new Set(products.map(p => p.category))).filter(Boolean), [products]);

  const filtered = useMemo(() =>
    products.filter(p =>
      (!cat || p.category === cat) &&
      (!q || (p.title || "").toLowerCase().includes(q.toLowerCase()))
    ), [products, cat, q]);

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mt-6 grid md:grid-cols-4 gap-3">
        <div>
          <Card>
            <div className="font-semibold mb-3">Фильтры</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">Категория</div>
                <Select value={cat} onChange={setCat} options={cats} placeholder="Все" />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Поиск</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Название товара"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-3 grid gap-3">
          {loading && <Card>Загрузка каталога…</Card>}
          {err && <Card className="border-amber-300 bg-amber-50">Ошибка загрузки: {err}</Card>}

          {!loading && !err && filtered.length === 0 && (
            <Card>Ничего не найдено. Измени фильтры.</Card>
          )}

          {!loading && !err && filtered.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 rounded-xl bg-gray-100 grid place-items-center overflow-hidden">
                  {p.image ? <img src={p.image} alt={p.title} className="object-cover w-full h-full" /> : <Store />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-gray-600">
                    {(p.category || "—")} {p.brand ? ` • ${p.brand}` : ""} {p.pack ? ` • ${p.pack}` : ""}
                  </div>
                  {(p.tags?.length > 0) && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {p.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-800">
                    {p.price ? `Цена: ${p.price}` : ""}
                    {p.stock != null ? `  · Остаток: ${p.stock}` : ""}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline"><MapPin size={16} /> Где купить</Button>
                    <Button><Factory size={16} /> Запросить оптовую цену</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- ОПТ: единая заявка (прайс + регистрация) ----------
function WholesalePage() {
  const [form, setForm] = useState({
    company: "",
    inn: "",
    contact: "",
    email: "",
    phone: "",
    cities: "",
    categories: [],
    volume: "",
    website: "",
    comment: "",
    password: "",       // опционально: сразу задать пароль (можно оставить пустым)
    accept: false,      // согласие на обработку данных
    botField: ""        // honeypot для антиспама
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // {ok:true|false, msg:string}
  const toggleCat = (c) =>
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c)
        ? f.categories.filter((x) => x !== c)
        : [...f.categories, c],
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    // простая клиентская валидация
    const errs = {};
    if (!form.company.trim()) errs.company = "Укажите название компании";
    if (!form.inn.trim() || form.inn.trim().length < 6) errs.inn = "Укажите корректный УНП/ИНН";
    if (!form.contact.trim()) errs.contact = "Укажите контактное лицо";
    if (!form.phone.trim()) errs.phone = "Укажите телефон";
    if (!/.+@.+\..+/.test(form.email)) errs.email = "Укажите корректный email";
    if (!form.accept) errs.accept = "Нужно согласие на обработку данных";

    if (Object.keys(errs).length) {
      setResult({ ok: false, msg: Object.values(errs).join(" · ") });
      return;
    }

    try {
      setSubmitting(true);
      const resp = await fetch("/api/wholesale-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      setResult({ ok: true, msg: "Заявка принята. Мы свяжемся с вами и вышлем прайс." });
      // по желанию: очистить форму
      // setForm({ ...form, comment: "", password: "" });
    } catch (e) {
      setResult({ ok: false, msg: `Ошибка отправки: ${String(e.message || e)}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="mt-6">
        <Card>
          <div className="font-semibold text-lg mb-1">Оптовая заявка + запрос прайса</div>
          <div className="text-sm text-gray-600 mb-4">
            Заполните форму — мы зарегистрируем запрос и вышлем текущий прайс на email.
          </div>

          {result && (
            <div className={classNames(
              "mb-3 rounded-xl px-3 py-2 text-sm",
              result.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
            )}>
              {result.msg}
            </div>
          )}

          <form onSubmit={onSubmit} className="grid gap-3">
            <input type="text" name="website" className="hidden" value={form.botField}
                   onChange={(e)=>setForm({...form, botField:e.target.value})} />

            <div className="grid md:grid-cols-2 gap-3">
              <input
                placeholder="Компания*"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                placeholder="УНП / ИНН*"
                value={form.inn}
                onChange={(e) => setForm({ ...form, inn: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                placeholder="Контактное лицо*"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                placeholder="Email*"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                placeholder="Телефон*"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                placeholder="Города поставок"
                value={form.cities}
                onChange={(e) => setForm({ ...form, cities: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-1">Категории интереса</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCat(c)}
                    className={classNames(
                      "px-3 py-1 rounded-xl border text-sm",
                      form.categories.includes(c) ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                placeholder="Ожидаемый объём (в месяц)"
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                placeholder="Сайт компании (если есть)"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>

            <input
              placeholder="Комментарий"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />

            <div className="grid md:grid-cols-2 gap-3">
              <input
                type="password"
                placeholder="Пароль для будущего кабинета (опционально)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.accept}
                  onChange={(e) => setForm({ ...form, accept: e.target.checked })}
                />
                <span>Согласен на обработку персональных данных*</span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                <Factory size={16} />
                {submitting ? "Отправка…" : "Отправить заявку и получить прайс"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => alert("Прайс придет на email после обработки заявки")}
              >
                Скачать прайс (будет доступно после регистрации)
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="mt-6">
        <Card>
          <div className="font-semibold text-lg mb-2">О компании</div>
          <div className="text-gray-700">
            Мы поставляем кофе, чай и бытовую химию оптом и в розницу. География — Беларусь и СНГ.
            На сайте — интерактивная карта точек, каталог и форма для оптовых заявок.
          </div>
        </Card>
      </div>
    </div>
  );
}

function ContactsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="mt-6">
        <Card>
          <div className="font-semibold text-lg mb-2">Контакты</div>
          <div className="text-gray-700 grid gap-2">
            <div>Email: info@kawa.by</div>
            <div>Тел.: +375 (29) 000-00-00</div>
            <div>Юр. адрес: г. Гродно</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------- Роутер (hash-based) ----------
export default function AppShell() {
  const [route, setRoute] = useState("home");

  useEffect(() => {
    const fromHash = () => setRoute(window.location.hash.replace("#", "") || "home");
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const navigate = (to) => {
    setRoute(to);
    window.location.hash = to;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
        <Header current={route} navigate={navigate} />
        <main className="py-6">
          <AnimatePresence mode="wait">
            {route === "home" && (
              <motion.div key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <HomePage navigate={navigate} />
              </motion.div>
            )}
            {route === "locations" && (
              <motion.div key="locations" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <LocationsPage />
              </motion.div>
            )}
            {route === "catalog" && (
              <motion.div key="catalog" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <CatalogPage />
              </motion.div>
            )}
            {route === "wholesale" && (
              <motion.div key="wholesale" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <WholesalePage />
              </motion.div>
            )}
            {route === "about" && (
              <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <AboutPage />
              </motion.div>
            )}
            {route === "contacts" && (
              <motion.div key="contacts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <ContactsPage />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
