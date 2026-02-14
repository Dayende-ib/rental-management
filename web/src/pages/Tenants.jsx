import { useEffect, useState } from "react";
import api from "../services/api";
import PaginationControls from "../components/PaginationControls";
import { Users, Search, Mail, UserCircle } from "lucide-react";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 12,
    total_items: 0,
    total_pages: 1,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTenants = async (targetPage = page) => {
    try {
      setLoading(true);
      const { items, meta: responseMeta } = await api.getList("/tenants", {
        params: { page: targetPage, limit: meta.limit },
      });
      setTenants(items || []);
      setMeta(responseMeta);
    } catch (err) {
      console.error(err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants(page);
  }, [page]);

  useRealtimeRefresh(() => {
    fetchTenants(page);
  }, ["tenants", "contracts"]);

  const filteredTenants = tenants.filter((tenant) => {
    const fullName = String(tenant.full_name || "").toLowerCase();
    const email = String(tenant.email || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || email.includes(term);
  });

  const getInitials = (name) => {
    const value = String(name || "").trim();
    if (!value) return "?";
    return value
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const TenantCard = ({ tenant }) => (
    <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C9B7E] to-[#17866C] text-white font-bold flex items-center justify-center">
          {getInitials(tenant.full_name)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">
            {tenant.full_name || "Locataire"}
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-[#1C9B7E]" />
            <span className="truncate">{tenant.email || "Email non renseigne"}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Locataires</h1>
          <p className="text-gray-500">
            Vue en lecture seule: nom et email des locataires lies a vos contrats
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total des locataires</p>
              <p className="text-3xl font-bold text-gray-900">{meta.total_items}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-2xl">
              <Users className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="relative">
            <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] transition-all outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 shadow-md rounded-3xl">
          <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Aucun locataire trouve</h3>
          <p className="text-gray-500">
            {searchTerm
              ? "Essayez d'ajuster votre recherche"
              : "Aucun locataire lie a vos contrats pour le moment"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTenants.map((tenant) => (
            <TenantCard key={tenant.id} tenant={tenant} />
          ))}
        </div>
      )}

      <PaginationControls
        page={meta.page}
        totalPages={meta.total_pages}
        totalItems={meta.total_items}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(meta.total_pages || p, p + 1))}
      />
    </div>
  );
}
