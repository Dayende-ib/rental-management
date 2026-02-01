# Guide d'utilisation de l'application Rental Management

## Prérequis

- Flutter SDK installé
- Un éditeur de code (VS Code, Android Studio)
- Un navigateur web (Chrome recommandé pour le développement)

## Installation

1. Vérifier que Flutter est installé :
```bash
flutter doctor
```

2. Installer les dépendances :
```bash
flutter pub get
```

3. Lancer l'application en mode développement :
```bash
flutter run -d chrome
```

## Utilisation de l'application

### 1. Écran de Connexion

**Identifiants de test :**
- Email : `locataire@example.com`
- Mot de passe : `motdepasse123`

**Fonctionnalités :**
- Validation des champs (email valide, mot de passe > 6 caractères)
- Gestion des erreurs de connexion
- Stockage sécurisé du token JWT

### 2. Tableau de Bord

**Informations affichées :**
- Nom du locataire
- Adresse du logement
- Loyer mensuel
- Prochains paiements (3 premiers)
- Nombre de demandes de maintenance en attente

**Actions rapides :**
- Accès aux paiements
- Accès à la maintenance

### 3. Gestion des Paiements

**Fonctionnalités :**
- Liste complète des paiements
- Tri par date décroissante
- Statut de chaque paiement (payé/en attente)
- Simulation de paiement (bouton pour les paiements en attente)
- Confirmation avant paiement

### 4. Maintenance

**Liste des demandes :**
- Description du problème
- Statut (en attente/en cours/terminé)
- Dates de création et mise à jour

**Création de demande :**
- Formulaire de description détaillée
- Validation du contenu (> 10 caractères)
- Conseils pour une bonne description

### 5. Profil

**Informations affichées :**
- Photo de profil (avatar par défaut)
- Nom complet
- Email et téléphone
- Informations sur l'application

**Déconnexion :**
- Confirmation avant déconnexion
- Nettoyage des données locales
- Retour à l'écran de connexion

## Navigation

L'application utilise une barre de navigation inférieure avec 4 onglets :
1. **Accueil** - Tableau de bord
2. **Paiements** - Gestion des paiements
3. **Maintenance** - Demandes de maintenance
4. **Profil** - Informations personnelles

## Gestion des erreurs

L'application gère plusieurs types d'erreurs :
- Erreurs réseau (pas de connexion internet)
- Timeout des requêtes
- Erreurs d'authentification
- Données invalides de l'API

## Développement

### Structure du code

**Services (lib/core/) :**
- `api_client.dart` : Gestion des requêtes HTTP
- `storage.dart` : Stockage local (tokens, préférences)
- `models.dart` : Modèles de données
- `constants.dart` : Constantes de l'application

**Fonctionnalités :**
- Chaque fonctionnalité a son propre service
- Les services communiquent avec l'API
- Gestion centralisée des erreurs

**Écrans :**
- Un fichier par écran
- Utilisation de StatefulWidget pour la gestion d'état
- Widgets réutilisables organisés par fonctionnalité

### Bonnes pratiques

1. **Commentaires** : Code commenté en français
2. **Architecture** : Séparation claire des responsabilités
3. **Gestion d'erreurs** : try/catch autour des appels API
4. **Validation** : Validation des formulaires côté client
5. **Performance** : Utilisation de FutureBuilder pour le chargement asynchrone

## Personnalisation

### Modifier l'API
Dans `lib/core/constants.dart` :
```dart
static const String baseUrl = 'https://votre-api.com/api';
```

### Modifier les couleurs
Dans `lib/app.dart` :
```dart
theme: ThemeData(
  primarySwatch: Colors.votreCouleur,
  useMaterial3: true,
),
```

### Ajouter de nouvelles fonctionnalités
1. Créer un nouveau service dans le dossier approprié
2. Ajouter les modèles nécessaires dans `core/models.dart`
3. Créer l'écran correspondant dans `screens/`
4. Ajouter la route dans `app.dart`

## Dépannage

**Problèmes courants :**

1. **L'application ne se lance pas**
   - Vérifier `flutter doctor`
   - S'assurer que les dépendances sont installées

2. **Erreurs d'API**
   - Vérifier l'URL de base dans `constants.dart`
   - S'assurer que l'API est accessible

3. **Problèmes d'affichage**
   - Utiliser `flutter clean` puis `flutter pub get`
   - Redémarrer l'application

## Extensions possibles

- Intégration de Stripe pour les paiements réels
- Notifications push pour les mises à jour
- Chat en temps réel avec le propriétaire
- Scanner de documents
- Calendrier des visites techniques
- Gestion des colocataires