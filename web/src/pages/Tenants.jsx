import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  UserCircle,
  Briefcase,
  FileText,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
} from "lucide-react";

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    phone_secondary: "",
    emergency_contact: "",
    emergency_phone: "",
    date_of_birth: "",
    nationality: "",
    document_type: "",
    document_id: "",
    document_expiry: "",
    address: "",
    employment_status: "",
    employer: "",
    salary: "",
    guarantor_full_name: "",
    guarantor_email: "",
    guarantor_phone: "",
  });

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index) => {
    const colors = [
      "from-[#1C9B7E] to-[#17866C]",
      "from-[#3B82F6] to-[#2563EB]",
      "from-[#8B5CF6] to-[#7C3AED]",
      "from-[#EC4899] to-[#DB2777]",
      "from-[#F59E0B] to-[#D97706]",
      "from-[#10B981] to-[#059669]",
    ];
    return colors[index % colors.length];
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tenants");
      setTenants(res.data || []);
    } catch (err) {
      console.error(err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      phone_secondary: "",
      emergency_contact: "",
      emergency_phone: "",
      date_of_birth: "",
      nationality: "",
      document_type: "",
      document_id: "",
      document_expiry: "",
      address: "",
      employment_status: "",
      employer: "",
      salary: "",
      guarantor_full_name: "",
      guarantor_email: "",
      guarantor_phone: "",
    });
  };

  const normalizePayload = (data) => ({
    ...data,
    salary: data.salary === "" ? null : data.salary,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = normalizePayload(formData);
      if (editingTenantId) {
        await api.put(`/tenants/${editingTenantId}`, payload);
      } else {
        await api.post("/tenants", payload);
      }
      resetForm();
      setShowForm(false);
      setEditingTenantId(null);
      fetchTenants();
    } catch (err) {
      console.error(err);
      alert(
        getErrorMessage(
          err,
          editingTenantId
            ? "Erreur lors de la modification du locataire"
            : "Erreur lors de l'ajout du locataire"
        )
      );
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }, [showForm]);

  const filteredTenants = tenants.filter((t) =>
    t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.phone?.includes(searchTerm)
  );

  const getEmploymentBadge = (status) => {
    const styles = {
      employed: "bg-green-100 text-green-800",
      "self-employed": "bg-blue-100 text-blue-800",
      student: "bg-purple-100 text-purple-800",
      retired: "bg-gray-100 text-gray-800",
      unemployed: "bg-red-100 text-red-800",
    };
    const labels = {
      employed: "Employe",
      "self-employed": "Independant",
      student: "Etudiant",
      retired: "Retraite",
      unemployed: "Sans emploi",
    };
    return status ? (
      <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${styles[status] || "bg-gray-100 text-gray-800"}`}>
        {labels[status] || status}
      </span>
    ) : null;
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      passport: "Passeport",
      id_card: "Carte d'identite",
      residence_permit: "Permis de sejour",
    };
    return labels[type] || type;
  };
  const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.error?.message) return data.error.message;
    if (data?.error) return typeof data.error === "string" ? data.error : JSON.stringify(data.error);
    if (data?.message) return data.message;
    if (err?.message) return err.message;
    return fallback;
  };
  const handleEdit = (tenant) => {
    setFormData({
      full_name: tenant.full_name || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      phone_secondary: tenant.phone_secondary || "",
      emergency_contact: tenant.emergency_contact || "",
      emergency_phone: tenant.emergency_phone || "",
      date_of_birth: tenant.date_of_birth || "",
      nationality: tenant.nationality || "",
      document_type: tenant.document_type || "",
      document_id: tenant.document_id || "",
      document_expiry: tenant.document_expiry || "",
      address: tenant.address || "",
      employment_status: tenant.employment_status || "",
      employer: tenant.employer || "",
      salary: tenant.salary ?? "",
      guarantor_full_name: tenant.guarantor_full_name || "",
      guarantor_email: tenant.guarantor_email || "",
      guarantor_phone: tenant.guarantor_phone || "",
    });
    setEditingTenantId(tenant.id);
    setShowForm(true);
  };

  const handleDelete = async (tenantId) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce locataire ? Cette action est irreversible."
    );
    if (!confirmed) return;
    try {
      await api.delete(`/tenants/${tenantId}`);
      fetchTenants();
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, "Erreur lors de la suppression du locataire"));
    }
  };

  const TenantCard = ({ tenant, index }) => (
    <div className="overflow-hidden transition-all duration-300 bg-white border border-gray-100 shadow-md group rounded-3xl hover:shadow-xl">
      {/* Avatar Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center text-white text-xl font-bold shadow-md`}>
            {getInitials(tenant.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#1C9B7E] transition-colors">
              {tenant.full_name}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {tenant.employment_status && getEmploymentBadge(tenant.employment_status)}
              {tenant.nationality && (
                <span className="text-xs text-gray-500">ðYOE {tenant.nationality}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleEdit(tenant)}
              className="p-2 text-gray-500 transition-colors rounded-xl hover:text-[#1C9B7E] hover:bg-[#1C9B7E] hover:bg-opacity-10"
              aria-label="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(tenant.id)}
              className="p-2 text-gray-500 transition-colors rounded-xl hover:text-red-600 hover:bg-red-50"
              aria-label="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-6 pb-6 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 bg-[#1C9B7E] bg-opacity-20 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-[#1C9B7E]" />
          </div>
          <span className="text-gray-600 truncate">{tenant.email}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 bg-[#1C9B7E] bg-opacity-20 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-[#1C9B7E]" />
          </div>
          <span className="text-gray-600">{tenant.phone}</span>
        </div>

        {tenant.document_id && (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-[#1C9B7E] bg-opacity-20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#1C9B7E]" />
            </div>
            <div>
              <span className="text-xs text-gray-500">
                {tenant.document_type ? getDocumentTypeLabel(tenant.document_type) : "Document"}:
              </span>
              <span className="ml-1 font-medium text-gray-900">{tenant.document_id}</span>
            </div>
          </div>
        )}

        {tenant.employer && (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-[#1C9B7E] bg-opacity-20 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-[#1C9B7E]" />
            </div>
            <span className="text-gray-600 truncate">{tenant.employer}</span>
          </div>
        )}

        {tenant.salary && (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-[#1C9B7E] bg-opacity-20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#1C9B7E]" />
            </div>
            <span className="font-semibold text-gray-900">
              {tenant.salary.toLocaleString()} FCFA
            </span>
          </div>
        )}

        {tenant.emergency_contact && (
          <div className="pt-3 border-t border-gray-100">
            <p className="mb-1 text-xs text-gray-500">Contact d'urgence</p>
            <p className="text-sm font-medium text-gray-900">{tenant.emergency_contact}</p>
            {tenant.emergency_phone && (
              <p className="text-xs text-gray-600">{tenant.emergency_phone}</p>
            )}
          </div>
        )}

        {tenant.guarantor_full_name && (
          <div className="pt-3 border-t border-gray-100">
            <p className="mb-1 text-xs text-gray-500">Garant</p>
            <p className="text-sm font-medium text-gray-900">{tenant.guarantor_full_name}</p>
            {tenant.guarantor_phone && (
              <p className="text-xs text-gray-600">{tenant.guarantor_phone}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Locataires</h1>
          <p className="text-gray-500">Gerez les informations et contacts des locataires</p>
        </div>

        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setEditingTenantId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1C9B7E] to-[#17866C] text-white rounded-2xl hover:shadow-lg transition-all duration-300 font-medium"
          >
            <Plus size={20} strokeWidth={2} />
            <span>Ajouter un locataire</span>
          </button>
        )}
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total des locataires</p>
              <p className="text-3xl font-bold text-gray-900">{tenants.length}</p>
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
              placeholder="Rechercher des locataires..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] transition-all outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Add Tenant Form */}
      {showForm && (
        <div ref={formRef} className="p-6 bg-white border border-gray-200 shadow-lg rounded-3xl">
          <h3 className="mb-6 text-xl font-bold text-gray-900">
            {editingTenantId ? "Modifier le locataire" : "Ajouter un nouveau locataire"}
          </h3>
          
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
              {/* Informations personnelles */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nom complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="jean@exemple.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Telephone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+226 XX XX XX XX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Telephone secondaire</label>
                <input
                  type="tel"
                  placeholder="+226 XX XX XX XX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.phone_secondary}
                  onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date de naissance</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nationalite</label>
                <input
                  type="text"
                  placeholder="Burkinabe"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Type de document</label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                >
                  <option value="">Selectionner un type</option>
                  <option value="passport">Passeport</option>
                  <option value="id_card">Carte d'identite</option>
                  <option value="residence_permit">Permis de sejour</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Numero du document</label>
                <input
                  type="text"
                  placeholder="B1234567"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.document_id}
                  onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date d'expiration du document</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.document_expiry}
                  onChange={(e) => setFormData({ ...formData, document_expiry: e.target.value })}
                />
              </div>

              {/* Adresse */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Adresse actuelle</label>
                <input
                  type="text"
                  placeholder="123 Rue de la Paix, Ouagadougou"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* Situation professionnelle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Situation professionnelle</label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.employment_status}
                  onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                >
                  <option value="">Selectionner un statut</option>
                  <option value="employed">Employe</option>
                  <option value="self-employed">Independant</option>
                  <option value="student">Etudiant</option>
                  <option value="retired">Retraite</option>
                  <option value="unemployed">Sans emploi</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Employeur</label>
                <input
                  type="text"
                  placeholder="Nom de l'entreprise"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Salaire mensuel (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="250000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>

              {/* Contact d'urgence */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Contact d'urgence</label>
                <input
                  type="text"
                  placeholder="Nom du contact"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Telephone d'urgence</label>
                <input
                  type="tel"
                  placeholder="+226 XX XX XX XX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                />
              </div>

              {/* Informations du garant */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nom complet du garant</label>
                <input
                  type="text"
                  placeholder="Marie Dupont"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.guarantor_full_name}
                  onChange={(e) => setFormData({ ...formData, guarantor_full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email du garant</label>
                <input
                  type="email"
                  placeholder="marie@exemple.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.guarantor_email}
                  onChange={(e) => setFormData({ ...formData, guarantor_email: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Telephone du garant</label>
                <input
                  type="tel"
                  placeholder="+226 XX XX XX XX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.guarantor_phone}
                  onChange={(e) => setFormData({ ...formData, guarantor_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTenantId(null);
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
                {editingTenantId ? "Mettre a jour" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tenants Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 shadow-md rounded-3xl">
          <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Aucun locataire trouve</h3>
          <p className="text-gray-500">
            {searchTerm ? "Essayez d'ajuster votre recherche" : "Commencez par ajouter votre premier locataire"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTenants.map((tenant, index) => (
            <TenantCard key={tenant.id} tenant={tenant} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}


