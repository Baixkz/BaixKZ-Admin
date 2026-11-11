import { useEffect, useState, type FormEvent } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { Activity, Check, LogOut, RefreshCw, ShieldCheck, Store, Users, X } from "lucide-react";
import { auth } from "./firebase";
import { api } from "./api";

type Overview = { users: number; stores: number; pendingStores: number; products: number; admins: number };
type StoreItem = { id: string; name: string; village: string; status: string; phone: string; whatsapp: string; owner: { firebaseUid: string; email: string | null; displayName: string | null }; _count: { products: number } };
type AdminItem = { id: string; role: string; active: boolean; user: { firebaseUid: string; email: string | null; displayName: string | null } };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ firebaseUid: "", role: "MODERATOR" });

  useEffect(() => onAuthStateChanged(auth, (next) => { setUser(next); setAuthLoading(false); }), []);

  async function load() {
    setBusy(true); setError("");
    try {
      await api("/me/sync", { method: "POST" });
      const [summary, storeResult] = await Promise.all([
        api<Overview>("/admin/overview"),
        api<{ items: StoreItem[] }>("/admin/stores")
      ]);
      setOverview(summary); setStores(storeResult.items);
      try { setAdmins(await api<AdminItem[]>("/admin/admins")); } catch { setAdmins([]); }
    } catch (e) { setError(e instanceof Error ? e.message : "Деректер жүктелмеді."); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (user) void load(); }, [user]);

  async function login() {
    setError("");
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { setError(e instanceof Error ? e.message : "Кіру сәтсіз."); }
  }
  async function setStoreStatus(id: string, status: string) {
    setError("");
    try { await api(`/admin/stores/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Өзгеріс сақталмады."); }
  }
  async function addAdmin(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await api("/admin/admins", { method: "POST", body: JSON.stringify({ firebaseUid: adminForm.firebaseUid.trim(), role: adminForm.role, permissions: [] }) }); setShowAdminForm(false); setAdminForm({ firebaseUid: "", role: "MODERATOR" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Әкімші қосылмады."); }
  }
  async function removeAdmin(id: string) {
    if (!window.confirm("Осы әкімшінің рұқсатын тоқтатасыз ба?")) return;
    try { await api(`/admin/admins/${id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Әкімші өшірілмеді."); }
  }

  if (authLoading) return <div className="center">Жүктелуде…</div>;
  if (!user) return <main className="login"><div className="login-card"><div className="brand-icon"><ShieldCheck size={30}/></div><p className="eyebrow">BAIXKZ CONTROL CENTER</p><h1>Әкімшілік панель</h1><p className="muted">Қауіпсіз кіру үшін Google аккаунтыңызды пайдаланыңыз.</p><button className="primary full" onClick={login}>Google арқылы кіру</button>{error && <p className="error">{error}</p>}</div></main>;

  return <div className="shell"><aside className="sidebar"><div className="brand"><div className="brand-icon"><ShieldCheck/></div><div><b>BaixKZ</b><small>ADMIN</small></div></div><div className="side-link active"><Activity size={18}/> Шолу</div><div className="side-link"><Store size={18}/> Дүкендер</div><div className="side-link"><Users size={18}/> Әкімшілер</div><div className="side-bottom"><span>{user.displayName || user.email}</span><button className="logout" onClick={() => signOut(auth)}><LogOut size={17}/> Шығу</button></div></aside><main className="content"><header className="topbar"><div><p className="eyebrow">БАСҚАРУ ОРТАЛЫҒЫ</p><h1>Жалпы шолу</h1></div><button className="secondary" onClick={() => void load()} disabled={busy}><RefreshCw size={16}/> Жаңарту</button></header>{error && <div className="error-box">{error}</div>}{overview && <section className="stats">{[["Қолданушылар", overview.users, Users],["Дүкендер", overview.stores, Store],["Тексерілетін дүкен", overview.pendingStores, Activity],["Тауарлар", overview.products, Store],["Әкімшілер", overview.admins, ShieldCheck]].map(([label,value,Icon]) => <article className="stat" key={String(label)}><span>{String(label)}</span><b>{Number(value).toLocaleString("kk-KZ")}</b></article>)}</section>}<section className="panel"><div className="panel-head"><div><h2>Дүкендерді басқару</h2><p className="muted">Дүкен өтінімдерін тексеру және мәртебесін өзгерту.</p></div></div><div className="table-wrap"><table><thead><tr><th>Дүкен</th><th>Ауыл</th><th>Иесі</th><th>Тауар</th><th>Мәртебе</th><th>Әрекет</th></tr></thead><tbody>{stores.map((store) => <tr key={store.id}><td><b>{store.name}</b><small>{store.phone}</small></td><td>{store.village}</td><td>{store.owner.displayName || store.owner.email || store.owner.firebaseUid}</td><td>{store._count.products}</td><td><span className={`status ${store.status.toLowerCase()}`}>{store.status}</span></td><td><div className="actions">{store.status !== "ACTIVE" && <button className="approve" title="Мақұлдау" onClick={() => void setStoreStatus(store.id, "ACTIVE")}><Check size={16}/></button>}{store.status !== "REJECTED" && <button className="reject" title="Қабылдамау" onClick={() => void setStoreStatus(store.id, "REJECTED")}><X size={16}/></button>}{store.status === "ACTIVE" && <button className="secondary small" onClick={() => void setStoreStatus(store.id, "SUSPENDED")}>Тоқтату</button>}</div></td></tr>)}{stores.length === 0 && <tr><td colSpan={6} className="empty">Дүкен жоқ.</td></tr>}</tbody></table></div></section><section className="panel"><div className="panel-head"><div><h2>Әкімшілер мен рөлдер</h2><p className="muted">Жаңа әкімші тек Super Admin арқылы қосылады.</p></div><button className="primary" onClick={() => setShowAdminForm((v) => !v)}>Әкімші қосу</button></div>{showAdminForm && <form className="admin-form" onSubmit={addAdmin}><input required minLength={10} placeholder="Firebase Authentication UID" value={adminForm.firebaseUid} onChange={(e) => setAdminForm({ ...adminForm, firebaseUid: e.target.value })}/><select value={adminForm.role} onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}><option value="ADMIN">ADMIN</option><option value="MODERATOR">MODERATOR</option></select><button className="primary">Сақтау</button></form>}<div className="admin-list">{admins.map((admin) => <div className="admin-row" key={admin.id}><div><b>{admin.user.displayName || admin.user.email || admin.user.firebaseUid}</b><small>{admin.role} · {admin.active ? "Белсенді" : "Өшірілген"}</small></div><button className="reject" onClick={() => void removeAdmin(admin.id)}>Рұқсатты тоқтату</button></div>)}{admins.length === 0 && <p className="muted">Әкімшілер тізімі бос немесе бұл аккаунтта қарау рұқсаты жоқ.</p>}</div></section><footer>BaixKZ Admin · API арқылы қорғалған басқару</footer></main></div>;
}
