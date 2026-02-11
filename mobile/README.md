# 🏠 Rental Management - Mobile App

Application mobile Flutter pour la gestion locative côté locataire et prospect.

## 📱 Fonctionnalités

### ✅ Actuellement Disponibles
- 🔐 **Authentification** (Login/Register)
- 🏠 **Dashboard Locataire** avec informations du contrat actif
- 💰 **Gestion des paiements**
  - Visualisation des loyers
  - Upload de preuves de paiement (photo)
  - Statuts de validation en temps réel
- 🔧 **Demandes de maintenance**
  - Signalement d'incidents
  - Suivi des statuts (en cours, résolu)
- 📝 **Nouveau : Gestion des Contrats**
  - Visualisation des offres de location
  - Demande de location en un clic
  - **Signature électronique** du contrat (Acceptation/Refus)
- 👤 **Profil utilisateur**
- 👀 **Mode Invité** : Consultation des biens disponibles sans compte

### 🚀 Améliorations Récentes (v1.2)
- **Flux de Location Complet** : De la visualisation à la signature.
- **Séparation des Routes API** : Utilisation des endpoints dédiés `/mobile`.
- **Expérience Utilisateur** : Feedback immédiat lors des actions critiques.

---

## 🛠️ Technologies

### Core
- **Flutter** 3.10.7+
- **Dart** SDK ^3.10.7

### Architecture & State Management
- **Riverpod** ^2.6.1 : Gestion d'état réactive et injection de dépendances.
- **MVC/Service Pattern** : Organisation claire du code.

### Networking & Data
- **http** ^1.1.0 : Communication REST API.
- **shared_preferences** ^2.2.2 : Stockage local (tokens, cache léger).
- **sqflite** ^2.4.2 : Base de données locale pour le mode offline.
- **connectivity_plus** ^5.0.2 : Détection de l'état réseau.

### UI/UX
- **google_fonts** ^8.0.1 (Poppins)
- **image_picker** ^1.0.7 (Upload de preuves)

---

## 📁 Structure du Projet

```
mobile/
├── lib/
│   ├── auth/                       # Services d'authentification
│   ├── core/                       # Cœur de l'application
│   │   ├── api_client.dart         # Gestionnaire HTTP centralisé
│   │   ├── constants.dart          # Configuration API & UI
│   │   ├── models.dart             # Modèles de données (Tenant, Property, Contract...)
│   │   ├── storage.dart            # Gestion Tokens & Prefs
│   │   ├── database/               # Persistance locale (SQLite)
│   │   ├── providers/              # State Providers (Riverpod)
│   │   └── services/               # Services utilitaires (Connectivity)
│   ├── home/                       # Logique Dashboard
│   ├── maintenance/                # Logique Maintenance
│   ├── navigation/                 # Navigation principale (BottomBar)
│   ├── payments/                   # Logique Paiements
│   ├── screens/                    # Écrans (UI)
│   │   ├── login_screen.dart
│   │   ├── ...
│   │   ├── available_properties_screen.dart  # Liste des biens à louer
│   │   └── guest_properties_screen.dart      # Vue publique
│   ├── widgets/                    # Widgets réutilisables (Charts, Cards...)
│   ├── app.dart                    # Application Root
│   └── main.dart                   # Point d'entrée
├── test/                           # Tests unitaires & widgets
├── pubspec.yaml                    # Dépendances
└── README.md                       # Documentation Mobile
```

---

## 🚀 Installation & Démarrage

### Prérequis
- Flutter SDK installé et configuré
- Émulateur Android/iOS ou appareil physique
- Backend API lancé (voir [Backend README](../backend/README.md))

### Configuration API

Le fichier `lib/core/constants.dart` contient les URLs de l'API.
L'application détecte automatiquement la plateforme :
- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator**: `http://localhost:5000/api`
- **Web**: `http://localhost:5000/api` (ou URL distante)

### Lancer l'application

```bash
# Récupérer les dépendances
flutter pub get

# Lancer sur l'appareil connecté
flutter run
```

---

## 🔄 Flux de Location ("Happy Path")

1.  **Invité** : Ouvre l'application, voit les "Biens Disponibles".
2.  **Inscription** : Crée un compte "Tenant".
3.  **Connexion** : Accède au Dashboard (vide pour l'instant).
4.  **Recherche** : Va sur l'onglet "Louer".
5.  **Demande** : Choisit un bien, clique sur "Louer ce bien".
6.  **Signature** : Une modale affiche les détails du contrat. Le locataire clique sur "Accepter & Signer".
7.  **Succès** : Le contrat passe en `active`, le bien en `rented`. Le Dashboard se met à jour avec les infos du nouveau logement.

---

## 🧪 Tests

```bash
# Lancer les tests
flutter test

# Générer un rapport de couverture
flutter test --coverage
```

---

## 🐛 Problèmes Connus & Améliorations Futures

- **Notifications Push** : Pas encore implémentées pour les rappels de loyer.
- **Mode Sombre** : Prévu pour v2.0.
- **Chat** : Communication directe avec le propriétaire prévue.

---

**Version** : 1.2.0  
**Dernière mise à jour** : Février 2026