// api/generateVideo.ts
import { GoogleGenAI } from '@google/genai';

const apiKeys = [
  process.env.CLE_1,
  process.env.CLE_2,
  process.env.CLE_3,
].filter(key => !!key);

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405 });
    }
    if (apiKeys.length === 0) {
        return new Response(JSON.stringify({ error: 'Aucune clé API configurée sur le serveur.' }), { status: 500 });
    }

    try {
        const body = await request.json();
        const { requestPayload } = body;

        for (const key of apiKeys) {
            console.log(`Vidéo: Essai avec la clé se terminant par ...${key?.slice(-4)}`);
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const operation = await ai.models.generateVideos(requestPayload);
                console.log(`Vidéo: Succès initial avec la clé ...${key?.slice(-4)}`);
                return new Response(JSON.stringify({ operation }), { status: 200 });
            } catch (error: any) {
                if (error.message && (error.message.includes('quota') || error.message.includes('Quota'))) {
                    console.log(`Vidéo: Clé ...${key?.slice(-4)} a atteint son quota. Essai de la suivante.`);
                    continue;
                }
                // Pour la vidéo, une erreur "API key not valid" peut aussi signifier que la clé n'est pas activée pour Veo
                if(error.message && error.message.includes('API key not valid')){
                     console.log(`Vidéo: Clé ...${key?.slice(-4)} n'est pas valide pour Veo. Essai de la suivante.`);
                     continue;
                }
                throw error;
            }
        }
        return new Response(JSON.stringify({ error: 'Toutes les clés API ont atteint leur quota ou ne sont pas valides pour Veo.' }), { status: 429 });
    } catch (error: any) {
        console.error("Erreur dans l'API Route Video:", error);
        return new Response(JSON.stringify({ error: error.message || 'Une erreur inconnue est survenue' }), { status: 500 });
    }
}
