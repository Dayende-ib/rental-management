import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import {
  DollarSign,
  Plus,
  Calendar,
  FileText,
  Search,
  Filter,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Edit2,
} from "lucide-react";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [userRole, setUserRole] = useState("");
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    contract_id: "",
    month: "",
    amount: "",
    amount_paid: "0",
    due_date: "",
    payment_date: "",
    payment_method: "bank_transfer",
    transaction_id: "",
    status: "pending",
    validation_status: "not_submitted",
    validation_notes: "",
    rejection_reason: "",
    reminder_sent: false,
    late_fee: "0",
  });

  const resetForm = () => {
    setFormData({
      contract_id: "",
      month: "",
      amount: "",
      amount_paid: "0",
      due_date: "",
      payment_date: "",
      payment_method: "bank_transfer",
      transaction_id: "",
      status: "pending",
      validation_status: "not_submitted",
      validation_notes: "",
      rejection_reason: "",
      reminder_sent: false,
      late_fee: "0",
    });
  };

  const toDateValue = (value) => (value ? value.slice(0, 10) : "");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payments");
      setPayments(res.data || []);
    } catch (err) {
      console.error(err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const res = await api.get("/contracts");
      setContracts(res.data || []);
    } catch (err) {
      console.error(err);
      setContracts([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
  };

  useEffect(() => {
    fetchPayments();
    fetchContracts();
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

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.month?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.amount?.toString().includes(searchTerm);
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
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
        {icons[status]}
        {labels[status] || status}
      </span>
    );
  };

  const getValidationBadge = (validationStatus) => {
    const styles = {
      not_submitted: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      validated: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels = {
      not_submitted: "Non soumis",
      pending: "En cours",
      validated: "Valide",
      rejected: "Rejete",
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${styles[validationStatus] || styles.not_submitted}`}>
        {labels[validationStatus] || validationStatus}
      </span>
    );
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      bank_transfer: "Virement bancaire",
      direct_debit: "Prelevement",
      check: "Cheque",
      cash: "Especes",
      card: "Carte",
    };
    return methods[method] || method;
  };
  const normalizePaymentPayload = (data) => ({
    ...data,
    contract_id: data.contract_id || null,
    due_date: data.due_date || null,
    payment_date: data.payment_date || null,
  });

  const handleEdit = () => {};

  const handleValidate = async (paymentId) => {
    try {
      await api.post(`/payments/${paymentId}/validate`);
      fetchPayments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (paymentId) => {
    const reason = window.prompt("Raison du rejet ?");
    if (!reason) return;
    try {
      await api.post(`/payments/${paymentId}/reject`, { rejection_reason: reason });
      fetchPayments();
    } catch (err) {
      console.error(err);
    }
  };

  const PaymentCard = ({ payment }) => (
    <div className="overflow-hidden transition-all duration-300 bg-white border border-gray-100 shadow-md group rounded-3xl hover:shadow-xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1C9B7E] transition-colors">
                {payment.amount?.toLocaleString()} FCFA
              </h3>
              <p className="text-sm text-gray-500">{payment.month}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(payment.status)}
          </div>
        </div>

        {/* Payment Progress */}
        {payment.status === "partial" && (
          <div className="p-3 mb-4 border border-orange-200 rounded-xl bg-orange-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-orange-800">Montant paye</span>
              <span className="text-sm font-bold text-orange-900">
                {payment.amount_paid?.toLocaleString()} / {payment.amount?.toLocaleString()} FCFA
              </span>
            </div>
            <div className="w-full h-2 bg-orange-200 rounded-full">
              <div
                className="bg-gradient-to-r from-[#1C9B7E] to-[#17866C] h-2 rounded-full"
                style={{
                  width: `${Math.min((payment.amount_paid / payment.amount) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-[#1C9B7E]" />
            <div className="flex-1">
              <span className="text-gray-500">Echeance: </span>
              <span className="font-medium text-gray-900">
                {new Date(payment.due_date).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>

          {payment.payment_date && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <div className="flex-1">
                <span className="text-gray-500">Paye le: </span>
                <span className="font-medium text-gray-900">
                  {new Date(payment.payment_date).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-[#1C9B7E]" />
            <span className="text-gray-600">
              {getPaymentMethodLabel(payment.payment_method)}
            </span>
          </div>

          {payment.transaction_id && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-[#1C9B7E]" />
              <span className="font-mono text-xs text-gray-600">
                {payment.transaction_id}
              </span>
            </div>
          )}

          {payment.late_fee > 0 && (
            <div className="p-2 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-800">Frais de retard</span>
                <span className="font-bold text-red-900">
                  +{payment.late_fee?.toLocaleString()} FCFA
                </span>
              </div>
            </div>
          )}

          {/* Validation Status */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Validation</span>
              {getValidationBadge(payment.validation_status)}
            </div>
            {payment.validation_notes && (
              <p className="mt-2 text-xs italic text-gray-600">
                {payment.validation_notes}
              </p>
            )}
            {payment.rejection_reason && (
              <p className="mt-2 text-xs text-red-600">
                Raison: {payment.rejection_reason}
              </p>
            )}
          </div>

          {/* Proofs */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Preuves</p>
            {Array.isArray(payment.proof_urls) && payment.proof_urls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {payment.proof_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#1C9B7E] hover:underline"
                  >
                    Preuve {idx + 1}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Aucune preuve</p>
            )}
          </div>

          {userRole !== "tenant" && payment.validation_status === "pending" && (
            <div className="pt-3 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => handleValidate(payment.id)}
                className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
              >
                Valider
              </button>
              <button
                type="button"
                onClick={() => handleReject(payment.id)}
                className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
              >
                Rejeter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const totalAmount = filteredPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-500">Suivez tous les paiements de loyer</p>
        </div>

        {null}
      </div>

      {null}

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-6 bg-white border border-gray-100 shadow-md rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total encaisse</p>
              <p className="text-2xl font-bold text-[#1C9B7E]">
                {totalAmount.toLocaleString()} FCFA
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#1C9B7E] to-[#17866C] rounded-2xl">
              <DollarSign className="w-8 h-8 text-white" strokeWidth={1.5} />
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
              <option value="pending">En attente</option>
              <option value="paid">Paye</option>
              <option value="partial">Partiel</option>
              <option value="overdue">En retard</option>
              <option value="cancelled">Annule</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Payment Form */}
      {null}

      {/* Payments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 shadow-md rounded-3xl">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Aucun paiement trouve</h3>
          <p className="text-gray-500">
            {searchTerm ? "Essayez d'ajuster votre recherche" : "Commencez par enregistrer un paiement"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  );
}


