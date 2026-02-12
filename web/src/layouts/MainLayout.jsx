import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  Users,
  CreditCard,
  Wrench,
  UserCog,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Building2,
  FileText,
} from "lucide-react";
import api from "../services/api";
import { subscribeLoading } from "../services/loadingStore";

const WEB_ALLOWED_ROLES = ["admin", "manager"];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [user, setUser] = useState({
    full_name: "Loading...",
    email: "",
    role: "manager",
  });
  const navigate = useNavigate();
  const profileRef = useRef();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
        const res = await api.get("/auth/profile");
        if (res.data) {
          const role = String(res.data.role || "");
          if (!WEB_ALLOWED_ROLES.includes(role)) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/", { replace: true });
            return;
          }
          setUser(prev => ({ ...prev, ...res.data }));
        }
      } catch (error) {
        console.error("Erreur profil dans MainLayout:", error);
        if (error.response?.status === 401 || !localStorage.getItem("token")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/");
        }
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = subscribeLoading((count) => setLoadingCount(count));
    return () => unsubscribe();
  }, []);

  const theme = user.role === "admin"
    ? {
      gradient: "from-[#0F172A] to-[#1E293B]", // Sleek Dark Slate
      accent: "bg-[#334155]",
      pill: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      hover: "hover:bg-white/10",
      avatar: "bg-gradient-to-br from-blue-500 to-indigo-600",
    }
    : {
      gradient: "from-[#064E3B] to-[#065F46]", // Deep Emerald
      accent: "bg-[#064E3B]",
      pill: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      hover: "hover:bg-white/10",
      avatar: "bg-gradient-to-br from-emerald-500 to-teal-600",
    };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Erreur logout:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/", { replace: true });
    }
  };

  const getInitials = (name = "") => {
    const safe = String(name || "").trim();
    if (!safe) return "?";
    return safe
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const handler = (e) => {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navItems = [
    { name: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
    { name: "Propriétés", path: "/properties", icon: Home, roles: ["admin", "manager"] },
    { name: "Locataires", path: "/tenants", icon: Users, roles: ["admin", "manager"] },
    { name: "Contrats", path: "/contracts", icon: FileText, roles: ["admin", "manager"] },
    { name: "Paiements", path: "/payments", icon: CreditCard, roles: ["admin", "manager"] },
    { name: "Maintenance", path: "/maintenance", icon: Wrench, roles: ["admin", "manager"] },
    { name: "Utilisateurs", path: "/users", icon: UserCog, roles: ["admin"] },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <aside
        className={`bg-white border-r border-slate-200 transition-all duration-500 ease-in-out flex flex-col shadow-2xl z-30 ${sidebarOpen ? "w-72" : "w-24"
          }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 bg-gradient-to-br ${theme.gradient} rounded-2xl shadow-lg shadow-emerald-900/10`}>
                  <Building2 className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tighter text-slate-900">PropriFlow</h1>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${theme.pill}`}>
                      {user.role === "admin" ? "Systems Admin" : "Premium Bailleur"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 transition-all rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-3 transition-all rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-900"
              >
                <Menu size={22} />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.name : ""}
                className={({ isActive }) =>
                  `group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 ${isActive
                    ? `bg-slate-900 text-white shadow-xl shadow-slate-200`
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={22}
                      className={isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {sidebarOpen && <span className="font-bold tracking-tight">{item.name}</span>}
                    {sidebarOpen && isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto shadow-glow" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
        </nav>

        {sidebarOpen && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${theme.avatar} rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                {getInitials(user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{user.full_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connecté</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        {loadingCount > 0 && (
          <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500 animate-[progress_2s_ease-in-out_infinite]" />
          </div>
        )}
        <header className={`bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-20`}>
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
              {user.role === "admin" ? "Executive Console" : "Gestion Immobilière"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {user.role === "admin"
                  ? "Plateforme en ligne - Maintenance globale"
                  : "Patrimoine sécurisé - Mode Gestionnaire"}
              </p>
            </div>
          </div>

          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center gap-3 px-3 py-2 transition-colors rounded-xl ${theme.hover}`}
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-700">{user.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role === "admin" ? "Admin" : "Bailleur"}</p>
              </div>
              <div className={`flex items-center justify-center w-10 h-10 font-bold text-white border border-white border-opacity-30 rounded-full backdrop-blur-sm ${theme.avatar}`}>
                {getInitials(user.full_name)}
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 z-50 mt-2 overflow-hidden bg-white border border-gray-200 shadow-xl w-72 rounded-2xl">
                <div className={`p-4 bg-gradient-to-r ${theme.gradient}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-12 h-12 font-bold text-white border border-white border-opacity-30 rounded-full backdrop-blur-sm ${theme.avatar}`}>
                      {getInitials(user.full_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{user.full_name}</p>
                      <p className="text-sm text-white text-opacity-80">{user.email}</p>
                      <p className="mt-1 text-xs text-white text-opacity-80">
                        {user.role === "admin" ? "Administrateur" : "Bailleur"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={logout}
                    className="flex items-center w-full gap-3 px-4 py-3 font-medium text-red-600 transition-colors rounded-xl hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    <span>Deconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


