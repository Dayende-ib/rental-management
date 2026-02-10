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
    <div className="overflow-hidden transition-all duration-300 bg-white border border-gray-100 shadow-md group rounded-3xl hover:shadow-xl">
      {/* Image principale */}
      {property.photos && property.photos.length > 0 ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={property.photos[0]}
            alt={property.title}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
          />
          {property.photos.length > 1 && (
            <div className="absolute flex items-center gap-1 px-2 py-1 text-xs text-white bg-black rounded-lg bottom-2 right-2 bg-opacity-70">
              <ImageIcon className="w-3 h-3" />
              {property.photos.length}
            </div>
          )}
          <div className="absolute top-2 right-2">
            {getStatusBadge(property.status)}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center h-48 bg-gradient-to-br from-gray-100 to-gray-200">
          <ImageIcon className="w-16 h-16 text-gray-400" />
          <div className="absolute top-2 right-2">
            {getStatusBadge(property.status)}
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1C9B7E] transition-colors">
                {property.title}
              </h3>
              <p className="text-sm text-gray-500">{getTypeLabel(property.type)}</p>
              {userRole === "admin" && (
                <p className="mt-1 text-xs text-gray-500">
                  Bailleur:{" "}
                  <span className="font-semibold text-gray-700">
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
              className="p-2 text-gray-500 transition-colors rounded-xl hover:text-[#1C9B7E] hover:bg-[#1C9B7E] hover:bg-opacity-10"
              aria-label="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(property.id)}
              className="p-2 text-gray-500 transition-colors rounded-xl hover:text-red-600 hover:bg-red-50"
              aria-label="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 mb-4 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-[#1C9B7E] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="line-clamp-1">{property.address}</p>
            {property.city && (
              <p className="text-xs text-gray-500">
                {property.city} {property.postal_code}
              </p>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {property.bedrooms !== null && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Bed className="w-4 h-4 text-[#1C9B7E]" />
                <span className="text-xs text-gray-500">Chambres</span>
              </div>
              <p className="font-bold text-gray-900">{property.bedrooms}</p>
            </div>
          )}

          {property.bathrooms !== null && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Bath className="w-4 h-4 text-[#1C9B7E]" />
                <span className="text-xs text-gray-500">Bains</span>
              </div>
              <p className="font-bold text-gray-900">{property.bathrooms}</p>
            </div>
          )}

          {(property.surface ?? property.surface_area) && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Square className="w-4 h-4 text-[#1C9B7E]" />
                <span className="text-xs text-gray-500">m</span>
              </div>
              <p className="font-bold text-gray-900">{property.surface ?? property.surface_area}</p>
            </div>
          )}

          {property.rooms && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Home className="w-4 h-4 text-[#1C9B7E]" />
                <span className="text-xs text-gray-500">Pices</span>
              </div>
              <p className="font-bold text-gray-900">{property.rooms}</p>
            </div>
          )}

          {property.floor !== null && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-[#1C9B7E]" />
                <span className="text-xs text-gray-500">tage</span>
              </div>
              <p className="font-bold text-gray-900">
                {property.floor}
                {property.has_elevator && " 🛗"}
              </p>
            </div>
          )}

          {property.year_built && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-[#1C9B7E]" />
                <span className="text-xs text-gray-500">Anne</span>
              </div>
              <p className="font-bold text-gray-900">{property.year_built}</p>
            </div>
          )}
        </div>

        {/* Energy Rating */}
        {property.energy_rating && (
          <div className="mb-4">
            {getEnergyRatingBadge(property.energy_rating)}
          </div>
        )}

        {/* Description */}
        {property.description && (
          <p className="mb-4 text-sm text-gray-600 line-clamp-2">
            {property.description}
          </p>
        )}

        {/* Price */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Prix</span>
            <div className="flex items-center gap-1">
              <DollarSign className="w-5 h-5 text-[#1C9B7E]" />
              <span className="text-xl font-bold text-[#1C9B7E]">
                {property.price?.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500">FCFA</span>
            </div>
          </div>
          {property.charges > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">Charges</span>
              <span className="text-sm font-semibold text-gray-700">
                +{property.charges?.toLocaleString()} FCFA
              </span>
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
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Proprietes</h1>
          <p className="text-gray-500">Grez votre portefeuille immobilier</p>
        </div>

        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setEditingPropertyId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1C9B7E] to-[#17866C] text-white rounded-2xl hover:shadow-lg transition-all duration-300 font-medium"
          >
            <Plus size={20} strokeWidth={2} />
            <span>Nouvelle propriete</span>
          </button>
        )}
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total des proprietes</p>
              <p className="text-3xl font-bold text-gray-900">{properties.length}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-2xl">
              <Home className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="relative">
            <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
            <input
              type="text"
              placeholder="Rechercher une propriete..."
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] transition-all outline-none appearance-none"
            >
              <option value="all">Tous les types</option>
              <option value="apartment">Appartement</option>
              <option value="house">Maison</option>
              <option value="studio">Studio</option>
              <option value="duplex">Duplex</option>
              <option value="loft">Loft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Property Form */}
      {showForm && (
        <div ref={formRef} className="p-6 bg-white border border-gray-200 shadow-lg rounded-3xl">
          <h3 className="mb-6 text-xl font-bold text-gray-900">
            {editingPropertyId ? "Modifier la propriete" : "Nouvelle propriete"}
          </h3>

          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
              {/* Titre */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Titre *</label>
                <input
                  type="text"
                  required
                  placeholder="Villa moderne 3 chambres"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              {/* Upload d'images */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Photos de la propriete</label>
                
                {/* Zone d'upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#1C9B7E] transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImages}
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="w-12 h-12 mb-3 text-gray-400" />
                    <p className="mb-1 text-sm font-medium text-gray-700">
                      {uploadingImages ? "Upload en cours..." : "Cliquez pour ajouter des photos"}
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WEBP jusqu' 10MB
                    </p>
                  </label>
                </div>

                {/* Prvisualisation des images */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4">
                    {photoPreviews.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="object-cover w-full h-32 border border-gray-200 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute p-1 text-white transition-opacity bg-red-500 rounded-full opacity-0 top-2 right-2 group-hover:opacity-100 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-[#1C9B7E] text-white text-xs rounded-lg">
                            Principal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Adresse */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Adresse *</label>
                <input
                  type="text"
                  required
                  placeholder="123 Rue du Commerce"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              {/* Ville */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Ville</label>
                <input
                  type="text"
                  placeholder="Ouagadougou"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>

              {/* Code postal */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Code postal</label>
                <input
                  type="text"
                  placeholder="01 BP 1234"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                />
              </div>

              {/* Pays */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pays</label>
                <input
                  type="text"
                  placeholder="Burkina Faso"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                />
              </div>

              {/* Latitude */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="12.3714"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                />
              </div>

              {/* Longitude */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="-1.5197"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                />
              </div>

              {/* Surface */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Surface (m)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="120"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.surface}
                  onChange={(e) =>
                    setFormData({ ...formData, surface: e.target.value })
                  }
                />
              </div>

              {/* Pices */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nombre de pices</label>
                <input
                  type="number"
                  min="0"
                  placeholder="5"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.rooms}
                  onChange={(e) =>
                    setFormData({ ...formData, rooms: e.target.value })
                  }
                />
              </div>

              {/* Chambres */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Chambres</label>
                <input
                  type="number"
                  min="0"
                  placeholder="3"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.bedrooms}
                  onChange={(e) =>
                    setFormData({ ...formData, bedrooms: e.target.value })
                  }
                />
              </div>

              {/* Salles de bain */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Salles de bain</label>
                <input
                  type="number"
                  min="0"
                  placeholder="2"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.bathrooms}
                  onChange={(e) =>
                    setFormData({ ...formData, bathrooms: e.target.value })
                  }
                />
              </div>

              {/* tage */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">tage</label>
                <input
                  type="number"
                  placeholder="3"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.floor}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: e.target.value })
                  }
                />
              </div>

              {/* Anne de construction */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Anne de construction</label>
                <input
                  type="number"
                  min="1800"
                  max="2100"
                  placeholder="2020"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.year_built}
                  onChange={(e) =>
                    setFormData({ ...formData, year_built: e.target.value })
                  }
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="apartment">Appartement</option>
                  <option value="house">Maison</option>
                  <option value="studio">Studio</option>
                  <option value="duplex">Duplex</option>
                  <option value="loft">Loft</option>
                </select>
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
                  <option value="available">Disponible</option>
                  <option value="rented">Lou</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="sold">Vendu</option>
                </select>
              </div>

              {/* Classe nergtique */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Classe nergtique (DPE)</label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.energy_rating}
                  onChange={(e) =>
                    setFormData({ ...formData, energy_rating: e.target.value })
                  }
                >
                  <option value="">Non renseign</option>
                  <option value="A">A (Excellent)</option>
                  <option value="B">B (Trs bon)</option>
                  <option value="C">C (Bon)</option>
                  <option value="D">D (Moyen)</option>
                  <option value="E">E (Passable)</option>
                  <option value="F">F (Faible)</option>
                  <option value="G">G (Trs faible)</option>
                </select>
              </div>

              {/* Prix */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Prix (FCFA) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  placeholder="150000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
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

              {/* Ascenseur */}
              <div className="space-y-2 md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_elevator}
                    onChange={(e) =>
                      setFormData({ ...formData, has_elevator: e.target.checked })
                    }
                    className="w-5 h-5 text-[#1C9B7E] border-gray-300 rounded focus:ring-[#1C9B7E]"
                  />
                  <span className="text-sm font-medium text-gray-700">Ascenseur disponible</span>
                </label>
              </div>

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows="4"
                  placeholder="Description dtaille de la propriete..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] focus:border-transparent transition-all outline-none resize-none"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPropertyId(null);
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
                {editingPropertyId ? "Mettre a jour" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Properties Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 h-80 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 shadow-md rounded-3xl">
          <Home className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Aucune propriete trouvee</h3>
          <p className="text-gray-500">
            {searchTerm ? "Essayez d'ajuster votre recherche" : "Commencez par ajouter votre premiere propriete"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}













