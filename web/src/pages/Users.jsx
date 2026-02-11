import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import {
  UserCog,
  Plus,
  Shield,
  Mail,
  UserCircle,
  Users,
  Phone,
  RefreshCw,
  Trash2,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";

export default function UsersPage() {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 12,
    total_items: 0,
    total_pages: 1,
  });
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "manager",
  });

  const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.error?.message) return data.error.message;
    if (data?.error) return typeof data.error === "string" ? data.error : JSON.stringify(data.error);
    if (data?.message) return data.message;
    if (err?.message) return err.message;
    return fallback;
  };

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await api.get("/auth/profile");
      setProfile(res.data || null);
    } catch (err) {
      console.error(err);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchUsers = useCallback(async (targetPage = page) => {
    try {
      setLoadingUsers(true);
      setUsersError("");
      const { items, meta: responseMeta } = await api.getList("/users", {
        params: { page: targetPage, limit: meta.limit },
      });
      setUsers(items || []);
      setMeta(responseMeta);
    } catch (err) {
      console.error(err);
      setUsers([]);
      setUsersError(getErrorMessage(err, "Erreur lors du chargement des utilisateurs"));
    } finally {
      setLoadingUsers(false);
    }
  }, [meta.limit, page]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      role: "manager",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };
      await api.post("/users", payload);
      alert("Utilisateur cree avec succes.");
      resetForm();
      setShowForm(false);
      setPage(1);
      fetchUsers(1);
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, "Erreur lors de la creation de l'utilisateur"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = window.confirm(
      "Supprimer cet utilisateur ? Cette action est irreversible."
    );
    if (!confirmed) return;
    try {
      await api.delete(`/users/${userId}`);
      const nextPage = users.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      fetchUsers(nextPage);
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, "Erreur lors de la suppression de l'utilisateur"));
    }
  };

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getRoleBadge = (role) => {
    const styles = {
      admin: "bg-blue-100 text-blue-800",
      manager: "bg-purple-100 text-purple-800",
      tenant: "bg-gray-100 text-gray-700",
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${styles[role] || "bg-gray-100 text-gray-700"}`}>
        {role || "-"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Gestion utilisateurs</h1>
          <p className="text-gray-500">Creez et supprimez les comptes admin et manager</p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-2xl hover:shadow-lg transition-all duration-300 font-medium"
          >
            <Plus size={20} strokeWidth={2} />
            <span>Ajouter un utilisateur</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Profil courant</p>
              {loadingProfile ? (
                <p className="text-2xl font-bold text-gray-900">...</p>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {profile?.full_name || "Inconnu"}
                </p>
              )}
            </div>
            <div className="p-4 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-2xl">
              <UserCog className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-[#2563EB]" />
            <span>Role: {profile?.role || "inconnu"}</span>
          </div>
          {profile?.email && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-[#2563EB]" />
              <span>{profile.email}</span>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total utilisateurs</p>
                  <p className="text-3xl font-bold text-gray-900">
                {loadingUsers ? "..." : meta.total_items}
                  </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-2xl">
              <Users className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">Liste basee sur la table profiles</p>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Actions</p>
              <p className="text-lg font-semibold text-gray-900">Rafraichir la liste</p>
            </div>
            <button
              onClick={() => fetchUsers(page)}
              className="p-3 rounded-2xl bg-[#2563EB] bg-opacity-10 text-[#2563EB] hover:bg-opacity-20 transition-colors"
              title="Rafraichir"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">Cliquez pour recharger</p>
        </div>
      </div>

      {showForm && (
        <div className="p-6 bg-white border border-gray-200 shadow-lg rounded-3xl">
          <h3 className="mb-6 text-xl font-bold text-gray-900">Creer un utilisateur</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nom complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all outline-none"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@exemple.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mot de passe *</label>
                <input
                  type="password"
                  required
                  placeholder="********"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all outline-none"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Telephone</label>
                <input
                  type="tel"
                  placeholder="+226 XX XX XX XX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all outline-none"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role *</label>
                <select
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all outline-none"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-6 py-3 font-medium text-gray-700 transition-colors border border-gray-200 rounded-xl hover:bg-gray-50"
                disabled={submitting}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-70"
                disabled={submitting}
              >
                {submitting ? "En cours..." : "Creer"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Liste des utilisateurs</h3>
        </div>

        {loadingUsers ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : usersError ? (
          <div className="p-6 text-center bg-red-50 border border-red-100 rounded-2xl text-red-700">
            {usersError}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900">Aucun utilisateur trouve</h3>
            <p className="text-gray-500">Creez un compte pour demarrer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <div key={u.id} className="p-4 border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white flex items-center justify-center font-bold">
                    {getInitials(u.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name || "(Sans nom)"}</p>
                    <p className="text-xs text-gray-500 truncate">ID: {u.id}</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id)}
                      className="p-2 text-gray-500 transition-colors rounded-xl hover:text-red-600 hover:bg-red-50"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {getRoleBadge(u.role)}
                  {u.phone ? (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{u.phone}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
