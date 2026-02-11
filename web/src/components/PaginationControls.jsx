export default function PaginationControls({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  onPrev,
  onNext,
}) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-gray-600">
        Page <span className="font-semibold text-gray-900">{page}</span> /{" "}
        <span className="font-semibold text-gray-900">{totalPages}</span>
        {" · "}
        <span className="font-semibold text-gray-900">{totalItems}</span> éléments
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
