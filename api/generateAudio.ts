// api/generateAudio.ts
import { GoogleGenAI, Modality } from '@google/genai';

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
        const { prompt, selectedVoice, speakingRate } = body;

        for (const key of apiKeys) {
            console.log(`Audio: Essai avec la clé se terminant par ...${key?.slice(-4)}`);
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ parts: [{ text: prompt }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            // FIX: The 'speakingRate' property belongs to 'voiceConfig', not 'prebuiltVoiceConfig'.
                            voiceConfig: { 
                                prebuiltVoiceConfig: { 
                                    voiceName: selectedVoice,
                                },
                                speakingRate: speakingRate
                            },
                        },
                    },
                });

                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    console.log(`Audio: Succès avec la clé ...${key?.slice(-4)}`);
                    return new Response(JSON.stringify({ base64Audio }), { status: 200 });
                }
                // Si pas d'audio, on considère que c'est un échec silencieux et on essaie la suivante
                 console.log(`Audio: Pas de données audio reçues pour la clé ...${key?.slice(-4)}`);
                 continue;

            } catch (error: any) {
                if (error.message && (error.message.includes('quota') || error.message.includes('Quota'))) {
                    console.log(`Audio: Clé ...${key?.slice(-4)} a atteint son quota. Essai de la suivante.`);
                    continue;
                }
                throw error;
            }
        }
         return new Response(JSON.stringify({ error: 'Toutes les clés API ont atteint leur quota.' }), { status: 429 });
    } catch (error: any) {
        console.error("Erreur dans l'API Route Audio:", error);
        return new Response(JSON.stringify({ error: error.message || 'Une erreur inconnue est survenue' }), { status: 500 });
    }
}