const createUserClient = require('../config/supabaseUser');

const getDocuments = async (req, res, next) => {
    try {
        const { entity_type, entity_id } = req.query;
        if (!entity_type || !entity_id) {
            return res.status(400).json({ error: 'Missing entity_type or entity_id' });
        }
        const client = createUserClient(req.token);
        const { data, error } = await client
            .from('documents')
            .select('*')
            .eq('entity_type', entity_type)
            .eq('entity_id', entity_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        next(err);
    }
};

const uploadDocument = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Missing file upload' });

        const { entity_type, entity_id, document_type } = req.body;
        if (!entity_type || !entity_id || !document_type) {
            return res.status(400).json({ error: 'Missing document metadata' });
        }

        const client = createUserClient(req.token);
        const mimeType = file.mimetype;
        const buffer = file.buffer;
        const ext = (mimeType && mimeType.split('/')[1]) || 'bin';
        const timestamp = Date.now();
        const filename = `documents/${entity_type}/${entity_id}/${timestamp}.${ext}`;
        const bucket = 'documents';

        const { error: uploadError } = await client.storage
            .from(bucket)
            .upload(filename, buffer, { contentType: mimeType, upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicData } = client.storage.from(bucket).getPublicUrl(filename);
        const fileUrl = publicData && publicData.publicUrl ? publicData.publicUrl : filename;

        const payload = {
            entity_type,
            entity_id,
            document_type,
            file_name: file.originalname,
            file_url: fileUrl,
            mime_type: mimeType,
            file_size: file.size,
            uploaded_by: req.user?.id || null,
        };

        const { data, error } = await client
            .from('documents')
            .insert([payload])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDocuments,
    uploadDocument,
};
