const { translateErrorMessage } = require('../utils/userFacingErrors');

const errorResponseTranslator = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
        if (res.statusCode < 400 || !payload || typeof payload !== 'object') {
            return originalJson(payload);
        }

        const statusCode = res.statusCode;
        const nextPayload = { ...payload };

        if (typeof nextPayload.error === 'string') {
            nextPayload.error = translateErrorMessage(nextPayload.error, statusCode);
        } else if (nextPayload.error && typeof nextPayload.error === 'object') {
            nextPayload.error = { ...nextPayload.error };
            if (typeof nextPayload.error.message === 'string') {
                nextPayload.error.message = translateErrorMessage(
                    nextPayload.error.message,
                    statusCode
                );
            }
        } else if (typeof nextPayload.message === 'string') {
            nextPayload.message = translateErrorMessage(nextPayload.message, statusCode);
        }

        return originalJson(nextPayload);
    };

    next();
};

module.exports = errorResponseTranslator;
