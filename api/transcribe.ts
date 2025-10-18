// api/transcribe.ts
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
        const { audioBase64, audioMimeType, prompt } = body;

        for (const key of apiKeys) {
            console.log(`Transcription: Essai avec la clé ...${key?.slice(-4)}`);
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                 const audioPart = {
                    inlineData: {
                        data: audioBase64,
                        mimeType: audioMimeType,
                    },
                };

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: { parts: [{ text: prompt }, audioPart] },
                });

                const transcription = response.text;
                if (transcription) {
                     console.log(`Transcription: Succès avec la clé ...${key?.slice(-4)}`);
                    return new Response(JSON.stringify({ transcription }), { status: 200 });
                }
                console.log(`Transcription: Pas de texte reçu pour la clé ...${key?.slice(-4)}`);
                continue;

            } catch (error: any) {
                 if (error.message && (error.message.includes('quota') || error.message.includes('Quota'))) {
                    console.log(`Transcription: Clé ...${key?.slice(-4)} a atteint son quota. Essai de la suivante.`);
                    continue;
                }
                throw error;
            }
        }
        return new Response(JSON.stringify({ error: 'Toutes les clés API ont atteint leur quota.' }), { status: 429 });
    } catch (error: any) {
        console.error("Erreur dans l'API Route Transcription:", error);
        return new Response(JSON.stringify({ error: error.message || 'Une erreur inconnue est survenue' }), { status: 500 });
    }
}
