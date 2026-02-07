# rental-management
Flutter mobile application for tenants to manage rent payments and maintenance requests, connected to a REST API.

## Docker

Construire et lancer l'application avec Docker :

- **Build image:** `docker build -t backend-app .`
- **Run (standalone):** `docker run -p 5000:5000 --env-file .env --name backend-app backend-app`
- **Avec Docker Compose:** `docker compose up --build`

Copiez `.env.example` en `.env` et remplissez les variables nécessaires avant de lancer.

### Endpoint: Upload Payment Proof

Upload d'une preuve de paiement (image encodée en base64) et stockage dans Supabase Storage.

- URL: `POST /api/payments/:id/proof`
- Headers: `Authorization: Bearer <token>` (si protégé)
- Body (JSON):

```json
{
	"imageBase64": "<BASE64_ENCODED_IMAGE>",
	"mimeType": "image/png"
}
```

La route stocke l'image dans le bucket `payment-proofs` et met à jour le champ `proof_url` dans la table `payments`.

Assurez-vous que le bucket `payment-proofs` existe dans votre projet Supabase et que les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont dans `.env`.
