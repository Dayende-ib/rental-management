# 🏠 Rental Management - Mobile App

Application mobile Flutter pour la gestion locative côté locataire.

## 📱 Fonctionnalités

### ✅ Actuellement Disponibles
- 🔐 Authentification (Login/Register)
- 🏠 Dashboard avec informations du bien
- 💰 Gestion des paiements
  - Visualisation des paiements
  - Upload de preuves de paiement
  - Statuts de validation
- 🔧 Demandes de maintenance
  - Création de demandes
  - Suivi des statuts
- 👤 Profil utilisateur
- 📱 Mode invité pour voir les biens disponibles

### 🚀 Nouvelles Fonctionnalités (v1.1)
- ⚡ **State Management avec Riverpod**
- 📴 **Support Offline Complet**
- 🔄 **Navigation Optimisée**
- 📊 **Statistiques en Temps Réel**

---

## 🛠️ Technologies

### Core
- **Flutter** 3.10.7
- **Dart** SDK ^3.10.7

### State Management
- **flutter_riverpod** ^2.6.1

### Networking
- **http** ^1.1.0
- **http_parser** ^4.0.2

### Storage
- **shared_preferences** ^2.2.2 (tokens, préférences)
- **sqflite** ^2.4.2 (base de données locale)
- **path_provider** ^2.1.5

### Connectivity
- **connectivity_plus** ^5.0.2

### UI/UX
- **google_fonts** ^8.0.1 (Poppins)
- **image_picker** ^1.0.7

### Utilities
- **intl** ^0.19.0 (formatage dates/nombres)

---

## 📁 Structure du Projet

```
mobile/
├── lib/
│   ├── auth/                       # Authentification
│   │   └── auth_service.dart
│   ├── core/                       # Core de l'application
│   │   ├── api_client.dart
│   │   ├── constants.dart
│   │   ├── models.dart
│   │   ├── storage.dart
│   │   ├── database/               # ✨ NOUVEAU
│   │   │   └── database_helper.dart
│   │   ├── providers/              # ✨ NOUVEAU
│   │   │   ├── payment_providers.dart
│   │   │   ├── maintenance_providers.dart
│   │   │   └── dashboard_providers.dart
│   │   └── services/               # ✨ NOUVEAU
│   │       └── connectivity_service.dart
│   ├── home/                       # Dashboard
│   │   └── dashboard_service.dart
│   ├── maintenance/                # Maintenance
│   │   └── maintenance_service.dart
│   ├── navigation/                 # ✨ NOUVEAU
│   │   └── main_navigation_screen.dart
│   ├── payments/                   # Paiements
│   │   └── payment_service.dart
│   ├── screens/                    # Écrans
│   │   ├── login_screen.dart
│   │   ├── register_screen.dart
│   │   ├── home_screen.dart
│   │   ├── payments_screen.dart
│   │   ├── maintenance_list_screen.dart
│   │   ├── create_maintenance_screen.dart
│   │   ├── profile_screen.dart
│   │   ├── guest_properties_screen.dart
│   │   └── available_properties_screen.dart
│   ├── app.dart
│   └── main.dart
├── test/                           # Tests (à venir)
├── pubspec.yaml
├── IMPROVEMENTS.md                 # ✨ Liste complète des améliorations
├── CHANGELOG_IMPROVEMENTS.md       # ✨ Améliorations implémentées
└── MIGRATION_GUIDE.md              # ✨ Guide de migration
```

---

## 🚀 Installation

### Prérequis
- Flutter SDK 3.10.7 ou supérieur
- Dart SDK ^3.10.7
- Android Studio / Xcode (pour émulateurs)
- VS Code avec extensions Flutter (recommandé)

### Étapes

1. **Cloner le repository**
```bash
git clone <repository-url>
cd rental-management/mobile
```

2. **Installer les dépendances**
```bash
flutter pub get
```

3. **Configurer l'API**

Créer un fichier `.env` (optionnel) :
```env
API_BASE_URL=http://your-api-url.com/api
```

Ou modifier directement dans `lib/core/constants.dart` :
```dart
static const String _defaultAndroidBaseUrl = 'http://10.0.2.2:5000/api';
static const String _defaultIosBaseUrl = 'http://localhost:5000/api';
```

4. **Lancer l'application**
```bash
# Android
flutter run

# iOS
flutter run -d ios

# Web
flutter run -d chrome
```

---

## 📖 Documentation

### Guides Disponibles

1. **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Liste complète de toutes les améliorations à faire
   - 30+ améliorations listées
   - Organisées par priorité
   - Timeline suggéré
   - Métriques de succès

2. **[CHANGELOG_IMPROVEMENTS.md](CHANGELOG_IMPROVEMENTS.md)** - Améliorations déjà implémentées
   - State Management avec Riverpod
   - Support Offline
   - Navigation refactorisée
   - Impact des améliorations

3. **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Guide de migration vers Riverpod
   - Exemples avant/après
   - Checklist complète
   - Tests à effectuer

---

## 🎨 Design System

### Palette de Couleurs

```dart
// Couleurs principales
Accent: #0F795C (Émeraude)
Accent Soft: #2FA67D
Accent Light: #6BD3B1

// Couleurs de fond
Background: #F5F7FA (Gris clair)
Surface: #FFFFFF (Blanc)

// Texte
Text Primary: #1F1F1F (Noir)
Text Secondary: #8E95A3 (Gris)

// Bordures
Border: #DCE2EA (Gris clair)
```

### Typographie
- **Font Family** : Poppins (Google Fonts)
- **Headline Small** : 22px, Weight 600
- **Title Medium** : 16px, Weight 600
- **Body Medium** : 14px, Weight 400

### Espacements
- **Default Padding** : 16px
- **Small Padding** : 8px
- **Large Padding** : 24px
- **Card Radius** : 16px

---

## 🔄 Architecture

### State Management (Riverpod)

L'application utilise **Riverpod** pour la gestion d'état :

```dart
// Exemple d'utilisation
class PaymentsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentsAsync = ref.watch(paymentsProvider);
    final stats = ref.watch(paymentStatsProvider);

    return paymentsAsync.when(
      data: (payments) => ListView.builder(...),
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => ErrorWidget(error),
    );
  }
}
```

### Support Offline

L'application fonctionne **sans connexion internet** grâce à :
- Base de données SQLite locale
- Synchronisation automatique
- Fallback vers le cache en cas d'erreur

```dart
// Logique automatique dans les providers
if (isConnected) {
  // Charger depuis l'API
  final data = await apiClient.getData();
  // Sauvegarder en local
  await dbHelper.insertData(data);
  return data;
} else {
  // Charger depuis le cache
  return await dbHelper.getData();
}
```

### Navigation

Navigation optimisée avec **IndexedStack** :
- Préservation de l'état des écrans
- Pas de rechargement lors du changement d'onglet
- Navigation instantanée

---

## 🧪 Tests

### Lancer les tests
```bash
# Tests unitaires
flutter test

# Tests d'intégration
flutter test integration_test/

# Coverage
flutter test --coverage
```

### Tests à implémenter
- [ ] Tests unitaires des services
- [ ] Tests des providers
- [ ] Tests des widgets
- [ ] Tests d'intégration
- [ ] Tests E2E

---

## 📊 Performance

### Métriques Actuelles
- **Temps de démarrage** : ~2s
- **Temps de navigation** : ~50ms (avec IndexedStack)
- **Taille de l'APK** : ~30MB

### Objectifs
- [ ] Temps de démarrage < 1.5s
- [ ] FPS constant à 60
- [ ] Taille de l'APK < 25MB

---

## 🐛 Problèmes Connus

### En cours de résolution
1. **Migration vers Riverpod** : Les écrans doivent être migrés (voir MIGRATION_GUIDE.md)
2. **Models incomplets** : Certains champs manquent dans les models
3. **Validation** : Pas de validation email avec regex

### Workarounds
- Utiliser les anciens écrans en attendant la migration
- Les champs manquants sont gérés avec des valeurs par défaut

---

## 🤝 Contribution

### Workflow
1. Créer une branche : `git checkout -b feature/ma-fonctionnalite`
2. Commit : `git commit -m "feat: ajout de ma fonctionnalité"`
3. Push : `git push origin feature/ma-fonctionnalite`
4. Créer une Pull Request

### Conventions de Commit
- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatage
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Tâches diverses

---

## 📝 Roadmap

### Version 1.1 (En cours)
- [x] State Management (Riverpod)
- [x] Support Offline
- [x] Navigation optimisée
- [ ] Migration des écrans
- [ ] Validation améliorée

### Version 1.2 (Prochaine)
- [ ] Écran de détails maintenance
- [ ] Filtres et recherche
- [ ] Dark mode
- [ ] Animations

### Version 2.0 (Future)
- [ ] Notifications push
- [ ] Chat en temps réel
- [ ] Paiements en ligne
- [ ] Biométrie

---

## 📞 Support

Pour toute question ou problème :
- **Email** : contact@rental-management.com
- **Issues** : [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation** : Voir les fichiers IMPROVEMENTS.md et MIGRATION_GUIDE.md

---

## 📄 Licence

MIT License - voir le fichier [LICENSE](../LICENSE)

---

## 👥 Équipe

- **Développement** : Équipe Rental Management
- **Design** : Équipe Rental Management
- **Backend** : Équipe Rental Management

---

**Version** : 1.1.0  
**Dernière mise à jour** : 10 février 2026