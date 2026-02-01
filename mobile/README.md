# Rental Management Mobile App

Application mobile Flutter pour la gestion locative (côté locataire).

## Fonctionnalités

### Écrans principaux

1. **Écran de Connexion**
   - Authentification par email et mot de passe
   - Stockage sécurisé du token JWT
   - Validation des champs de saisie

2. **Tableau de Bord**
   - Informations du locataire
   - Détails du logement loué
   - Loyer mensuel
   - Statut du contrat
   - Prochains paiements
   - Récapitulatif des demandes de maintenance

3. **Gestion des Paiements**
   - Liste des paiements de loyer
   - Historique des paiements
   - Simulation de paiement
   - Statut (payé/en attente)

4. **Maintenance**
   - Liste des demandes de maintenance
   - Création de nouvelles demandes
   - Suivi du statut (en attente/en cours/terminé)

5. **Profil**
   - Informations personnelles
   - Options de déconnexion
   - Informations sur l'application

## Architecture

### Structure des dossiers

```
lib/
├── core/                 # Services centraux
│   ├── api_client.dart   # Client HTTP
│   ├── constants.dart    # Constantes de l'application
│   ├── models.dart       # Modèles de données
│   └── storage.dart      # Gestion du stockage local
├── auth/                 # Authentification
│   └── auth_service.dart # Service d'authentification
├── home/                 # Tableau de bord
│   └── dashboard_service.dart
├── payments/             # Gestion des paiements
│   └── payment_service.dart
├── maintenance/          # Gestion de la maintenance
│   └── maintenance_service.dart
├── screens/              # Écrans de l'application
│   ├── login_screen.dart
│   ├── home_screen.dart
│   ├── payments_screen.dart
│   ├── maintenance_list_screen.dart
│   ├── create_maintenance_screen.dart
│   └── profile_screen.dart
├── widgets/              # Widgets réutilisables
├── app.dart              # Configuration de l'application
└── main.dart             # Point d'entrée
```

### Technologies utilisées

- **Flutter** (dernière version stable)
- **HTTP** pour les appels API
- **Shared Preferences** pour le stockage local
- **Material Design 3** pour l'interface

## Installation

1. Cloner le projet
2. Installer les dépendances :
```bash
flutter pub get
```

3. Lancer l'application :
```bash
flutter run
```

## Configuration de l'API

Les endpoints API sont configurés dans `lib/core/constants.dart` :

```dart
static const String baseUrl = 'https://api.rental-management.com/api';
static const String loginEndpoint = '/auth/login';
static const String tenantProfileEndpoint = '/tenants/me';
static const String paymentsEndpoint = '/payments';
static const String maintenanceEndpoint = '/maintenance';
```

## Points importants

### Sécurité
- Utilisation de JWT pour l'authentification
- Stockage sécurisé des tokens
- Headers d'authentification automatiques

### Gestion d'état
- Utilisation de `setState` et `FutureBuilder` (pas de state management complexe)
- Chargement asynchrone des données
- Gestion des erreurs réseau

### Interface utilisateur
- Design Material Design 3
- Navigation par barre de navigation inférieure
- Pull-to-refresh sur les listes
- Validation des formulaires

## Développement

### Bonnes pratiques suivies

- Code bien commenté en français
- Architecture MVC claire
- Gestion appropriée des erreurs
- Interface utilisateur intuitive
- Respect des conventions Flutter

### Extensions possibles

- Intégration de paiement réel
- Notifications push
- Upload de photos pour les demandes de maintenance
- Chat avec le propriétaire/syndic
- Calendrier des visites
- Documents et contrats numériques

## Auteur

Application développée comme projet académique de 1 semaine.

## License

MIT