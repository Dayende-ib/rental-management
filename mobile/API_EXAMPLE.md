# Exemple d'API pour l'application Rental Management

Voici un exemple de structure d'API REST que l'application attend.

## Endpoints requis

### 1. Authentification

**POST `/auth/login`**
```json
// Requête
{
  "email": "locataire@example.com",
  "password": "motdepasse123"
}

// Réponse succès
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "name": "Jean Dupont",
    "email": "locataire@example.com"
  }
}

// Réponse erreur
{
  "error": "Invalid credentials"
}
```

### 2. Profil locataire

**GET `/tenants/me`**
```json
// Headers: Authorization: Bearer <token>

// Réponse
{
  "data": {
    "id": "user123",
    "name": "Jean Dupont",
    "email": "locataire@example.com",
    "phone": "+33 6 12 34 56 78"
  },
  "property": {
    "id": "prop456",
    "address": "123 Rue de la Paix",
    "city": "Paris",
    "postalCode": "75001",
    "monthlyRent": 1200.00
  }
}
```

### 3. Paiements

**GET `/payments`**
```json
// Headers: Authorization: Bearer <token>

// Réponse
{
  "data": [
    {
      "id": "pay001",
      "month": "Janvier 2024",
      "amount": 1200.00,
      "status": "paid",
      "dueDate": "2024-01-05T00:00:00Z",
      "paidDate": "2024-01-03T14:30:00Z"
    },
    {
      "id": "pay002",
      "month": "Février 2024",
      "amount": 1200.00,
      "status": "unpaid",
      "dueDate": "2024-02-05T00:00:00Z",
      "paidDate": null
    }
  ]
}
```

**POST `/payments/{id}/pay`**
```json
// Headers: Authorization: Bearer <token>

// Requête
{
  "status": "paid"
}

// Réponse
{
  "success": true,
  "message": "Payment updated successfully"
}
```

### 4. Maintenance

**GET `/maintenance`**
```json
// Headers: Authorization: Bearer <token>

// Réponse
{
  "data": [
    {
      "id": "maint001",
      "description": "Fuite d'eau dans la cuisine",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "maint002",
      "description": "Prise électrique défectueuse",
      "status": "in_progress",
      "createdAt": "2024-01-10T09:15:00Z",
      "updatedAt": "2024-01-16T14:20:00Z"
    }
  ]
}
```

**POST `/maintenance`**
```json
// Headers: Authorization: Bearer <token>

// Requête
{
  "description": "Description du problème",
  "status": "pending"
}

// Réponse
{
  "success": true,
  "id": "maint003",
  "message": "Maintenance request created"
}
```

## Codes d'erreur HTTP

- `200` - Succès
- `201` - Création réussie
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Ressource non trouvée
- `500` - Erreur serveur

## Implémentation exemple (Node.js/Express)

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Vérification des identifiants (à implémenter)
  if (email === 'locataire@example.com' && password === 'motdepasse123') {
    const token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET);
    res.json({
      token,
      user: {
        id: 'user123',
        name: 'Jean Dupont',
        email: 'locataire@example.com'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Profil locataire
app.get('/tenants/me', authenticateToken, (req, res) => {
  res.json({
    data: {
      id: req.user.userId,
      name: 'Jean Dupont',
      email: 'locataire@example.com',
      phone: '+33 6 12 34 56 78'
    },
    property: {
      id: 'prop456',
      address: '123 Rue de la Paix',
      city: 'Paris',
      postalCode: '75001',
      monthlyRent: 1200.00
    }
  });
});

// Démarrer le serveur
app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});
```

## Variables d'environnement requises

```
JWT_SECRET=votre_clé_secrète_jwt
DATABASE_URL=url_de_votre_base_de_données
PORT=3000
```

Cette structure d'API permet à l'application Flutter de fonctionner correctement avec toutes ses fonctionnalités.