import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { Building2, UserPlus, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, Check } from "lucide-react";

export default function ImprovedRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "manager",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const handlePasswordChange = (password) => {
    setFormData({ ...formData, password });
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", formData);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Echec de l'inscription. Veuillez reessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-200';
    if (passwordStrength === 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-orange-500';
    if (passwordStrength === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Faible';
    if (passwordStrength === 2) return 'Moyen';
    if (passwordStrength === 3) return 'Bon';
    return 'Excellent';
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
                Rejoignez-nous
                <Sparkles className="inline-block w-8 h-8 ml-3 text-yellow-300" />
              </h1>
              <p className="text-xl leading-relaxed text-white/90">
                Creez votre espace de gestion locative et commencez a suivre vos biens immobiliers.
              </p>
            </div>

            {/* Benefits list */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-white/20">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-white">Gratuit pour commencer</h3>
                  <p className="text-sm text-white/80">Aucune carte bancaire requise</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-white/20">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-white">Configuration en 2 minutes</h3>
                  <p className="text-sm text-white/80">Interface simple et intuitive</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-white/20">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-white">Support dedie 24/7</h3>
                  <p className="text-sm text-white/80">Notre equipe est la pour vous aider</p>
                </div>
              </div>
            </div>

            {/* Trust badge */}
            <div className="p-5 mt-10 border rounded-2xl bg-white/10 backdrop-blur-sm border-white/20">
              <p className="text-sm leading-relaxed text-white/90">
                🔒 Vos donnees sont protegees et securisees. Nous respectons votre vie privee et ne partageons jamais vos informations.
              </p>
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
                Creer un compte
              </h2>
              <p className="text-lg text-gray-500">
                Inscription reservee aux bailleurs
              </p>
            </div>

            {/* Form Card */}
            <div className="relative p-8 bg-white border-2 border-gray-100 shadow-2xl rounded-3xl backdrop-blur-sm">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1C9B7E]/5 via-transparent to-[#17866C]/5 rounded-3xl pointer-events-none" />

              <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
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

                {/* Full name field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <User size={16} className="text-[#1C9B7E]" />
                    Nom complet
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      minLength={3}
                      placeholder="Jean Dupont"
                      className={`w-full px-4 py-3.5 pl-12 border-2 rounded-2xl transition-all duration-300 outline-none ${
                        focusedField === 'name'
                          ? 'border-[#1C9B7E] bg-[#1C9B7E]/5 shadow-lg shadow-[#1C9B7E]/20'
                          : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                      }`}
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <User 
                      size={18} 
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                        focusedField === 'name' ? 'text-[#1C9B7E]' : 'text-gray-400'
                      }`}
                    />
                  </div>
                </div>

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
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Lock size={16} className="text-[#1C9B7E]" />
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3.5 pl-12 pr-12 border-2 rounded-2xl transition-all duration-300 outline-none ${
                        focusedField === 'password'
                          ? 'border-[#1C9B7E] bg-[#1C9B7E]/5 shadow-lg shadow-[#1C9B7E]/20'
                          : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                      }`}
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
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
                  
                  {/* Password strength indicator */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              level <= passwordStrength ? getStrengthColor() : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      {passwordStrength > 0 && (
                        <p className="text-xs font-medium text-gray-600">
                          Force du mot de passe: <span className={
                            passwordStrength === 1 ? 'text-red-600' :
                            passwordStrength === 2 ? 'text-orange-600' :
                            passwordStrength === 3 ? 'text-yellow-600' :
                            'text-green-600'
                          }>{getStrengthText()}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <input type="hidden" name="role" value="manager" />

                {/* Terms checkbox */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="w-4 h-4 mt-0.5 text-[#1C9B7E] border-gray-300 rounded focus:ring-[#1C9B7E] focus:ring-2"
                  />
                  <label htmlFor="terms" className="text-xs leading-relaxed text-gray-600">
                    J'accepte les <button type="button" className="text-[#1C9B7E] font-semibold hover:underline">conditions d'utilisation</button> et la <button type="button" className="text-[#1C9B7E] font-semibold hover:underline">politique de confidentialite</button>
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
                        <span>Creation du compte...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={20} />
                        <span>Creer mon compte</span>
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
                  <span className="px-4 font-medium text-gray-500 bg-white">Vous avez deja un compte ?</span>
                </div>
              </div>

              {/* Login link */}
              <div className="text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 text-[#1C9B7E] font-semibold rounded-2xl hover:bg-[#1C9B7E]/10 transition-all duration-300 group"
                >
                  <span>Se connecter</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Security badge */}
            <div className="mt-6 text-center">
              <p className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock size={12} />
                Inscription securisee avec chiffrement SSL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}