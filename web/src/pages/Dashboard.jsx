import React, { useEffect, useState } from "react";
import { Home, Users, CreditCard, TrendingUp, Plus, ArrowUpRight, Activity, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    properties: 0,
    tenants: 0,
    payments: 0,
    revenue: 0,
  });
  const [role, setRole] = useState("");
  const [ownerSummary, setOwnerSummary] = useState([]);
  const [alerts, setAlerts] = useState({
    overdue: 0,
    maintenance: 0,
  });
  const [paymentTrend, setPaymentTrend] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [propertyTypeBreakdown, setPropertyTypeBreakdown] = useState([]);
  const [maintenanceBreakdown, setMaintenanceBreakdown] = useState([]);
  const [ownerMap, setOwnerMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const results = await Promise.allSettled([
          api.get("/auth/profile"),
          api.get("/properties"),
          api.get("/tenants"),
          api.get("/payments"),
          api.get("/maintenance"),
        ]);

        const profileRes = results[0].status === "fulfilled" ? results[0].value : null;
        const propertiesRes = results[1].status === "fulfilled" ? results[1].value : null;
        const tenantsRes = results[2].status === "fulfilled" ? results[2].value : null;
        const paymentsRes = results[3].status === "fulfilled" ? results[3].value : null;
        const maintenanceRes = results[4].status === "fulfilled" ? results[4].value : null;

        const currentRole = profileRes?.data?.role || "";
        setRole(currentRole);

        const properties = Array.isArray(propertiesRes?.data) ? propertiesRes.data : [];
        const tenants = Array.isArray(tenantsRes?.data) ? tenantsRes.data : [];
        const payments = Array.isArray(paymentsRes?.data) ? paymentsRes.data : [];
        const maintenance = Array.isArray(maintenanceRes?.data) ? maintenanceRes.data : [];

        const revenue = payments
          .filter((p) => p.status === "paid")
          .reduce((sum, p) => sum + (Number(p.amount_paid ?? p.amount ?? 0) || 0), 0);

        const overdue = payments.filter((p) => p.status === "overdue").length;
        const maintenanceOpen = maintenance.filter((m) =>
          ["reported", "pending", "in_progress"].includes(m.status)
        ).length;

        const buildMonthKey = (date) =>
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = (date) =>
          date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");

        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i -= 1) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({
            key: buildMonthKey(d),
            label: `${monthLabel(d)} ${String(d.getFullYear()).slice(-2)}`,
            value: 0,
          });
        }
        const monthIndex = new Map(months.map((m, idx) => [m.key, idx]));

        payments.forEach((p) => {
          const rawDate = p.payment_date || p.due_date;
          if (!rawDate) return;
          const d = new Date(rawDate);
          if (Number.isNaN(d.getTime())) return;
          const key = buildMonthKey(d);
          if (!monthIndex.has(key)) return;
          if (p.status !== "paid") return;
          const amount = Number(p.amount_paid ?? p.amount ?? 0) || 0;
          months[monthIndex.get(key)].value += amount;
        });

        const statusLabels = [
          { key: "paid", label: "Payes" },
          { key: "pending", label: "En attente" },
          { key: "partial", label: "Partiels" },
          { key: "overdue", label: "En retard" },
          { key: "cancelled", label: "Annules" },
        ];
        const breakdown = statusLabels.map((s) => ({
          ...s,
          value: payments.filter((p) => p.status === s.key).length,
        }));

        const typeLabels = {
          apartment: "Appartement",
          house: "Maison",
          studio: "Studio",
          duplex: "Duplex",
          loft: "Loft",
        };
        const typeMap = new Map();
        properties.forEach((p) => {
          const key = p.type || "other";
          const label = typeLabels[key] || key;
          typeMap.set(label, (typeMap.get(label) || 0) + 1);
        });
        const typeBreakdown = Array.from(typeMap.entries()).map(([label, value]) => ({
          label,
          value,
        }));

        const maintenanceLabels = [
          { key: "reported", label: "Signale" },
          { key: "pending", label: "En attente" },
          { key: "in_progress", label: "En cours" },
          { key: "completed", label: "Termine" },
          { key: "cancelled", label: "Annule" },
        ];
        const maintenanceData = maintenanceLabels.map((m) => ({
          ...m,
          value: maintenance.filter((r) => r.status === m.key).length,
        }));

        setPaymentTrend(months);
        setStatusBreakdown(breakdown);
        setPropertyTypeBreakdown(typeBreakdown);
        setMaintenanceBreakdown(maintenanceData);

        if (currentRole === "admin") {
          let owners = {};
          try {
            const ownersRes = await api.get("/users");
            (ownersRes.data || []).forEach((u) => {
              owners[u.id] = u.full_name || "Bailleur";
            });
          } catch (err) {
            owners = {};
          }
          setOwnerMap(owners);
          const byOwner = new Map();
          properties.forEach((property) => {
            const name = owners[property.owner_id] || "Bailleur inconnu";
            const entry = byOwner.get(name) || { name, properties: 0, totalRent: 0 };
            entry.properties += 1;
            entry.totalRent += Number(property.price ?? 0) || 0;
            byOwner.set(name, entry);
          });
          const summary = Array.from(byOwner.values()).sort((a, b) => b.properties - a.properties);
          setOwnerSummary(summary);
        } else {
          setOwnerSummary([]);
        }

        setStats({
          properties: properties.length,
          tenants: tenants.length,
          payments: payments.length,
          revenue,
        });
        setAlerts({
          overdue,
          maintenance: maintenanceOpen,
        });
      } catch (err) {
        console.log("Backend indisponible ? stats  0");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, link, gradient, delay }) => (
    <div
      onClick={() => navigate(link)}
      className="relative overflow-hidden transition-all duration-500 bg-white border border-gray-100 shadow-sm cursor-pointer group rounded-2xl hover:shadow-xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10`}>
            <Icon className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400 transition-opacity opacity-0 group-hover:opacity-100" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium tracking-wide text-gray-500 uppercase">{title}</p>
          <h3 className="text-3xl font-bold tracking-tight text-gray-900">{value}</h3>
        </div>

        <div className="absolute bottom-0 left-0 w-0 h-1 transition-all duration-500 group-hover:w-full bg-gradient-to-r from-blue-500 to-purple-500" />
      </div>
    </div>
  );

  const QuickAction = ({ title, icon: Icon, onClick, color }) => (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden px-6 py-3.5 rounded-xl font-medium text-white bg-gradient-to-r ${color} hover:shadow-lg transition-all duration-300 flex items-center gap-2.5`}
    >
      <Icon size={18} strokeWidth={2} />
      <span>{title}</span>
      <div className="absolute inset-0 transition-opacity bg-white opacity-0 group-hover:opacity-10" />
    </button>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-gray-900">
            {role === "admin" ? "Tableau de bord Admin" : "Tableau de bord Bailleur"}
          </h1>
          <p className="flex items-center gap-2 text-gray-500">
            <Activity className="w-4 h-4" />
            <span>
              {role === "admin"
                ? "Vue globale de toute la plateforme"
                : "Suivi de vos biens et revenus"}
            </span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Proprits"
            value={stats.properties}
            icon={Home}
            link="/properties"
            gradient="from-blue-500 to-cyan-500"
            delay={0}
          />
          <StatCard
            title="Locataires"
            value={stats.tenants}
            icon={Users}
            link="/tenants"
            gradient="from-purple-500 to-pink-500"
            delay={100}
          />
          <StatCard
            title="Paiements"
            value={stats.payments}
            icon={CreditCard}
            link="/payments"
            gradient="from-green-500 to-emerald-500"
            delay={200}
          />
          <StatCard
            title="Revenus"
            value={`${stats.revenue.toLocaleString()} FCFA`}
            icon={TrendingUp}
            link="/payments"
            gradient="from-orange-500 to-red-500"
            delay={300}
          />
        </div>
      )}

      {role !== "admin" && !loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-gray-500">Paiements en retard</p>
                <p className="text-3xl font-bold text-red-600">{alerts.overdue}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-gray-500">Maintenance en cours</p>
                <p className="text-3xl font-bold text-amber-600">{alerts.maintenance}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && role === "admin" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
              <h2 className="text-xl font-bold text-gray-900">Revenus globaux</h2>
            </div>
            <div className="min-w-0">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={paymentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} FCFA`} />
                  <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
              <h2 className="text-xl font-bold text-gray-900">Types de biens</h2>
            </div>
            <div className="min-w-0">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={propertyTypeBreakdown}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {propertyTypeBreakdown.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"][index % 5]}
                      />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!loading && role === "admin" && (
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-rose-500 to-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Portefeuille par bailleur</h2>
          </div>
          <div className="min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ownerSummary.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="properties" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && role !== "admin" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
              <h2 className="text-xl font-bold text-gray-900">Revenus locatifs</h2>
            </div>
            <div className="min-w-0">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={paymentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} FCFA`} />
                  <Area type="monotone" dataKey="value" stroke="#10B981" fill="#A7F3D0" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
              <h2 className="text-xl font-bold text-gray-900">Paiements</h2>
            </div>
            <div className="min-w-0">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {statusBreakdown.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={["#22C55E", "#F59E0B", "#FB7185", "#EF4444", "#94A3B8"][index % 5]}
                      />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!loading && role !== "admin" && (
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-amber-500 to-red-500" />
            <h2 className="text-xl font-bold text-gray-900">Maintenance par statut</h2>
          </div>
          <div className="min-w-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={maintenanceBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {role === "admin" && !loading && (
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-cyan-500" />
            <h2 className="text-xl font-bold text-gray-900">Bailleurs & Portefeuille</h2>
          </div>
          {ownerSummary.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun bailleur trouv.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ownerSummary.slice(0, 6).map((owner) => (
                <div key={owner.name} className="p-4 border border-gray-100 rounded-xl">
                  <p className="text-sm font-semibold text-gray-900">{owner.name}</p>
                  <p className="text-xs text-gray-500">{owner.properties} proprietes</p>
                  <p className="mt-2 text-sm font-bold text-[#1C9B7E]">
                    {owner.totalRent.toLocaleString()} FCFA
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
          <h2 className="text-2xl font-bold text-gray-900">
            {role === "admin" ? "Actions rapides (Admin)" : "Actions rapides"}
          </h2>
        </div>

        <div className="flex flex-wrap gap-4">
          <QuickAction
            title="Ajouter une propriete"
            icon={Plus}
            onClick={() => navigate("/properties")}
            color="from-blue-600 to-blue-700"
          />
          <QuickAction
            title="Ajouter un locataire"
            icon={Plus}
            onClick={() => navigate("/tenants")}
            color="from-purple-600 to-purple-700"
          />
          <QuickAction
            title="Enregistrer un paiement"
            icon={Plus}
            onClick={() => navigate("/payments")}
            color="from-green-600 to-green-700"
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}


