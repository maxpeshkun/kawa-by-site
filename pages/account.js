// ... внутри компонента
const [me, setMe] = useState({ loading: true, auth: false, user: null });

useEffect(() => {
  fetch("/api/auth/me", { cache: "no-store" })
    .then(r => r.json())
    .then(j => setMe({ loading: false, ...j }))
    .catch(() => setMe({ loading: false, auth: false, user: null }));
}, []);

const logout = async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  await fetch("/api/auth/me", { cache: "no-store" });
  setMe({ loading: false, auth: false, user: null });
};

// ...в JSX:
{!me.loading && !me.auth && (/* показать ссылку Войти */)}
{!me.loading && me.auth && (
  <>
    <div className="mt-3 text-sm text-gray-700">Почта: <b>{me.user?.email}</b></div>
    {/* ... */}
  </>
)}
