const errorHandler = (err, req, res, next) => {
    const requestId = req?.requestId || '-';

    if (err.stack) {
        console.error(`[${requestId}]`, err.stack);
    } else {
        console.error(`[${requestId}] Error Object:`, JSON.stringify(err, null, 2));
    }

    let status = err.status || 500;

    // Map common database error codes
    if (err.code === '42501') {
        status = 403; // Forbidden
    } else if (err.code === '23505') {
        status = 409; // Conflict
    } else if (err.code === 'P0001') {
        status = 400; // Bad Request (RAISE EXCEPTION in PL/pgSQL)
    }

    const message = err.message || (typeof err === 'string' ? err : 'Internal Server Error');

    res.status(status).json({
        error: {
            message,
            status,
            request_id: requestId,
        },
    });
};

module.exports = errorHandler;
