const allowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

module.exports = (req, res, next) => {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: 'Missing imageBase64 or mimeType in request body' });
    }

    if (!allowedMime.includes(mimeType)) {
        return res.status(400).json({ error: 'Unsupported mimeType' });
    }

    // quick sanity check for base64
    const isBase64 = typeof imageBase64 === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(imageBase64.replace(/\s+/g, ''));
    if (!isBase64) return res.status(400).json({ error: 'imageBase64 does not look like valid base64' });

    next();
};
