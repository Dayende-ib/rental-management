const DEFAULT_MAX_LIMIT = 200;
const DEFAULT_LIMIT = 25;

const parsePagination = (query, maxLimit = DEFAULT_MAX_LIMIT) => {
    const hasPage = Object.prototype.hasOwnProperty.call(query || {}, 'page');
    const hasLimit = Object.prototype.hasOwnProperty.call(query || {}, 'limit');
    const enabled = hasPage || hasLimit;

    const pageRaw = Number(query?.page);
    const limitRaw = Number(query?.limit);

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const limitBase = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : DEFAULT_LIMIT;
    const limit = Math.min(limitBase, maxLimit);
    const offset = (page - 1) * limit;

    return {
        enabled,
        page,
        limit,
        offset,
        from: offset,
        to: offset + limit - 1,
    };
};

const parseSort = (query, allowedColumns = [], fallbackColumn = 'created_at') => {
    const requested = String(query?.sort_by || fallbackColumn).trim();
    const sortBy = allowedColumns.includes(requested) ? requested : fallbackColumn;
    const sortOrder = String(query?.sort_order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    return { sortBy, sortOrder };
};

const buildListResponse = (items, pagination, total) => {
    if (!pagination.enabled) {
        return items;
    }

    const totalItems = Number.isFinite(total) ? total : 0;
    const totalPages = pagination.limit > 0 ? Math.ceil(totalItems / pagination.limit) : 0;

    return {
        data: items,
        meta: {
            page: pagination.page,
            limit: pagination.limit,
            total_items: totalItems,
            total_pages: totalPages,
        },
    };
};

module.exports = {
    parsePagination,
    parseSort,
    buildListResponse,
};
