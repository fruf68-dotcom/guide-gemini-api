// utils/apiKeyManager.ts

/**
 * Ce module gère la rotation automatique des clés API Gemini pour gérer les limites de quota.
 * Il lit les clés à partir de variables d'environnement distinctes : CLE_1, CLE_2, CLE_3.
 */

// Lire les clés API à partir des variables d'environnement distinctes
const apiKeys: string[] = [
    process.env.CLE_1,
    process.env.CLE_2,
    process.env.CLE_3
].filter((key): key is string => typeof key === 'string' && key.trim() !== '');


if (apiKeys.length === 0) {
    console.error("Aucune clé API Gemini n'a été trouvée. Assurez-vous que les variables d'environnement CLE_1, CLE_2, etc. sont définies dans votre environnement (ex: Vercel).");
}

let currentKeyIndex = 0;

/**
 * Obtient la clé API actuellement active.
 * @returns La clé API sous forme de chaîne, ou undefined si aucune n'est disponible.
 */
const getApiKey = (): string | undefined => {
    return apiKeys[currentKeyIndex];
};

/**
 * Passe à la clé API suivante dans la liste.
 */
const rotateApiKey = (): void => {
    if (apiKeys.length > 0) {
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    }
};

/**
 * Encapsule un appel API avec une logique de rotation de clé.
 * En cas d'erreur de quota, il réessaie automatiquement avec la clé suivante.
 * @param apiCall La fonction effectuant l'appel API, qui reçoit la clé en paramètre.
 * @returns La promesse du résultat de l'appel API.
 * @throws Une erreur si toutes les clés API échouent à cause de quotas ou d'autres erreurs.
 */
export const withApiKeyRotation = async <T>(apiCall: (apiKey: string) => Promise<T>): Promise<T> => {
    if (apiKeys.length === 0) {
        throw new Error("Aucune clé API Gemini n'est configurée. Veuillez définir les variables d'environnement CLE_1, CLE_2 et/ou CLE_3.");
    }

    let lastError: any = null;
    const initialKeyIndex = currentKeyIndex;

    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = getApiKey();
        if (!apiKey) {
            rotateApiKey(); // Devrait être redondant avec le filtre initial, mais par sécurité
            continue;
        }

        try {
            return await apiCall(apiKey);
        } catch (error: any) {
            lastError = error;
            const errorMessage = (error.message || '').toLowerCase();
            // Détecte les erreurs courantes liées à la clé (quota, invalidité, etc.)
            if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource exhausted') || errorMessage.includes('api key not valid')) {
                console.warn(`La clé API #${currentKeyIndex + 1} a échoué (raison: ${errorMessage}). Passage à la clé suivante.`);
                rotateApiKey();
                // Si nous avons essayé toutes les clés et sommes revenus au début, arrêtons la boucle.
                if (currentKeyIndex === initialKeyIndex) break;
            } else {
                // Pour les autres erreurs, échouer rapidement sans changer de clé.
                throw error;
            }
        }
    }

    // Si toutes les clés ont échoué
    console.error("Toutes les clés API ont échoué.", lastError);
    throw new Error("Toutes les clés API disponibles ont atteint leur limite de quota ou sont invalides. Veuillez réessayer plus tard ou vérifier vos clés.");
};
