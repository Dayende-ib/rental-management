import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import {
  Home,
  Plus,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Square,
  Search,
  Filter,
  Building,
  Layers,
  Calendar,
  Upload,
  X,
  Image as ImageIcon,
  Edit2,
  Trash2,
} from "lucide-react";

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [ownerMap, setOwnerMap] = useState({});
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    postal_code: "",
    country: "France",
    latitude: "",
    longitude: "",
    surface: "",
    rooms: "",
    bedrooms: "",
    bathrooms: "",
    floor: "",
    has_elevator: false,
    photos: [],
    price: "",
    charges: "0",
    type: "apartment",
    status: "available",
    energy_rating: "",
    year_built: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      address: "",
      city: "",
      postal_code: "",
      country: "France",
      latitude: "",
      longitude: "",
      surface: "",
      rooms: "",
      bedrooms: "",
      bathrooms: "",
      floor: "",
      has_elevator: false,
      photos: [],
      price: "",
      charges: "0",
      type: "apartment",
      status: "available",
      energy_rating: "",
      year_built: "",
    });
    setPhotoPreviews([]);
  };

  const normalizePropertyPayload = (data) => {
    const toNumber = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    };

    return {
      ...data,
      latitude: toNumber(data.latitude),
      longitude: toNumber(data.longitude),
      surface: toNumber(data.surface),
      rooms: toNumber(data.rooms),
      bedrooms: toNumber(data.bedrooms),
      bathrooms: toNumber(data.bathrooms),
      floor: toNumber(data.floor),
      price: toNumber(data.price),
      charges: toNumber(data.charges),
      year_built: toNumber(data.year_built),
      energy_rating: data.energy_rating === "" ? null : data.energy_rating,
    };
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

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get("/properties");
      setProperties(res.data || []);
    } catch (err) {
      console.error(err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);

    try {
      const previewUrls = files.map((file) => URL.createObjectURL(file));
      setFormData({
        ...formData,
        photos: [...formData.photos, ...files]
      });
      setPhotoPreviews((prev) => [...prev, ...previewUrls]);
    } catch (err) {
      console.error(err);
      alert(
        getErrorMessage(
          err,
          "Erreur lors de l'upload des images"
        )
      );
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
    setPhotoPreviews(newPreviews);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = normalizePropertyPayload(formData);
      delete payload.photos;

      let propertyId = editingPropertyId;
      if (editingPropertyId) {
        await api.put(`/properties/${editingPropertyId}`, payload);
      } else {
        const created = await api.post("/properties", payload);
        propertyId = created.data?.id;
      }

      if (propertyId && formData.photos.length > 0) {
        setUploadingImages(true);
        for (const file of formData.photos) {
          const uploadData = new FormData();
          uploadData.append("file", file);
          await api.post(`/properties/${propertyId}/photos`, uploadData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      resetForm();
      setShowForm(false);
      setEditingPropertyId(null);
      fetchProperties();
    } catch (err) {
      console.error(err);
      alert(
        getErrorMessage(
          err,
          editingPropertyId
            ? "Erreur lors de la modification de la propriete"
            : "Erreur lors de la cration de la propriete"
        )
      );
    } finally {
      setUploadingImages(false);
    }
  };

  useEffect(() => {
    fetchProperties();
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
    const fetchOwners = async () => {
      if (userRole !== "admin") {
        setOwnerMap({});
        return;
      }
      try {
        const res = await api.get("/users");
        const map = {};
        (res.data || []).forEach((u) => {
          map[u.id] = u.full_name || "Bailleur";
        });
        setOwnerMap(map);
      } catch (err) {
        console.error(err);
        setOwnerMap({});
      }
    };
    fetchOwners();
  }, [userRole]);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }, [showForm]);

  const handleEdit = (property) => {
    setFormData({
      title: property.title || "",
      description: property.description || "",
      address: property.address || "",
      city: property.city || "",
      postal_code: property.postal_code || "",
      country: property.country || "France",
      latitude: property.latitude || "",
      longitude: property.longitude || "",
      surface: property.surface ?? property.surface_area ?? "",
      rooms: property.rooms ?? "",
      bedrooms: property.bedrooms ?? "",
      bathrooms: property.bathrooms ?? "",
      floor: property.floor ?? "",
      has_elevator: Boolean(property.has_elevator),
      photos: [],
      price: property.price ?? "",
      charges: property.charges ?? "0",
      type: property.type || "apartment",
      status: property.status || "available",
      energy_rating: property.energy_rating || "",
      year_built: property.year_built || "",
    });
    setPhotoPreviews(property.photos || []);
    setEditingPropertyId(property.id);
    setShowForm(true);
  };

  const handleDelete = async (propertyId) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette propriete ? Cette action est irrversible."
    );
    if (!confirmed) return;
    try {
      await api.delete(`/properties/${propertyId}`);
      fetchProperties();
    } catch (err) {
      console.error(err);
      alert(
        getErrorMessage(
          err,
          "Erreur lors de la suppression de la propriete"
        )
      );
    }
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status) => {
    const styles = {
      available: "bg-green-100 text-green-800 border-green-200",
      rented: "bg-blue-100 text-blue-800 border-blue-200",
      maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
      sold: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels = {
      available: "Disponible",
      rented: "Lou",
      maintenance: "Maintenance",
      sold: "Vendu",
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.available}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    const types = {
      apartment: "Appartement",
      house: "Maison",
      studio: "Studio",
      duplex: "Duplex",
      loft: "Loft",
    };
    return types[type] || type;
  };

  const getEnergyRatingBadge = (rating) => {
    if (!rating) return null;
    const colors = {
      A: "bg-green-600 text-white",
      B: "bg-green-500 text-white",
      C: "bg-yellow-500 text-white",
      D: "bg-yellow-600 text-white",
      E: "bg-orange-500 text-white",
      F: "bg-red-500 text-white",
      G: "bg-red-700 text-white",
    };
    return (
      <span className={`px-2 py-1 text-xs font-bold rounded ${colors[rating] || "bg-gray-400 text-white"}`}>
        DPE: {rating}
      </span>
    );
  };

  const PropertyCard = ({ property }) => (
    <div className="overflow-hidden transition-all duration-500 bg-white border border-slate-100 shadow-sm group rounded-[2.5rem] hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-2">
      {/* Image principale */}
      {property.photos && property.photos.length > 0 ? (
        <div className="relative h-56 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-10" />
          <img
            src={property.photos[0]}
            alt={property.title}
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
          />
          {property.photos.length > 1 && (
            <div className="absolute flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black tracking-widest text-white bg-slate-900 rounded-full bottom-4 right-4 z-20 shadow-lg">
              <ImageIcon className="w-3.5 h-3.5" />
              {property.photos.length} PHOTOS
            </div>
          )}
          <div className="absolute top-4 right-4 z-20">
            {getStatusBadge(property.status)}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center h-56 bg-slate-50">
          <ImageIcon className="w-16 h-16 text-slate-200" />
          <div className="absolute top-4 right-4 z-20">
            {getStatusBadge(property.status)}
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-lg`}>
              <Home className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-emerald-600 transition-colors">
                {property.title}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{getTypeLabel(property.type)}</p>
                {property.energy_rating && <div className="w-1 h-1 rounded-full bg-slate-300" />}
                {getEnergyRatingBadge(property.energy_rating)}
              </div>
              {userRole === "admin" && (
                <p className="mt-1 text-xs text-slate-500">
                  Bailleur:{" "}
                  <span className="font-bold text-slate-700">
                    {ownerMap[property.owner_id] || "Bailleur inconnu"}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleEdit(property)}
              className="p-2.5 text-slate-400 transition-all rounded-2xl hover:text-emerald-600 hover:bg-emerald-50"
              aria-label="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(property.id)}
              className="p-2.5 text-slate-400 transition-all rounded-2xl hover:text-red-600 hover:bg-red-50"
              aria-label="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-3 mb-6 p-4 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
          <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-slate-700 line-clamp-1">{property.address}</p>
            {property.city && (
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {property.city} {property.postal_code}
              </p>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Bed, label: 'Beds', val: property.bedrooms },
            { icon: Bath, label: 'Baths', val: property.bathrooms },
            { icon: Square, label: 'm²', val: property.surface ?? property.surface_area }
          ].map((feat, i) => (
            <div key={i} className="flex flex-col items-center p-3 border border-slate-100 rounded-2xl">
              <feat.icon className="w-4 h-4 text-slate-400 mb-1.5" />
              <span className="text-sm font-black text-slate-900">{feat.val ?? '-'}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{feat.label}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Loyer Mensuel</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 tracking-tighter">
                {property.price?.toLocaleString()}
              </span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">FCFA</span>
            </div>
          </div>
          {property.charges > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Charges Incluses</p>
              <p className="text-sm font-bold text-slate-700">+{property.charges?.toLocaleString()} FCFA</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-fadeIn p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 rounded-full bg-emerald-500" />
            <span className="text-xs font-black tracking-widest text-emerald-600 uppercase">Portfolio</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 md:text-5xl font-display">Propriétés</h1>
          <p className="font-medium text-slate-400">Gérez votre parc immobilier et optimisez vos revenus</p>
        </div>

        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setEditingPropertyId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 font-bold active:scale-95 group"
          >
            <Plus size={22} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
            <span>NOUVELLE PROPRIÉTÉ</span>
          </button>
        )}
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="p-8 bg-white border border-slate-100 shadow-sm rounded-[2.5rem] flex items-center justify-between group hover:shadow-xl transition-all">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Biens</p>
            <p className="text-4xl font-black text-slate-900 font-display tracking-tight">{properties.length}</p>
          </div>
          <div className="p-5 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
            <Home className="w-8 h-8 text-slate-400 group-hover:text-emerald-500" strokeWidth={1.5} />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-[2.5rem] flex items-center">
          <div className="relative w-full">
            <Search className="absolute w-5 h-5 text-slate-400 -translate-y-1/2 left-6 top-1/2" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-slate-50 border-0 rounded-3xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-[2.5rem] flex items-center">
          <div className="relative w-full">
            <Filter className="absolute w-5 h-5 text-slate-400 -translate-y-1/2 left-6 top-1/2 pointer-events-none" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-slate-50 border-0 rounded-3xl focus:ring-2 focus:ring-slate-900 transition-all outline-none appearance-none font-bold text-slate-900"
            >
              <option value="all">TOUS LES TYPES</option>
              <option value="apartment">APPARTEMENT</option>
              <option value="house">MAISON</option>
              <option value="studio">STUDIO</option>
              <option value="duplex">DUPLEX</option>
              <option value="loft">LOFT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Property Form */}
      {showForm && (
        <div ref={formRef} className="p-8 bg-white border border-slate-200 shadow-2xl rounded-[2.5rem] animate-fadeIn">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
              {editingPropertyId ? "Modifier le bien" : "Nouveau bien immobilier"}
            </h3>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Titre de l'annonce *</label>
                <input
                  type="text"
                  required
                  placeholder="Villa moderne avec piscine..."
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Photos du bien</label>
                <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-10 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group flex flex-col items-center justify-center cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="image-upload"
                    disabled={uploadingImages}
                  />
                  <div className="p-5 bg-white rounded-3xl shadow-xl mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-slate-900" />
                  </div>
                  <p className="text-sm font-black text-slate-900">
                    {uploadingImages ? "UPLOAD EN COURS..." : "CLIQUEZ OU GLISSEZ VOS PHOTOS ICI"}
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    Format JPG, PNG ou WEBP (Max 10MB)
                  </p>
                </div>
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-6 md:grid-cols-4 lg:grid-cols-6">
                    {photoPreviews.map((photo, index) => (
                      <div key={index} className="relative aspect-square group overflow-hidden rounded-2xl border-4 border-white shadow-md">
                        <img src={photo} className="object-cover w-full h-full" alt="Preview" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Adresse complète *</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Ville</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Loyer Mensuel (FCFA)</label>
                  <input
                    type="number"
                    className="w-full px-6 py-4 bg-emerald-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-black text-emerald-900 text-xl"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Type de bien</label>
                  <select
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 appearance-none"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="apartment">APPARTEMENT</option>
                    <option value="house">MAISON</option>
                    <option value="studio">STUDIO</option>
                    <option value="duplex">DUPLEX</option>
                    <option value="loft">LOFT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Description détaillée</label>
                <textarea
                  rows="4"
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-8 py-4 font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:shadow-slate-200 transition-all active:scale-95"
              >
                {editingPropertyId ? "Mettre à jour" : "Confirmer le bien"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Properties Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white h-[32rem] rounded-[2.5rem] border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="p-20 text-center bg-white border border-slate-100 shadow-sm rounded-[2.5rem]">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">Aucun bien trouvé</h3>
          <p className="text-slate-400 font-medium">Ajustez vos filtres ou commencez à bâtir votre portfolio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}

