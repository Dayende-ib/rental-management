import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { Bell, Check, Info, AlertTriangle, XCircle } from "lucide-react";
import PaginationControls from "../components/PaginationControls";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total_items: 0,
    total_pages: 1,
  });

  const fetchNotifications = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const { items, meta: responseMeta } = await api.getList("/notifications", {
        params: { page: targetPage, limit: meta.limit },
      });
      setNotifications(items || []);
      setMeta(responseMeta);
    } catch (err) {
      console.error(err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [meta.limit, page]);

  useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications(page);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <Check className="w-4 h-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">Suivez les activites et alertes recentes</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-100 rounded-xl">
          <Bell className="w-4 h-4" />
          {notifications.filter((n) => !n.is_read).length} non lues (page)
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-10 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Aucune notification pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 bg-white border rounded-2xl shadow-sm flex items-start gap-3 ${
                n.is_read ? "border-gray-100" : "border-blue-200"
              }`}
            >
              <div className="mt-1">{getIcon(n.type)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{n.title}</h3>
                  <span className="text-xs text-gray-400">
                    {n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : ""}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{n.message}</p>
              </div>
              {!n.is_read && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  Marquer lu
                </button>
              )}
            </div>
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
