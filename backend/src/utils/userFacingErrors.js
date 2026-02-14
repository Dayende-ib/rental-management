function toStringSafe(value) {
    return String(value || '').trim();
}

function translateErrorMessage(rawMessage, statusCode) {
    const message = toStringSafe(rawMessage);
    const lower = message.toLowerCase();

    if (!message) {
        return fallbackByStatus(statusCode);
    }

    const replacements = [
        {
            test: () => lower.includes('unauthorized') && lower.includes('no token'),
            value: "Votre session n'a pas ete detectee. Connectez-vous puis reessayez.",
        },
        {
            test: () => lower.includes('unauthorized') && lower.includes('invalid token'),
            value: "Votre session a expire ou est invalide. Reconnectez-vous pour continuer.",
        },
        {
            test: () => lower.includes('unauthorized') && lower.includes('no user'),
            value: "Session utilisateur introuvable. Veuillez vous reconnecter.",
        },
        {
            test: () => lower.includes('forbidden: this action requires one of the following roles'),
            value: "Vous n'avez pas les permissions necessaires pour cette action. Utilisez un compte autorise.",
        },
        {
            test: () => lower === 'forbidden',
            value: "Action refusee: vous n'avez pas les droits necessaires.",
        },
        {
            test: () => lower.includes('tenant profile not found'),
            value: "Profil locataire introuvable. Completez votre profil puis reessayez.",
        },
        {
            test: () => lower.includes('property not found'),
            value: "Bien immobilier introuvable. Rafraichissez la liste puis reessayez.",
        },
        {
            test: () => lower.includes('contract not found'),
            value: "Contrat introuvable. Verifiez l'element selectionne puis reessayez.",
        },
        {
            test: () => lower.includes('payment not found'),
            value: "Paiement introuvable. Rafraichissez l'ecran puis reessayez.",
        },
        {
            test: () => lower.includes('maintenance request not found'),
            value: "Demande de maintenance introuvable. Rafraichissez la page puis reessayez.",
        },
        {
            test: () => lower.includes('notification not found'),
            value: "Notification introuvable. Rafraichissez la page puis reessayez.",
        },
        {
            test: () => lower.includes('missing file upload'),
            value: "Aucun fichier recu. Ajoutez une image de preuve puis reessayez.",
        },
        {
            test: () => lower.includes('only pdf files are allowed'),
            value: "Seuls les fichiers PDF sont autorises.",
        },
        {
            test: () => lower.includes('contract template is missing for this property'),
            value: "Le modele de contrat de ce bien est indisponible. Contactez le bailleur.",
        },
        {
            test: () => lower.includes('contract template not found for this property'),
            value: "Le modele de contrat n'a pas ete trouve pour ce bien.",
        },
        {
            test: () => lower.includes('signed contract document not found'),
            value: "Le contrat signe n'est pas encore disponible.",
        },
        {
            test: () => lower.includes('tenant signed document is required before approval'),
            value: "Le locataire doit d'abord envoyer le contrat signe avant validation.",
        },
        {
            test: () => lower.includes('unsupported mimetype'),
            value: "Format de fichier non supporte. Utilisez une image PNG, JPG ou WEBP.",
        },
        {
            test: () => lower.includes('invalid email address'),
            value: "Adresse e-mail invalide. Verifiez le format puis reessayez.",
        },
        {
            test: () => lower.includes('password must be at least 6 characters'),
            value: "Mot de passe trop court. Utilisez au moins 6 caracteres.",
        },
        {
            test: () => lower.includes('password is required'),
            value: "Mot de passe requis. Renseignez votre mot de passe puis reessayez.",
        },
        {
            test: () => lower.includes('full name is required'),
            value: "Nom complet requis. Renseignez votre nom et prenom.",
        },
        {
            test: () => lower.includes('invalid role for public registration'),
            value: "Role invalide pour l'inscription publique. Roles autorises: locataire, gestionnaire ou admin.",
        },
        {
            test: () => lower.includes('user already registered') || lower.includes('already registered'),
            value: "Ce compte existe deja. Connectez-vous ou utilisez une autre adresse e-mail.",
        },
        {
            test: () => lower.includes('profile not found'),
            value: "Profil utilisateur introuvable. Reconnectez-vous ou contactez le support.",
        },
        {
            test: () => lower.includes('refresh token is required'),
            value: "Session expirée. Reconnectez-vous pour continuer.",
        },
        {
            test: () => lower.includes('no active contract found for this tenant'),
            value: "Aucun contrat actif trouve. Vous devez avoir un contrat actif pour creer un paiement.",
        },
        {
            test: () => lower.includes('contract_id is required'),
            value: "Le contrat cible est requis pour effectuer ce paiement.",
        },
        {
            test: () => lower.includes('no active contract found for this tenant and property'),
            value: "Aucun contrat actif trouve pour ce bien.",
        },
        {
            test: () => lower.includes('months_count must be between 1 and 24'),
            value: "Le nombre de mois doit etre compris entre 1 et 24.",
        },
        {
            test: () => lower.includes('payment_date is required and must be a valid date'),
            value: "Date de paiement invalide.",
        },
        {
            test: () => lower.includes('amount_paid is required and must be greater than 0'),
            value: "Montant verse invalide. Saisissez un montant superieur a zero.",
        },
        {
            test: () => lower.includes('due_date is required and must be a valid date'),
            value: "Date d'echeance invalide. Selectionnez une date valide puis reessayez.",
        },
        {
            test: () => lower.includes('manual payment can only be created for the next month'),
            value: "Paiement manuel autorise uniquement pour le mois prochain.",
        },
        {
            test: () => lower.includes('invalid payment amount'),
            value: "Montant invalide. Saisissez un montant strictement superieur a zero.",
        },
        {
            test: () => lower.includes('a payment already exists for this contract and month'),
            value: "Un paiement existe deja pour ce contrat ce mois-ci. Verifiez la liste avant de recommencer.",
        },
        {
            test: () => lower.includes('permission denied by rls'),
            value: "Action bloquee par les permissions de securite. Contactez un administrateur.",
        },
        {
            test: () => lower.includes('this property is not available for rent'),
            value: "Ce bien n'est plus disponible a la location. Choisissez un autre bien.",
        },
        {
            test: () => lower.includes('property is not available'),
            value: "Ce bien est indisponible actuellement. Choisissez un bien disponible.",
        },
        {
            test: () => lower.includes('contract is not in draft state'),
            value: "Ce contrat ne peut plus etre signe car il n'est plus a l'etat brouillon.",
        },
        {
            test: () => lower.includes('only pending contracts can be approved'),
            value: "Ce contrat ne peut pas etre valide dans son etat actuel.",
        },
        {
            test: () => lower.includes('payment is allowed only for properties with a validated contract'),
            value: "Le paiement est autorise uniquement pour un contrat valide.",
        },
        {
            test: () => lower.includes('validated payments cannot be deleted'),
            value: "Un paiement deja valide ne peut pas etre supprime.",
        },
        {
            test: () => lower.includes('only active contracts can be terminated'),
            value: "Seuls les contrats actifs peuvent etre resilies.",
        },
        {
            test: () => lower.includes('tenants can only cancel their own requests'),
            value: "Vous pouvez annuler uniquement vos propres demandes de maintenance.",
        },
        {
            test: () => lower.includes('email, password and full_name are required'),
            value: "Champs obligatoires manquants: e-mail, mot de passe et nom complet.",
        },
        {
            test: () => lower.includes('invalid role'),
            value: "Role invalide. Utilisez tenant, manager ou admin selon votre besoin.",
        },
        {
            test: () => lower.includes('supabase_service_role_key is required'),
            value: "Configuration serveur incomplete. Contactez l'administrateur technique.",
        },
        {
            test: () => lower.includes('failed to create auth user'),
            value: "Creation du compte impossible pour le moment. Reessayez dans quelques instants.",
        },
        {
            test: () => lower.includes('request failed with status'),
            value: fallbackByStatus(statusCode),
        },
    ];

    for (const rule of replacements) {
        if (rule.test()) {
            return rule.value;
        }
    }

    return message;
}

function fallbackByStatus(statusCode) {
    switch (Number(statusCode)) {
        case 400:
            return "Demande invalide. Verifiez les informations saisies puis reessayez.";
        case 401:
            return "Session expirée ou invalide. Reconnectez-vous pour continuer.";
        case 403:
            return "Action non autorisee pour votre compte.";
        case 404:
            return "Element introuvable. Rafraichissez la page puis reessayez.";
        case 409:
            return "Conflit detecte. Cette operation existe deja ou n'est plus possible.";
        case 422:
            return "Donnees invalides. Corrigez les champs en erreur puis reessayez.";
        case 429:
            return "Trop de tentatives. Patientez un instant avant de recommencer.";
        case 500:
            return "Erreur serveur temporaire. Reessayez dans quelques instants.";
        default:
            return "Une erreur est survenue. Veuillez reessayer.";
    }
}

module.exports = {
    translateErrorMessage,
    fallbackByStatus,
};
