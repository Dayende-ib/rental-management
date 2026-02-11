import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import PaginationControls from "../components/PaginationControls";
import {
  FileText,
  Plus,
  Calendar,
  DollarSign,
  User,
  Home,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit2,
  Trash2,
} from "lucide-react";

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 12,
    total_items: 0,
    total_pages: 1,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingContractId, setEditingContractId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    property_id: "",
    tenant_id: "",
    landlord_id: "",
    start_date: "",
    end_date: "",
    duration_months: "",
    monthly_rent: "",
    deposit: "",
    deposit_status: "unpaid",
    charges: "0",
    agency_fees: "0",
    payment_day: "5",
    grace_period_days: "3",
    notice_period_days: "30",
    renewal_terms: "",
    special_conditions: "",
    status: "draft",
    termination_date: "",
    termination_reason: "",
    signed_at: "",
    signed_by_tenant: false,
    signed_by_landlord: false,
    contract_document_url: "",
  });

  const resetForm = () => {
    setFormData({
      property_id: "",
      tenant_id: "",
      landlord_id: "",
      start_date: "",
      end_date: "",
      duration_months: "",
      monthly_rent: "",
      deposit: "",
      deposit_status: "unpaid",
      charges: "0",
      agency_fees: "0",
      payment_day: "5",
      grace_period_days: "3",
      notice_period_days: "30",
      renewal_terms: "",
      special_conditions: "",
      status: "draft",
      termination_date: "",
      termination_reason: "",
      signed_at: "",
      signed_by_tenant: false,
      signed_by_landlord: false,
      contract_document_url: "",
    });
  };

  const toDateValue = (value) => (value ? value.slice(0, 10) : "");
  const toDateTimeLocal = (value) => (value ? value.slice(0, 16) : "");
  const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.error?.message) return data.error.message;
    if (data?.error) return typeof data.error === "string" ? data.error : JSON.stringify(data.error);
    if (data?.message) return data.message;
    if (err?.message) return err.message;
    return fallback;
  };

  const normalizeContractPayload = (data) => ({
    ...data,
    property_id: data.property_id || null,
    tenant_id: data.tenant_id || null,
    landlord_id: data.landlord_id || null,
    termination_date: data.termination_date || null,
    termination_reason: data.termination_reason || null,
    signed_at: data.signed_at || null,
    contract_document_url: data.contract_document_url || null,
  });
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

  const fetchProperties = async () => {
    try {
      const res = await api.get("/properties");
      setProperties(res.data || []);
    } catch (err) {
      console.error(err);
      setProperties([]);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get("/tenants");
      setTenants(res.data || []);
    } catch (err) {
      console.error(err);
      setTenants([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = normalizeContractPayload(formData);
      if (editingContractId) {
        await api.put(`/contracts/${editingContractId}`, payload);
      } else {
        await api.post("/contracts", payload);
      }
      resetForm();
      setShowForm(false);
      setEditingContractId(null);
      fetchContracts(page);
    } catch (err) {
      console.error(err);
      alert(
        getErrorMessage(
          err,
          editingContractId
            ? "Erreur lors de la modification du contrat"
            : "Erreur lors de la creation du contrat"
        )
      );
    }
  };

  useEffect(() => {
    fetchContracts(page);
  }, [page]);

  useEffect(() => {
    fetchProperties();
    fetchTenants();
  }, []);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }, [showForm]);

  const handleEdit = (contract) => {
    setFormData({
      property_id: contract.property_id || contract.properties?.id || "",
      tenant_id: contract.tenant_id || contract.tenants?.id || "",
      landlord_id: contract.landlord_id || "",
      start_date: toDateValue(contract.start_date),
      end_date: toDateValue(contract.end_date),
      duration_months: contract.duration_months ?? "",
      monthly_rent: contract.monthly_rent ?? "",
      deposit: contract.deposit ?? "",
      deposit_status: contract.deposit_status || "unpaid",
      charges: contract.charges ?? "0",
      agency_fees: contract.agency_fees ?? "0",
      payment_day: contract.payment_day ?? "5",
      grace_period_days: contract.grace_period_days ?? "3",
      notice_period_days: contract.notice_period_days ?? "30",
      renewal_terms: contract.renewal_terms || "",
      special_conditions: contract.special_conditions || "",
      status: contract.status || "draft",
      termination_date: toDateValue(contract.termination_date),
      termination_reason: contract.termination_reason || "",
      signed_at: toDateTimeLocal(contract.signed_at),
      signed_by_tenant: Boolean(contract.signed_by_tenant),
      signed_by_landlord: Boolean(contract.signed_by_landlord),
      contract_document_url: contract.contract_document_url || "",
    });
    setEditingContractId(contract.id);
    setShowForm(true);
  };

  const handleDelete = async (contractId) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce contrat ? Cette action est irreversible."
    );
    if (!confirmed) return;
    try {
      await api.delete(`/contracts/${contractId}`);
      const nextPage = contracts.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      fetchContracts(nextPage);
    } catch (err) {
      console.error(err);
      alert(
        getErrorMessage(
          err,
          "Erreur lors de la suppression du contrat"
        )
      );
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.properties?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.monthly_rent?.toString().includes(searchTerm);
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
      active: "bg-green-100 text-green-800 border-green-200",
      terminated: "bg-red-100 text-red-800 border-red-200",
      expired: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels = {
      draft: "Brouillon",
      active: "Actif",
      terminated: "Resilie",
      expired: "Expire",
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDepositStatusBadge = (depositStatus) => {
    const styles = {
      paid: "bg-green-100 text-green-800",
      partial: "bg-yellow-100 text-yellow-800",
      unpaid: "bg-red-100 text-red-800",
      returned: "bg-blue-100 text-blue-800",
      deducted: "bg-orange-100 text-orange-800",
    };
    const labels = {
      paid: "Payee",
      partial: "Partielle",
      unpaid: "Non payee",
      returned: "Retournee",
      deducted: "Deduite",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[depositStatus] || styles.unpaid}`}>
        {labels[depositStatus] || depositStatus}
      </span>
    );
  };

  const ContractCard = ({ contract }) => (
    <div className="overflow-hidden transition-all duration-300 bg-white border border-gray-100 shadow-md group rounded-3xl hover:shadow-xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1C9B7E] transition-colors">
                {contract.properties?.title || "Propriete"}
              </h3>
              <p className="text-sm text-gray-500">Contrat #{contract.id?.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(contract.status)}
            <button
              type="button"
              onClick={() => handleEdit(contract)}
              className="p-2 text-gray-500 transition-colors rounded-xl hover:text-[#1C9B7E] hover:bg-[#1C9B7E] hover:bg-opacity-10"
              aria-label="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(contract.id)}
              className="p-2 text-gray-500 transition-colors rounded-xl hover:text-red-600 hover:bg-red-50"
              aria-label="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tenant Info */}
        <div className="p-3 mb-4 rounded-xl bg-gray-50">
          <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
            <User className="w-4 h-4" />
            Locataire
          </div>
          <p className="font-semibold text-gray-900">{contract.tenants?.full_name || "Non assigne"}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-4 h-4" />
              Date de debut
            </div>
            <p className="font-semibold text-gray-900">
              {new Date(contract.start_date).toLocaleDateString("fr-FR")}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-4 h-4" />
              Date de fin
            </div>
            <p className="font-semibold text-gray-900">
              {contract.end_date
                ? new Date(contract.end_date).toLocaleDateString("fr-FR")
                : "Indeterminee"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-4 h-4" />
              Duree
            </div>
            <p className="font-semibold text-gray-900">
              {contract.duration_months ? `${contract.duration_months} mois` : "N/A"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-4 h-4" />
              Jour de paiement
            </div>
            <p className="font-semibold text-gray-900">
              {contract.payment_day || 5} du mois
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <DollarSign className="w-4 h-4" />
              Loyer mensuel
            </div>
            <p className="text-lg font-bold text-[#1C9B7E]">
              {contract.monthly_rent?.toLocaleString()} FCFA
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <DollarSign className="w-4 h-4" />
              Charges
            </div>
            <p className="font-semibold text-gray-900">
              {contract.charges?.toLocaleString() || "0"} FCFA
            </p>
          </div>

          <div className="col-span-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <DollarSign className="w-4 h-4" />
              Caution
            </div>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">
                {contract.deposit?.toLocaleString() || "0"} FCFA
              </p>
              {getDepositStatusBadge(contract.deposit_status)}
            </div>
          </div>

          {contract.signed_by_tenant && contract.signed_by_landlord && (
            <div className="col-span-2 p-3 border border-green-200 rounded-xl bg-green-50">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle className="w-4 h-4" />
                Contrat signe par toutes les parties
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-500">Gerez les contrats de location</p>
        </div>

        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setEditingContractId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1C9B7E] to-[#17866C] text-white rounded-2xl hover:shadow-lg transition-all duration-300 font-medium"
          >
            <Plus size={20} strokeWidth={2} />
            <span>Nouveau contrat</span>
          </button>
        )}
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total des contrats</p>
              <p className="text-3xl font-bold text-gray-900">{meta.total_items}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-2xl">
              <FileText className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="relative">
            <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] transition-all outline-none"
            />
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="relative">
            <Filter className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] transition-all outline-none appearance-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="active">Actif</option>
              <option value="terminated">Resilie</option>
              <option value="expired">Expire</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Contract Form */}
      {showForm && (
        <div ref={formRef} className="p-6 bg-white border border-gray-200 shadow-lg rounded-3xl">
          <h3 className="mb-6 text-xl font-bold text-gray-900">
            {editingContractId ? "Modifier le contrat" : "Nouveau contrat"}
          </h3>

          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
              {/* Propriete */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Home size={16} />
                  Propriete *
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.property_id}
                  onChange={(e) =>
                    setFormData({ ...formData, property_id: e.target.value })
                  }
                >
                  <option value="">Selectionner une propriete</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Locataire */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User size={16} />
                  Locataire *
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.tenant_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tenant_id: e.target.value })
                  }
                >
                  <option value="">Selectionner un locataire</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date de debut */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date de debut *</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              {/* Date de fin */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date de fin</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>

              {/* Duree en mois */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Duree (mois)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="12"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.duration_months}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_months: e.target.value })
                  }
                />
              </div>

              {/* Loyer mensuel */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Loyer mensuel (FCFA) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  placeholder="150000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.monthly_rent}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_rent: e.target.value })
                  }
                />
              </div>

              {/* Caution */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Caution (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="300000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.deposit}
                  onChange={(e) =>
                    setFormData({ ...formData, deposit: e.target.value })
                  }
                />
              </div>

              {/* Statut de la caution */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Statut de la caution</label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.deposit_status}
                  onChange={(e) =>
                    setFormData({ ...formData, deposit_status: e.target.value })
                  }
                >
                  <option value="unpaid">Non payee</option>
                  <option value="partial">Partielle</option>
                  <option value="paid">Payee</option>
                  <option value="returned">Retournee</option>
                  <option value="deducted">Deduite</option>
                </select>
              </div>

              {/* Charges */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Charges (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.charges}
                  onChange={(e) =>
                    setFormData({ ...formData, charges: e.target.value })
                  }
                />
              </div>

              {/* Frais d'agence */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Frais d'agence (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.agency_fees}
                  onChange={(e) =>
                    setFormData({ ...formData, agency_fees: e.target.value })
                  }
                />
              </div>

              {/* Jour de paiement */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Jour de paiement (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="5"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.payment_day}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_day: e.target.value })
                  }
                />
              </div>

              {/* Delai de grace */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Delai de grace (jours)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="3"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.grace_period_days}
                  onChange={(e) =>
                    setFormData({ ...formData, grace_period_days: e.target.value })
                  }
                />
              </div>

              {/* Preavis */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Preavis (jours)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="30"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.notice_period_days}
                  onChange={(e) =>
                    setFormData({ ...formData, notice_period_days: e.target.value })
                  }
                />
              </div>

              {/* Statut */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Statut</label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="draft">Brouillon</option>
                  <option value="active">Actif</option>
                  <option value="terminated">Resilie</option>
                  <option value="expired">Expire</option>
                </select>
              </div>

              {/* URL du document */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">URL du document du contrat</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.contract_document_url}
                  onChange={(e) =>
                    setFormData({ ...formData, contract_document_url: e.target.value })
                  }
                />
              </div>

              {/* Conditions de renouvellement */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Conditions de renouvellement</label>
                <textarea
                  rows="2"
                  placeholder="Conditions pour le renouvellement du contrat..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none resize-none"
                  value={formData.renewal_terms}
                  onChange={(e) =>
                    setFormData({ ...formData, renewal_terms: e.target.value })
                  }
                />
              </div>

              {/* Conditions speciales */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Conditions speciales</label>
                <textarea
                  rows="3"
                  placeholder="Toute condition speciale pour ce contrat..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none resize-none"
                  value={formData.special_conditions}
                  onChange={(e) =>
                    setFormData({ ...formData, special_conditions: e.target.value })
                  }
                />
              </div>

              {/* Checkboxes pour signatures */}
              <div className="space-y-3 md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.signed_by_tenant}
                    onChange={(e) =>
                      setFormData({ ...formData, signed_by_tenant: e.target.checked })
                    }
                    className="w-5 h-5 text-[#1C9B7E] border-gray-300 rounded focus:ring-[#1C9B7E]"
                  />
                  <span className="text-sm font-medium text-gray-700">Signe par le locataire</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.signed_by_landlord}
                    onChange={(e) =>
                      setFormData({ ...formData, signed_by_landlord: e.target.checked })
                    }
                    className="w-5 h-5 text-[#1C9B7E] border-gray-300 rounded focus:ring-[#1C9B7E]"
                  />
                  <span className="text-sm font-medium text-gray-700">Signe par le proprietaire</span>
                </label>
              </div>

              {/* Date de signature (auto-remplie si les deux parties ont signe) */}
              {formData.signed_by_tenant && formData.signed_by_landlord && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Date de signature</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                    value={formData.signed_at}
                    onChange={(e) =>
                      setFormData({ ...formData, signed_at: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Champs de resiliation (affiches uniquement si statut = terminated) */}
              {formData.status === "terminated" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date de resiliation</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                      value={formData.termination_date}
                      onChange={(e) =>
                        setFormData({ ...formData, termination_date: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Raison de la resiliation</label>
                    <input
                      type="text"
                      placeholder="Ex: Fin de contrat, Non-paiement..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                      value={formData.termination_reason}
                      onChange={(e) =>
                        setFormData({ ...formData, termination_reason: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingContractId(null);
                  resetForm();
                }}
                className="px-6 py-3 font-medium text-gray-700 transition-colors border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-[#1C9B7E] to-[#17866C] text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                {editingContractId ? "Mettre a jour" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contracts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 shadow-md rounded-3xl">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Aucun contrat trouve</h3>
          <p className="text-gray-500">
            {searchTerm ? "Essayez d'ajuster votre recherche" : "Commencez par creer un nouveau contrat"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
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






