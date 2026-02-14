const allowedMime = ['application/pdf'];

module.exports = (req, res, next) => {
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'Missing file upload' });
    }

    if (!allowedMime.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    next();
};
