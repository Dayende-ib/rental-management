import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Home,
  User,
  DollarSign,
  Calendar,
  Edit2,
} from "lucide-react";

export default function MaintenanceRequests() {
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [userRole, setUserRole] = useState("");
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    property_id: "",
    tenant_id: "",
    reported_by: "",
    assigned_to: "",
    title: "",
    description: "",
    category: "other",
    urgency: "medium",
    status: "reported",
    estimated_cost: "",
    actual_cost: "",
    scheduled_date: "",
    completion_date: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      property_id: "",
      tenant_id: "",
      reported_by: "",
      assigned_to: "",
      title: "",
      description: "",
      category: "other",
      urgency: "medium",
      status: "reported",
      estimated_cost: "",
      actual_cost: "",
      scheduled_date: "",
      completion_date: "",
      notes: "",
    });
  };

  const toDateValue = (value) => (value ? value.slice(0, 10) : "");
  const normalizeMaintenancePayload = (data) => ({
    ...data,
    property_id: data.property_id || null,
    tenant_id: data.tenant_id || null,
    reported_by: data.reported_by || null,
    assigned_to: data.assigned_to || null,
    scheduled_date: data.scheduled_date || null,
    completion_date: data.completion_date || null,
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/maintenance");
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
      setRequests([]);
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
      const payload = normalizeMaintenancePayload(formData);
      if (editingRequestId) {
        await api.put(`/maintenance/${editingRequestId}`, payload);
      } else {
        await api.post("/maintenance", payload);
      }
      resetForm();
      setShowForm(false);
      setEditingRequestId(null);
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.error ||
          (editingRequestId
            ? "Erreur lors de la modification de la demande"
            : "Erreur lors de la creation de la demande")
      );
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchProperties();
    fetchTenants();
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await api.get("/auth/profile");
        setUserRole(res.data?.role || "");
      } catch (err) {
        setUserRole("");
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }, [showForm]);

  const handleEdit = (request) => {
    setFormData({
      property_id: request.property_id || request.properties?.id || "",
      tenant_id: request.tenant_id || request.tenants?.id || "",
      reported_by: request.reported_by || "",
      assigned_to: request.assigned_to || "",
      title: request.title || "",
      description: request.description || "",
      category: request.category || "other",
      urgency: request.urgency || "medium",
      status: request.status || "reported",
      estimated_cost: request.estimated_cost ?? "",
      actual_cost: request.actual_cost ?? "",
      scheduled_date: toDateValue(request.scheduled_date),
      completion_date: toDateValue(request.completion_date),
      notes: request.notes || "",
    });
    setEditingRequestId(request.id);
    setShowForm(true);
  };

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesUrgency = filterUrgency === "all" || r.urgency === filterUrgency;
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/maintenance/${id}`, { status });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      reported: "bg-yellow-100 text-yellow-800 border-yellow-200",
      pending: "bg-orange-100 text-orange-800 border-orange-200",
      in_progress: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels = {
      reported: "Signale",
      pending: "En attente",
      in_progress: "En cours",
      completed: "Termine",
      cancelled: "Annule",
    };
    const icons = {
      reported: <AlertCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      in_progress: <Wrench className="w-3 h-3" />,
      completed: <CheckCircle2 className="w-3 h-3" />,
      cancelled: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border flex items-center gap-1 ${styles[status] || styles.reported}`}>
        {icons[status]}
        {labels[status] || status}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const styles = {
      low: "bg-gray-100 text-gray-800 border-gray-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      urgent: "bg-red-100 text-red-800 border-red-200",
    };
    const labels = {
      low: "Faible",
      medium: "Moyenne",
      high: "Elevee",
      urgent: "Urgente",
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-lg border ${styles[urgency] || styles.medium}`}>
        {labels[urgency] || urgency}
      </span>
    );
  };

  const getCategoryLabel = (category) => {
    const labels = {
      plumbing: "Plomberie",
      electrical: "Electricite",
      heating: "Chauffage",
      appliance: "Appareil",
      furniture: "Mobilier",
      structural: "Structure",
      other: "Autre",
    };
    return labels[category] || category;
  };

  const RequestCard = ({ request }) => (
    <div className="overflow-hidden transition-all duration-300 bg-white border border-gray-100 shadow-md group rounded-3xl hover:shadow-xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center flex-1 gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-xl flex items-center justify-center flex-shrink-0">
              <Wrench className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#1C9B7E] transition-colors line-clamp-1">
                {request.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(request.status)}
                {getUrgencyBadge(request.urgency)}
              </div>
            </div>
          </div>
          <div className="flex gap-2" />
        </div>

        {/* Property & Category */}
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Home className="w-4 h-4 text-[#1C9B7E]" />
            <span className="text-gray-600">
              {request.properties?.title || "Propriete"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="w-4 h-4 text-[#1C9B7E]" />
            <span className="text-gray-600">
              {getCategoryLabel(request.category)}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 text-sm text-gray-600 line-clamp-3">
          {request.description}
        </p>

        {/* Costs */}
        {(request.estimated_cost || request.actual_cost) && (
          <div className="p-3 mb-4 rounded-xl bg-gray-50">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {request.estimated_cost && (
                <div>
                  <p className="mb-1 text-gray-500">Cout estime</p>
                  <p className="font-semibold text-gray-900">
                    {request.estimated_cost?.toLocaleString()} FCFA
                  </p>
                </div>
              )}
              {request.actual_cost && (
                <div>
                  <p className="mb-1 text-gray-500">Cout reel</p>
                  <p className="font-semibold text-[#1C9B7E]">
                    {request.actual_cost?.toLocaleString()} FCFA
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="pt-4 space-y-1 text-xs text-gray-500 border-t border-gray-100">
          <div className="flex justify-between">
            <span>Cree le:</span>
            <span className="font-medium text-gray-700">
              {new Date(request.created_at).toLocaleDateString("fr-FR")}
            </span>
          </div>
          {request.scheduled_date && (
            <div className="flex justify-between">
              <span>Planifie le:</span>
              <span className="font-medium text-gray-700">
                {new Date(request.scheduled_date).toLocaleDateString("fr-FR")}
              </span>
            </div>
          )}
          {request.completion_date && (
            <div className="flex justify-between">
              <span>Termine le:</span>
              <span className="font-medium text-green-700">
                {new Date(request.completion_date).toLocaleDateString("fr-FR")}
              </span>
            </div>
          )}
        </div>

        {/* Quick Status Actions */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          {["pending", "in_progress", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateStatus(request.id, s)}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              {s === "pending" && "En attente"}
              {s === "in_progress" && "En cours"}
              {s === "completed" && "Termine"}
              {s === "cancelled" && "Annule"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500">Gerez les demandes de maintenance</p>
        </div>

        {null}
      </div>

      {null}

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total des demandes</p>
              <p className="text-3xl font-bold text-gray-900">{requests.length}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-2xl">
              <Wrench className="w-8 h-8 text-white" strokeWidth={1.5} />
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
              <option value="reported">Signale</option>
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Termine</option>
              <option value="cancelled">Annule</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="relative">
            <AlertCircle className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] transition-all outline-none appearance-none"
            >
              <option value="all">Toutes les urgences</option>
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Elevee</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Request Form */}
      {null}

      {/* Requests Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 shadow-md rounded-3xl">
          <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Aucune demande trouvee</h3>
          <p className="text-gray-500">
            {searchTerm ? "Essayez d'ajuster votre recherche" : "Aucune demande de maintenance pour le moment"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}



