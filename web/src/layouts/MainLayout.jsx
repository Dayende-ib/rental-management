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
  Bell,
} from "lucide-react";
import api from "../services/api";
import { subscribeLoading } from "../services/loadingStore";

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
          navigate("/login");
          return;
        }
        const res = await api.get("/auth/profile");
        setUser(res.data);
      } catch (error) {
        navigate("/login");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeLoading((count) => setLoadingCount(count));
    return () => unsubscribe();
  }, []);

  const theme = user.role === "admin"
    ? {
        gradient: "from-[#0F3D63] to-[#1E6AA8]",
        accent: "bg-[#0F3D63]",
        pill: "bg-[#0F3D63]/10 text-[#0F3D63]",
        hover: "hover:bg-[#0F3D63]/25",
        avatar: "bg-[#0F3D63]/30",
      }
    : {
        gradient: "from-[#1C9B7E] to-[#17866C]",
        accent: "bg-[#1C9B7E]",
        pill: "bg-[#1C9B7E]/10 text-[#1C9B7E]",
        hover: "hover:bg-[#1C9B7E]/25",
        avatar: "bg-[#1C9B7E]/30",
      };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
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
    { name: "Proprietes", path: "/properties", icon: Home, roles: ["admin", "manager"] },
    { name: "Locataires", path: "/tenants", icon: Users, roles: ["admin", "manager"] },
    { name: "Contrats", path: "/contracts", icon: FileText, roles: ["admin", "manager"] },
    { name: "Paiements", path: "/payments", icon: CreditCard, roles: ["admin", "manager"] },
    { name: "Maintenance", path: "/maintenance", icon: Wrench, roles: ["admin", "manager"] },
    { name: "Utilisateurs", path: "/users", icon: UserCog, roles: ["admin"] },
    { name: "Notifications", path: "/notifications", icon: Bell, roles: ["admin", "manager"] },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-gradient-to-br ${theme.gradient} rounded-xl`}>
                  <Building2 className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-gray-800">PropertyFlow</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Gestion</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${theme.pill}`}>
                      {user.role === "admin" ? "Admin" : "Bailleur"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 transition-colors rounded-lg hover:bg-gray-100"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 transition-colors rounded-lg hover:bg-gray-100"
              >
                <Menu size={20} className="text-gray-600" />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.name : ""}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? `${theme.accent} text-white shadow-md`
                      : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={20}
                      className={isActive ? "text-white" : "text-gray-500"}
                      strokeWidth={2}
                    />
                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                    {sidebarOpen && isActive && <ChevronRight size={16} className="ml-auto" />}
                  </>
                )}
              </NavLink>
            ))}
        </nav>

        {sidebarOpen && (
          <div className="p-3 border-t border-gray-200">
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                  {getInitials(user.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role === "admin" ? "Admin" : "Bailleur"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        {loadingCount > 0 && (
          <div className="h-1 w-full bg-transparent">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 animate-pulse" />
          </div>
        )}
        <header className={`bg-gradient-to-r ${theme.gradient} px-6 py-4 flex items-center justify-between shadow-md`}>
          <div>
            <h2 className="text-xl font-bold text-white">
              {user.role === "admin" ? "Console Admin" : "Espace Bailleur"}
            </h2>
            <p className="text-sm text-white text-opacity-80">
              {user.role === "admin"
                ? "Supervision globale de la plateforme"
                : "Gerez vos biens et vos locataires"}
            </p>
          </div>

          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center gap-3 px-3 py-2 transition-colors rounded-xl ${theme.hover}`}
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-white">{user.full_name}</p>
                <p className="text-xs text-white capitalize text-opacity-80">{user.role === "admin" ? "Admin" : "Bailleur"}</p>
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

