import React, { useEffect, useState } from "react";
import { Home, Users, CreditCard, TrendingUp, ArrowUpRight, Activity, AlertTriangle } from "lucide-react";
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
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    properties: 0,
    tenants: 0,
    payments: 0,
    revenue: 0,
    revenueCollectedMonth: 0,
    revenueTheoreticalMonth: 0,
  });
  const [role, setRole] = useState("");
  const [ownerSummary, setOwnerSummary] = useState([]);
  const [alerts, setAlerts] = useState({
    overdue: 0,
    maintenance: 0,
  });
  const [paymentTrend, setPaymentTrend] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [paymentValidationBreakdown, setPaymentValidationBreakdown] = useState([]);
  const [propertyTypeBreakdown, setPropertyTypeBreakdown] = useState([]);
  const [propertyStatusBreakdown, setPropertyStatusBreakdown] = useState([]);
  const [contractStatusBreakdown, setContractStatusBreakdown] = useState([]);
  const [maintenanceBreakdown, setMaintenanceBreakdown] = useState([]);
  const [maintenanceTrend, setMaintenanceTrend] = useState([]);
  const [topRentProperties, setTopRentProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const [occupancyRate, setOccupancyRate] = useState(0);

  useRealtimeRefresh(() => {
    setRefreshTick((v) => v + 1);
  }, ["properties", "tenants", "payments", "contracts", "maintenance", "users", "notifications"]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const fetchAllPayments = async () => {
          const limit = 200;
          let page = 1;
          let totalPages = 1;
          const all = [];

          while (page <= totalPages) {
            const { items, meta } = await api.getList("/payments", {
              params: { page, limit },
            });
            all.push(...(items || []));
            totalPages = Number(meta?.total_pages || 1);
            page += 1;
          }

          return all;
        };

        const toMoney = (value) => {
          if (typeof value === "number") return Number.isFinite(value) ? value : 0;
          if (typeof value === "string") {
            const normalized = value.replace(/\s/g, "").replace(",", ".");
            const n = Number(normalized);
            return Number.isFinite(n) ? n : 0;
          }
          return 0;
        };

        const results = await Promise.allSettled([
          api.get("/auth/profile"),
          api.get("/properties"),
          api.get("/tenants"),
          api.get("/maintenance"),
          api.get("/contracts"),
        ]);

        const profileRes = results[0].status === "fulfilled" ? results[0].value : null;
        const propertiesRes = results[1].status === "fulfilled" ? results[1].value : null;
        const tenantsRes = results[2].status === "fulfilled" ? results[2].value : null;
        const maintenanceRes = results[3].status === "fulfilled" ? results[3].value : null;
        const contractsRes = results[4].status === "fulfilled" ? results[4].value : null;

        const toItems = (payload) => {
          if (Array.isArray(payload)) return payload;
          if (payload && Array.isArray(payload.data)) return payload.data;
          if (payload && Array.isArray(payload.items)) return payload.items;
          return [];
        };

        const currentRole = profileRes?.data?.role || "";
        setRole(currentRole);

        const properties = toItems(propertiesRes?.data);
        const tenants = toItems(tenantsRes?.data);
        const payments = await fetchAllPayments();
        const maintenance = toItems(maintenanceRes?.data);
        const contracts = toItems(contractsRes?.data);

        // Calcul de l'occupation
        const rentedCount = properties.filter(p => p.status === 'rented').length;
        setOccupancyRate(properties.length > 0 ? (rentedCount / properties.length) * 100 : 0);

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

        const revenueCollectedMonth = payments
          .filter((p) => p.status === "paid" || p.validation_status === "validated")
          .reduce((sum, p) => {
            const paid = toMoney(p.amount_paid);
            const fallback = toMoney(p.amount);
            return sum + (paid > 0 ? paid : fallback);
          }, 0);

        const revenueTheoreticalMonth = contracts
          .filter((c) => String(c.status || "").toLowerCase() === "active")
          .reduce(
            (sum, c) => sum + ((Number(c.monthly_rent || 0) || 0) + (Number(c.charges || 0) || 0)),
            0
          );

        const resolvePaymentDate = (payment) => {
          const candidates = [
            payment?.payment_date,
            payment?.validated_at,
            payment?.updated_at,
            payment?.created_at,
            payment?.due_date,
          ];
          for (const raw of candidates) {
            if (!raw) continue;
            const d = new Date(raw);
            if (!Number.isNaN(d.getTime())) return d;
          }
          const monthLabel = String(payment?.month || "");
          const match = monthLabel.match(/(\d{4}-\d{2}-\d{2})/);
          if (match?.[1]) {
            const d = new Date(match[1]);
            if (!Number.isNaN(d.getTime())) return d;
          }
          return null;
        };

        payments.forEach((p) => {
          const d = resolvePaymentDate(p);
          if (!d) return;
          const key = buildMonthKey(d);
          if (!monthIndex.has(key)) return;
          const isSettled =
            String(p.status || "").toLowerCase() === "paid" ||
            String(p.validation_status || "").toLowerCase() === "validated";
          if (!isSettled) return;
          const amount = (() => {
            const paid = toMoney(p.amount_paid);
            const fallback = toMoney(p.amount);
            return paid > 0 ? paid : fallback;
          })();
          months[monthIndex.get(key)].value += amount;
        });

        const statusLabels = [
          { key: "paid", label: "Payés" },
          { key: "pending", label: "En attente" },
          { key: "partial", label: "Partiels" },
          { key: "overdue", label: "En retard" },
          { key: "cancelled", label: "Annulés" },
        ];
        const breakdown = statusLabels.map((s) => ({
          ...s,
          value: payments.filter((p) => p.status === s.key).length,
        }));

        const validationLabels = [
          { key: "validated", label: "Valides" },
          { key: "pending", label: "En attente" },
          { key: "rejected", label: "Rejetes" },
          { key: "not_submitted", label: "Non soumis" },
        ];
        const validationBreakdown = validationLabels.map((v) => ({
          ...v,
          value: payments.filter((p) => (p.validation_status || "") === v.key).length,
        }));

        const propertyStatusLabels = [
          { key: "available", label: "Disponibles" },
          { key: "rented", label: "Sous contrat" },
          { key: "maintenance", label: "Maintenance" },
          { key: "sold", label: "Vendus" },
        ];
        const propertyStatusData = propertyStatusLabels.map((s) => ({
          ...s,
          value: properties.filter((p) => (p.status || "") === s.key).length,
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
          { key: "reported", label: "Signalé" },
          { key: "pending", label: "En attente" },
          { key: "in_progress", label: "En cours" },
          { key: "completed", label: "Terminé" },
          { key: "cancelled", label: "Annulé" },
        ];
        const maintenanceData = maintenanceLabels.map((m) => ({
          ...m,
          value: maintenance.filter((r) => r.status === m.key).length,
        }));

        const contractStatusLabels = [
          { key: "active", label: "Actifs" },
          { key: "draft", label: "Brouillons" },
          { key: "terminated", label: "Resilies" },
          { key: "expired", label: "Expires" },
        ];
        const contractStatusData = contractStatusLabels.map((s) => ({
          ...s,
          value: contracts.filter((c) => (c.status || "") === s.key).length,
        }));

        const maintenanceMonths = months.map((m) => ({ ...m, value: 0 }));
        const maintenanceMonthIndex = new Map(maintenanceMonths.map((m, idx) => [m.key, idx]));
        maintenance.forEach((m) => {
          const rawDate = m.created_at || m.updated_at;
          if (!rawDate) return;
          const d = new Date(rawDate);
          if (Number.isNaN(d.getTime())) return;
          const key = buildMonthKey(d);
          if (!maintenanceMonthIndex.has(key)) return;
          maintenanceMonths[maintenanceMonthIndex.get(key)].value += 1;
        });

        const topRents = [...properties]
          .map((p) => ({
            label: p.title || p.address || "Bien",
            value: Number(p.price || 0) || 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

        setPaymentTrend(months);
        setStatusBreakdown(breakdown);
        setPaymentValidationBreakdown(validationBreakdown);
        setPropertyTypeBreakdown(typeBreakdown);
        setPropertyStatusBreakdown(propertyStatusData);
        setContractStatusBreakdown(contractStatusData);
        setMaintenanceBreakdown(maintenanceData);
        setMaintenanceTrend(maintenanceMonths);
        setTopRentProperties(topRents);

        if (currentRole === "admin") {
          let owners = {};
          try {
            const ownersRes = await api.get("/users");
            (ownersRes.data || []).forEach((u) => {
              owners[u.id] = u.full_name || "Bailleur";
            });
          } catch {
            owners = {};
          }
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
          revenue: revenueCollectedMonth,
          revenueCollectedMonth,
          revenueTheoreticalMonth,
        });
        setAlerts({
          overdue,
          maintenance: maintenanceOpen,
        });
      } catch {
        console.log("Backend indisponible ? stats  0");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [refreshTick]);

  const StatCard = ({ title, value, icon, link, gradient, subValue, delay }) => {
    const IconComponent = icon;
    return (
      <div
        onClick={() => navigate(link)}
        className="relative overflow-hidden transition-all duration-500 bg-white border border-gray-100 shadow-sm cursor-pointer group rounded-3xl hover:shadow-xl hover:-translate-y-1"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

        <div className="relative p-7">
          <div className="flex items-start justify-between mb-5">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} bg-opacity-10 shadow-inner`}>
              <IconComponent className="w-7 h-7 text-gray-800" strokeWidth={1.5} />
            </div>
            <div className="flex items-center justify-center w-8 h-8 transition-transform group-hover:rotate-45">
              <ArrowUpRight className="w-6 h-6 text-gray-300" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold tracking-[0.1em] text-gray-400 uppercase">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black tracking-tight text-gray-900 font-display">{value}</h3>
              {subValue && (
                <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                  {subValue}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1.5 transition-all duration-700 bg-gray-50 overflow-hidden">
          <div className={`h-full w-0 group-hover:w-full transition-all duration-1000 ease-out bg-gradient-to-r ${gradient}`} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-fadeIn p-2 md:p-4">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 rounded-full bg-emerald-500" />
            <span className="text-xs font-black tracking-widest text-emerald-600 uppercase">Aujourd'hui</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 md:text-5xl font-display">
            {role === "admin" ? "Console Admin" : "Espace Bailleur"}
          </h1>
          <p className="flex items-center gap-2 font-medium text-gray-400">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>
              {role === "admin"
                ? "Vue globale de toute la plateforme"
                : "Suivi en temps réel de votre patrimoine immobilier"}
            </span>
          </p>
        </div>

        {role !== "admin" && (
          <div className="flex gap-4 p-2 transition-all bg-white border border-gray-100 shadow-sm rounded-3xl">
            <div className="px-6 py-3 border-r border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Taux d'occupation</p>
              <p className="text-xl font-black text-gray-900">{occupancyRate.toFixed(1)}%</p>
            </div>
            <div className="px-6 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status Global</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-bold text-emerald-600 uppercase tracking-tighter text-nowrap">Opérationnel</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Propriétés"
            value={stats.properties}
            icon={Home}
            link="/properties"
            gradient="from-indigo-600 to-blue-500"
            subValue={`${occupancyRate.toFixed(0)}% Occupé`}
            delay={0}
          />
          <StatCard
            title="Locataires"
            value={stats.tenants}
            icon={Users}
            link="/tenants"
            gradient="from-violet-600 to-fuchsia-500"
            subValue="Actifs"
            delay={100}
          />
          <StatCard
            title="Paiements"
            value={stats.payments}
            icon={CreditCard}
            link="/payments"
            gradient="from-emerald-600 to-teal-500"
            subValue="Ce mois"
            delay={200}
          />
          <StatCard
            title="Revenu Reel Encaisse"
            value={`${stats.revenueCollectedMonth.toLocaleString()} FCFA`}
            icon={TrendingUp}
            link="/payments"
            gradient="from-orange-600 to-amber-500"
            subValue="Total paye/valide"
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

      {!loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500" />
              <h2 className="text-xl font-bold text-gray-900">Etat des biens</h2>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={propertyStatusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-lime-500" />
              <h2 className="text-xl font-bold text-gray-900">Validation paiements</h2>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={paymentValidationBreakdown}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={40}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {paymentValidationBreakdown.map((_, index) => (
                    <Cell
                      key={`validation-cell-${index}`}
                      fill={["#16A34A", "#EAB308", "#EF4444", "#64748B"][index % 4]}
                    />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-500" />
              <h2 className="text-xl font-bold text-gray-900">Contrats par statut</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={contractStatusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#A855F7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-amber-500 to-red-500" />
              <h2 className="text-xl font-bold text-gray-900">Evolution maintenance (6 mois)</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={maintenanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#F97316" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && (
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-slate-500 to-slate-700" />
            <h2 className="text-xl font-bold text-gray-900">Top loyers mensuels</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topRentProperties}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} FCFA`} />
              <Bar dataKey="value" fill="#475569" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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


