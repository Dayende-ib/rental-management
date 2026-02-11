import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { Building2, LogIn, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

export default function ImprovedLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", formData);

      if (res.data.session?.access_token) {
        localStorage.setItem("token", res.data.session.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/dashboard");
      } else {
        setError("Connexion reussie, mais session manquante.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Echec de la connexion. Verifiez vos identifiants."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#1C9B7E]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#17866C]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1C9B7E]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left Panel - Enhanced */}
        <div className="hidden lg:flex items-center justify-center p-12 bg-gradient-to-br from-[#1C9B7E] via-[#1A8F73] to-[#17866C] text-white relative overflow-hidden">
          {/* Animated grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }} />
          </div>

          {/* Floating shapes */}
          <div className="absolute w-32 h-32 top-20 right-20 bg-white/10 rounded-2xl rotate-12 animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute w-24 h-24 rounded-full bottom-32 left-16 bg-white/10 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
          <div className="absolute w-16 h-16 rounded-lg top-1/3 left-1/4 bg-white/10 -rotate-12 animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />

          <div className="relative z-10 max-w-lg">
            {/* Logo with glow effect */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-8 shadow-2xl bg-white/20 backdrop-blur-sm rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-3xl" />
              <Building2 className="relative z-10 w-10 h-10 text-white" strokeWidth={2} />
              <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl" />
            </div>

            <div className="mb-8 space-y-4">
              <h1 className="text-5xl font-bold leading-tight tracking-tight">
                Espace Bailleur
                <Sparkles className="inline-block w-8 h-8 ml-3 text-yellow-300" />
              </h1>
              <p className="text-xl leading-relaxed text-white/90">
                Connectez-vous pour gerer vos biens, vos locataires et vos revenus en temps reel.
              </p>
            </div>

            {/* Feature cards */}
            <div className="space-y-4">
              <div className="p-5 transition-all duration-300 border cursor-pointer group rounded-2xl bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 hover:scale-105">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 transition-transform rounded-xl bg-white/20 group-hover:scale-110">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">Tableau de bord intelligent</h3>
                    <p className="text-sm text-white/80">Visualisez toutes vos donnees en un coup d'œil</p>
                  </div>
                </div>
              </div>

              <div className="p-5 transition-all duration-300 border cursor-pointer group rounded-2xl bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 hover:scale-105">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 transition-transform rounded-xl bg-white/20 group-hover:scale-110">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">Gestion automatisee</h3>
                    <p className="text-sm text-white/80">Contrats, paiements et maintenance simplifies</p>
                  </div>
                </div>
              </div>

              <div className="p-5 transition-all duration-300 border cursor-pointer group rounded-2xl bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 hover:scale-105">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 transition-transform rounded-xl bg-white/20 group-hover:scale-110">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">Suivi en temps reel</h3>
                    <p className="text-sm text-white/80">Notifications et alertes instantanees</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced blur effects */}
          <div className="absolute rounded-full -right-32 -bottom-32 w-80 h-80 bg-white/10 blur-3xl" />
          <div className="absolute w-64 h-64 rounded-full -left-32 top-20 bg-white/10 blur-3xl" />
        </div>

        {/* Right Panel - Enhanced Form */}
        <div className="relative flex items-center justify-center px-6 py-12">
          {/* Mobile logo */}
          <div className="absolute lg:hidden top-8 left-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Bailleur</span>
            </div>
          </div>

          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-10 text-left">
              <h2 className="mb-3 text-4xl font-bold tracking-tight text-gray-900">
                Bon retour
              </h2>
              <p className="text-lg text-gray-500">
                Connectez-vous pour continuer
              </p>
            </div>

            {/* Form Card */}
            <div className="relative p-8 bg-white border-2 border-gray-100 shadow-2xl rounded-3xl backdrop-blur-sm">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1C9B7E]/5 via-transparent to-[#17866C]/5 rounded-3xl pointer-events-none" />

              <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                {/* Error message */}
                {error && (
                  <div className="p-4 border-2 border-red-200 bg-red-50 rounded-2xl animate-shake">
                    <p className="flex items-center gap-2 text-sm font-medium text-red-800">
                      <div className="flex items-center justify-center flex-shrink-0 w-5 h-5 bg-red-200 rounded-full">
                        <span className="text-xs text-red-600">!</span>
                      </div>
                      {error}
                    </p>
                  </div>
                )}

                {/* Email field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Mail size={16} className="text-[#1C9B7E]" />
                    Adresse email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="exemple@email.com"
                      className={`w-full px-4 py-3.5 pl-12 border-2 rounded-2xl transition-all duration-300 outline-none ${
                        focusedField === 'email'
                          ? 'border-[#1C9B7E] bg-[#1C9B7E]/5 shadow-lg shadow-[#1C9B7E]/20'
                          : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                      }`}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Mail 
                      size={18} 
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                        focusedField === 'email' ? 'text-[#1C9B7E]' : 'text-gray-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Lock size={16} className="text-[#1C9B7E]" />
                      Mot de passe
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className={`w-full px-4 py-3.5 pl-12 pr-12 border-2 rounded-2xl transition-all duration-300 outline-none ${
                        focusedField === 'password'
                          ? 'border-[#1C9B7E] bg-[#1C9B7E]/5 shadow-lg shadow-[#1C9B7E]/20'
                          : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                      }`}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Lock 
                      size={18} 
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                        focusedField === 'password' ? 'text-[#1C9B7E]' : 'text-gray-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1C9B7E] transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember me checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 text-[#1C9B7E] border-gray-300 rounded focus:ring-[#1C9B7E] focus:ring-2"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                    Se souvenir de moi
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full px-6 py-4 bg-gradient-to-r from-[#1C9B7E] to-[#17866C] text-white rounded-2xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-[#1C9B7E]/40 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                >
                  {/* Button shimmer effect */}
                  <div className="absolute inset-0 transition-transform duration-1000 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full" />
                  
                  <div className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />
                        <span>Connexion en cours...</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={20} />
                        <span>Se connecter</span>
                        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </div>
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-100" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 font-medium text-gray-500 bg-white">Nouveau sur la plateforme ?</span>
                </div>
              </div>

              {/* Register link */}
              <div className="text-center">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 text-[#1C9B7E] font-semibold rounded-2xl hover:bg-[#1C9B7E]/10 transition-all duration-300 group"
                >
                  <span>Creer un compte bailleur</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Security badge */}
            <div className="mt-6 text-center">
              <p className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock size={12} />
                Connexion securisee avec chiffrement SSL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
