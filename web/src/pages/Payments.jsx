import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Filter,
  Search,
  XCircle,
} from "lucide-react";

import PaginationControls from "../components/PaginationControls";
import api from "../services/api";

export default function Payments() {
  const [payments, setPayments] = useState([]);
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
  const [filterValidation, setFilterValidation] = useState("all");
  const [userRole, setUserRole] = useState("");

  const [decisionModal, setDecisionModal] = useState({
    open: false,
    mode: "validate",
    payment: null,
  });
  const [validationNotes, setValidationNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  useEffect(() => {
    fetchPayments(page);
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

  const fetchPayments = async (targetPage = page) => {
    try {
      setLoading(true);
      const { items, meta: responseMeta } = await api.getList("/payments", {
        params: { page: targetPage, limit: meta.limit },
      });
      setPayments(items || []);
      setMeta(responseMeta);
    } catch (err) {
      console.error(err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        String(p.month || "").toLowerCase().includes(query) ||
        String(p.transaction_id || "").toLowerCase().includes(query) ||
        String(p.amount || "").includes(searchTerm);
      const matchesStatus = filterStatus === "all" || p.status === filterStatus;
      const matchesValidation =
        filterValidation === "all" || p.validation_status === filterValidation;
      return matchesSearch && matchesStatus && matchesValidation;
    });
  }, [payments, searchTerm, filterStatus, filterValidation]);

  const totalAmount = filteredPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const openDecisionModal = (mode, payment) => {
    setDecisionModal({ open: true, mode, payment });
    setValidationNotes(payment?.validation_notes || "");
    setRejectionReason(payment?.rejection_reason || "");
  };

  const closeDecisionModal = () => {
    setDecisionModal({ open: false, mode: "validate", payment: null });
    setValidationNotes("");
    setRejectionReason("");
  };

  const submitDecision = async () => {
    if (!decisionModal.payment) return;
    if (decisionModal.mode === "reject" && !rejectionReason.trim()) {
      return;
    }

    try {
      setSavingDecision(true);
      const paymentId = decisionModal.payment.id;
      if (decisionModal.mode === "validate") {
        await api.post(`/payments/${paymentId}/validate`, {
          validation_notes: validationNotes.trim() || null,
        });
      } else {
        await api.post(`/payments/${paymentId}/reject`, {
          rejection_reason: rejectionReason.trim(),
          validation_notes: validationNotes.trim() || null,
        });
      }
      closeDecisionModal();
      fetchPayments(page);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDecision(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-500">Gestion des preuves et validation des paiements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total encaisse</p>
              <p className="text-2xl font-bold text-[#1C9B7E]">{totalAmount.toLocaleString()} FCFA</p>
              <p className="mt-1 text-xs text-gray-500">{meta.total_items} paiements</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-2xl">
              <DollarSign className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-md rounded-3xl md:col-span-1">
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

        <div className="p-4 bg-white border border-gray-100 shadow-md rounded-3xl md:col-span-1">
          <div className="relative">
            <Filter className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] transition-all outline-none appearance-none"
            >
              <option value="all">Tous statuts paiement</option>
              <option value="pending">En attente</option>
              <option value="paid">Paye</option>
              <option value="partial">Partiel</option>
              <option value="overdue">En retard</option>
              <option value="cancelled">Annule</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-md rounded-3xl md:col-span-1">
          <div className="relative">
            <Filter className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
            <select
              value={filterValidation}
              onChange={(e) => setFilterValidation(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-[#1C9B7E] transition-all outline-none appearance-none"
            >
              <option value="all">Tous statuts validation</option>
              <option value="not_submitted">Non soumis</option>
              <option value="pending">En attente</option>
              <option value="validated">Valide</option>
              <option value="rejected">Rejete</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 shadow-md rounded-3xl">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Aucun paiement trouve</h3>
          <p className="text-gray-500">Ajustez les filtres pour afficher des resultats.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              userRole={userRole}
              onValidate={() => openDecisionModal("validate", payment)}
              onReject={() => openDecisionModal("reject", payment)}
            />
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

      {decisionModal.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg p-6 bg-white shadow-xl rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900">
              {decisionModal.mode === "validate" ? "Valider le paiement" : "Rejeter le paiement"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {decisionModal.payment?.month} - {Number(decisionModal.payment?.amount || 0).toLocaleString()} FCFA
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Notes de validation</label>
              <textarea
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                rows={3}
                placeholder="Ajouter une note interne (optionnel)"
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C9B7E]"
              />

              {decisionModal.mode === "reject" && (
                <>
                  <label className="block text-sm font-medium text-gray-700">Motif de rejet</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Raison obligatoire"
                    className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={closeDecisionModal}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg"
                disabled={savingDecision}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitDecision}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${
                  decisionModal.mode === "validate" ? "bg-green-600" : "bg-red-600"
                } disabled:opacity-60`}
                disabled={
                  savingDecision ||
                  (decisionModal.mode === "reject" && !rejectionReason.trim())
                }
              >
                {savingDecision ? "En cours..." : decisionModal.mode === "validate" ? "Valider" : "Rejeter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentCard({ payment, userRole, onValidate, onReject }) {
  const canReview =
    (userRole === "admin" || userRole === "manager") &&
    payment.validation_status === "pending";

  return (
    <div className="overflow-hidden transition-all duration-300 bg-white border border-gray-100 shadow-md group rounded-3xl hover:shadow-xl">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1C9B7E] transition-colors">
                {Number(payment.amount || 0).toLocaleString()} FCFA
              </h3>
              <p className="text-sm text-gray-500">{payment.month}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(payment.status)}
            {getValidationBadge(payment.validation_status)}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-4 h-4 text-[#1C9B7E]" />
            Echeance: {formatDate(payment.due_date)}
          </div>
          {payment.payment_date && (
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Paye le: {formatDate(payment.payment_date)}
            </div>
          )}
          {payment.validated_at && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-[#1C9B7E]" />
              Revu le: {formatDate(payment.validated_at)}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="mb-2 text-xs font-medium text-gray-500">Preuves</p>
          {Array.isArray(payment.proof_urls) && payment.proof_urls.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {payment.proof_urls.map((url, idx) => (
                <div key={idx} className="w-24">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden border border-gray-200 rounded-lg bg-gray-50"
                  >
                    {isLikelyImageUrl(url) ? (
                      <img
                        src={url}
                        alt={`Preuve ${idx + 1}`}
                        className="object-cover w-24 h-24"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="items-center justify-center hidden w-24 h-24 px-2 text-[10px] text-center text-gray-500"
                      style={{ display: isLikelyImageUrl(url) ? "none" : "flex" }}
                    >
                      Ouvrir preuve
                    </div>
                  </a>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-1 text-[11px] font-semibold text-[#1C9B7E] hover:underline truncate"
                    title={url}
                  >
                    Preuve {idx + 1}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Aucune preuve soumise</p>
          )}
        </div>

        {payment.validation_notes && (
          <div className="p-2 text-xs text-gray-700 border border-gray-100 rounded-lg bg-gray-50">
            <strong>Notes:</strong> {payment.validation_notes}
          </div>
        )}

        {payment.rejection_reason && (
          <div className="p-2 text-xs text-red-700 border border-red-100 rounded-lg bg-red-50">
            <strong>Motif rejet:</strong> {payment.rejection_reason}
          </div>
        )}

        {canReview && (
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onValidate}
              className="px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
            >
              Valider
            </button>
            <button
              type="button"
              onClick={onReject}
              className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
            >
              Rejeter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusBadge(status) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    paid: "bg-green-100 text-green-800 border-green-200",
    partial: "bg-orange-100 text-orange-800 border-orange-200",
    overdue: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  };
  const labels = {
    pending: "En attente",
    paid: "Paye",
    partial: "Partiel",
    overdue: "En retard",
    cancelled: "Annule",
  };
  const icons = {
    pending: <Clock className="w-3 h-3" />,
    paid: <CheckCircle2 className="w-3 h-3" />,
    partial: <AlertTriangle className="w-3 h-3" />,
    overdue: <XCircle className="w-3 h-3" />,
    cancelled: <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full border flex items-center gap-1 ${styles[status] || styles.pending}`}>
      {icons[status] || <Clock className="w-3 h-3" />}
      {labels[status] || status}
    </span>
  );
}

function getValidationBadge(validationStatus) {
  const styles = {
    not_submitted: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    validated: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const labels = {
    not_submitted: "Non soumis",
    pending: "En attente",
    validated: "Valide",
    rejected: "Rejete",
  };
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${styles[validationStatus] || styles.not_submitted}`}>
      {labels[validationStatus] || validationStatus}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("fr-FR");
  } catch {
    return String(value);
  }
}

function isLikelyImageUrl(url) {
  const lower = String(url || "").toLowerCase();
  return (
    lower.includes(".png") ||
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".webp")
  );
}
