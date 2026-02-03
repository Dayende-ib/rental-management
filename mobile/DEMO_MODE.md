# MODE DÉMO - GUIDE D'UTILISATION

## Identifiants de connexion (n'importe lesquels fonctionnent)

**Option 1 (recommandée) :**
- Email : `locataire@example.com`
- Mot de passe : `motdepasse123`

**Option 2 (tous identifiants non vides) :**
- Email : n'importe quel email valide
- Mot de passe : n'importe quel mot de passe (6+ caractères)

## Données fictives incluses

### Tableau de bord
- **Locataire** : Jean Dupont
- **Adresse** : 123 Rue de la Paix, 75001 Paris
- **Loyer mensuel** : 1200,00 €
- **Paiements** : Historique de 12 mois (janvier à décembre 2023)
- **Maintenance** : 2 demandes en attente

### Paiements
- 12 mois d'historique complets
- Tous les paiements sont marqués comme "payés"
- Dates réalistes de paiement

### Maintenance
- 4 demandes de maintenance :
  1. Fuite d'eau (en attente)
  2. Prise électrique (en cours)
  3. Ampoule grillée (terminé)
  4. Nettoyage gouttières (terminé)

## Fonctionnalités de démonstration

✅ **Connexion/déconnexion** : Fonctionne avec n'importe quels identifiants
✅ **Navigation** : Tous les écrans accessibles via la barre du bas
✅ **Pull-to-refresh** : Sur tous les écrans de liste
✅ **Simulation de paiement** : Boutons fonctionnels avec délai réaliste
✅ **Création de maintenance** : Formulaire validé et fonctionnel
✅ **Délais simulés** : Petits délais pour simuler le réseau

## Points spéciaux du mode démo

- **Pas de backend requis** : Toutes les données sont générées localement
- **Stockage persistant** : Le token de connexion est sauvegardé
- **Interface claire** : Indicateur "DÉMO" visible dans l'interface
- **Comportement réaliste** : Délais et animations similaires à une vraie app

## Pour passer à un vrai backend

1. Remplacer les services par des appels API réels
2. Mettre à jour les URLs dans `lib/core/constants.dart`
3. Implémenter l'authentification JWT réelle
4. Connecter aux endpoints de l'API

L'application est maintenant entièrement fonctionnelle en mode démo !