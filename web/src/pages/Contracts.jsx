import { useEffect, useState } from "react";
import {
  Check,
  Eye,
  FileText,
  Filter,
  Home,
  Mail,
  Search,
  Slash,
  User,
  X,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import api from "../services/api";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 12,
    total_items: 0,
    total_pages: 1,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.error?.message) return data.error.message;
    if (typeof data?.error === "string") return data.error;
    if (data?.message) return data.message;
    if (err?.message) return err.message;
    return fallback;
  };

  const fetchContracts = async (targetPage = page) => {
    try {
      setLoading(true);
      const { items, meta: responseMeta } = await api.getList("/contracts", {
        params: { page: targetPage, limit: meta.limit },
      });
      setContracts(items || []);
      setMeta(responseMeta);
    } catch (err) {
      console.error(err);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts(page);
  }, [page]);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await api.get("/auth/profile");
        setUserRole(res.data?.role || "");
      } catch {
        setUserRole("");
      }
    };
    fetchRole();
  }, []);

  useRealtimeRefresh(() => {
    fetchContracts(page);
  }, ["contracts", "properties", "tenants"]);

  const canManageContracts = userRole === "manager";

  const handlePreview = async (contractId) => {
    try {
      const res = await api.get(`/contracts/${contractId}/signed-preview`);
      const url = res?.data?.preview_url;
      if (!url) {
        alert("Aucun PDF signe disponible pour ce contrat.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, "Impossible d'ouvrir le PDF signe"));
    }
  };

  const handleApprove = async (contract) => {
    const defaultMonths = Number(contract?.duration_months || 12);
    const input = window.prompt(
      "Nombre de mois du contrat (1 a 60):",
      String(defaultMonths)
    );
    if (input === null) return;
    const months = Number.parseInt(input, 10);
    if (!Number.isFinite(months) || months < 1 || months > 60) {
      alert("Nombre de mois invalide (1 a 60).");
      return;
    }

    try {
      await api.post(`/contracts/${contract.id}/approve`, {
        duration_months: months,
      });
      fetchContracts(page);
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, "Validation du contrat impossible"));
    }
  };

  const handleReject = async (contractId) => {
    const confirmed = window.confirm(
      "Rejeter ce contrat signe ? Cette action supprimera la demande."
    );
    if (!confirmed) return;
    try {
      await api.post(`/contracts/${contractId}/reject`, {});
      fetchContracts(page);
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, "Rejet du contrat impossible"));
    }
  };

  const handleTerminate = async (contractId) => {
    const reason = window.prompt(
      "Motif de resiliation (optionnel):",
      "Resiliation manuelle"
    );
    if (reason === null) return;
    try {
      await api.post(`/contracts/${contractId}/terminate`, {
        termination_reason: reason.trim() || "Resiliation manuelle",
      });
      fetchContracts(page);
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, "Resiliation du contrat impossible"));
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const query = searchTerm.toLowerCase();
    const title = (contract?.properties?.title || "").toLowerCase();
    const tenantName = (contract?.tenants?.full_name || "").toLowerCase();
    const tenantEmail = (contract?.tenants?.email || "").toLowerCase();
    const matchesSearch =
      !query ||
      title.includes(query) ||
      tenantName.includes(query) ||
      tenantEmail.includes(query);
    const matchesStatus =
      filterStatus === "all" || contract?.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const contractEndAlerts = contracts
    .map((contract) => {
      if (String(contract?.status || "").toLowerCase() !== "active") return null;
      const endRaw = contract?.end_date;
      if (!endRaw) return null;
      const endDate = new Date(endRaw);
      if (Number.isNaN(endDate.getTime())) return null;
      const now = new Date();
      const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 30) return null;
      return { contract, days };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
      active: "bg-green-100 text-green-800 border-green-200",
      terminated: "bg-red-100 text-red-800 border-red-200",
      expired: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels = {
      draft: "En attente",
      active: "Actif",
      terminated: "Resilie",
      expired: "Expire",
    };
    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full border ${
          styles[status] || styles.draft
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-emerald-50">
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contrats</h1>
        <p className="mt-1 text-gray-600">
          Cette vue est centree sur le PDF signe envoye par le locataire.
        </p>
      </div>

      <div className="max-w-6xl p-4 mx-auto mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute w-4 h-4 text-gray-400 left-3 top-3.5" />
            <input
              type="text"
              placeholder="Rechercher par bien, locataire ou email..."
              className="w-full py-3 pl-10 pr-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute w-4 h-4 text-gray-400 left-3 top-3.5" />
            <select
              className="w-full py-3 pl-10 pr-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">En attente</option>
              <option value="active">Actif</option>
              <option value="terminated">Resilie</option>
              <option value="expired">Expire</option>
            </select>
          </div>
        </div>
      </div>

      {contractEndAlerts.length > 0 && (
        <div className="max-w-6xl p-4 mx-auto mb-6 bg-white border border-orange-100 shadow-sm rounded-2xl">
          <h3 className="text-base font-bold text-gray-900">
            Alertes fin de contrat ({contractEndAlerts.length})
          </h3>
          <div className="mt-3 space-y-2">
            {contractEndAlerts.slice(0, 6).map((item) => (
              <div
                key={item.contract.id}
                className={`p-3 rounded-xl border ${
                  item.days < 0
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-orange-50 border-orange-200 text-orange-800"
                }`}
              >
                <p className="text-sm font-semibold">
                  {item.contract.properties?.title || "Propriete"}
                </p>
                <p className="text-xs">
                  {item.days < 0
                    ? `Contrat expire depuis ${Math.abs(item.days)} jour(s)`
                    : `Contrat se termine dans ${item.days} jour(s)`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-12 text-center bg-white border border-gray-100 shadow-sm rounded-2xl">
            <FileText className="w-14 h-14 mx-auto mb-3 text-gray-300" />
            <h3 className="mb-1 text-xl font-semibold text-gray-900">
              Aucun contrat trouve
            </h3>
            <p className="text-gray-500">
              Aucun contrat ne correspond a votre filtre.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredContracts.map((contract) => {
              const hasTenantSubmission = Boolean(
                contract.signed_by_tenant || contract.contract_document_url
              );
              const reviewableStatuses = [
                "draft",
                "pending",
                "signed",
                "requested",
                "submitted",
                "awaiting_approval",
                "under_review",
              ];
              const normalizedStatus = String(contract.status || "").toLowerCase();
              const canReview =
                reviewableStatuses.includes(normalizedStatus) && hasTenantSubmission;
              return (
                <div
                  key={contract.id}
                  className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {contract.properties?.title || "Propriete"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Contrat #{contract.id?.slice(0, 8)}
                      </p>
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>

                  <div className="p-3 mb-4 space-y-2 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Home className="w-4 h-4 text-gray-500" />
                      <span>{contract.properties?.address || "Adresse non disponible"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{contract.tenants?.full_name || "Locataire inconnu"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{contract.tenants?.email || "Email non disponible"}</span>
                    </div>
                  </div>

                  {hasTenantSubmission ? (
                    <div className="px-3 py-2 mb-4 text-sm font-medium text-blue-800 bg-blue-100 border border-blue-200 rounded-lg">
                      PDF signe recu du locataire.
                    </div>
                  ) : (
                    <div className="px-3 py-2 mb-4 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-200 rounded-lg">
                      En attente du PDF signe locataire.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreview(contract.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 transition-colors border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" />
                      Voir PDF
                    </button>

                    {canManageContracts && canReview && (
                      <button
                        type="button"
                        onClick={() => handleApprove(contract)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 transition-colors border border-green-200 rounded-lg hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" />
                        Valider
                      </button>
                    )}

                    {canManageContracts && canReview && (
                      <button
                        type="button"
                        onClick={() => handleReject(contract.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 transition-colors border border-orange-200 rounded-lg hover:bg-orange-50"
                      >
                        <X className="w-4 h-4" />
                        Rejeter
                      </button>
                    )}
                    {canManageContracts &&
                      String(contract.status || "").toLowerCase() === "active" && (
                      <button
                        type="button"
                        onClick={() => handleTerminate(contract.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 transition-colors border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        <Slash className="w-4 h-4" />
                        Resilier
                      </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <PaginationControls
            page={meta.page}
            totalPages={meta.total_pages}
            totalItems={meta.total_items}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(meta.total_pages || p, p + 1))}
          />
        </div>
      </div>
    </div>
  );
}
