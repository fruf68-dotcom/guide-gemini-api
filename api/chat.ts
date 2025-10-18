// api/chat.ts
import { GoogleGenAI, Chat, Content } from '@google/genai';

interface ChatApiRequest {
  history: Content[];
  message: string;
}

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
        const body: ChatApiRequest = await request.json();
        
        for (const key of apiKeys) {
            console.log(`Chat: Essai avec la clé se terminant par ...${key?.slice(-4)}`);
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const chat: Chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    history: body.history,
                });
                const result = await chat.sendMessage({ message: body.message });

                if (result.text) {
                     console.log(`Chat: Succès avec la clé ...${key?.slice(-4)}`);
                    return new Response(JSON.stringify({ text: result.text }), { status: 200 });
                }
                console.log(`Chat: Pas de texte reçu pour la clé ...${key?.slice(-4)}`);
                continue;

            } catch (error: any) {
                 if (error.message && (error.message.includes('quota') || error.message.includes('Quota'))) {
                    console.log(`Chat: Clé ...${key?.slice(-4)} a atteint son quota. Essai de la suivante.`);
                    continue;
                }
                throw error;
            }
        }
        return new Response(JSON.stringify({ error: 'Toutes les clés API ont atteint leur quota.' }), { status: 429 });
    } catch (error: any) {
        console.error("Erreur dans l'API Route Chat:", error);
        return new Response(JSON.stringify({ error: error.message || 'Une erreur inconnue est survenue' }), { status: 500 });
    }
}
