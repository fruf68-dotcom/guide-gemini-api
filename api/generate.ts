// Ce fichier est une "API Route" de Vercel. Il s'exécute sur le serveur.
// Il ne sera jamais envoyé au navigateur de l'utilisateur.

import { GoogleGenAI } from '@google/genai';

// La requête envoyée par notre application (le frontend)
interface ApiRequest {
  prompt: string;
  numImages: number;
  aspectRatio: string;
  mode: 'generate' | 'edit';
  baseImage?: { base64: string; mimeType: string; };
}

// On récupère toutes les clés API stockées dans Vercel
// Elles ne doivent PAS avoir le préfixe VITE_
const apiKeys = [
  process.env.CLE_1,
  process.env.CLE_2,
  process.env.CLE_3,
  // Ajoutez autant de clés que vous avez configurées dans Vercel
].filter(key => !!key); // On ne garde que les clés qui sont définies

// C'est le "handler", la fonction principale que Vercel va exécuter
export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405 });
  }

  if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune clé API configurée sur le serveur.' }), { status: 500 });
  }

  try {
    const body: ApiRequest = await request.json();

    // On va essayer chaque clé, l'une après l'autre
    for (const key of apiKeys) {
      console.log(`Essai avec la clé se terminant par ...${key?.slice(-4)}`);
      try {
        const ai = new GoogleGenAI({ apiKey: key });

        if (body.mode === 'edit' && body.baseImage) {
            // Logique pour l'édition d'image
            const imagePart = { inlineData: { data: body.baseImage.base64, mimeType: body.baseImage.mimeType } };
            const textPart = { text: body.prompt };
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: ["IMAGE"] }
            });
            const imageData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (imageData) {
                console.log(`Succès avec la clé se terminant par ...${key?.slice(-4)}`);
                // Succès ! On renvoie l'image et on s'arrête là.
                return new Response(JSON.stringify({ images: [`data:image/png;base64,${imageData}`] }), { status: 200 });
            }
        } else {
            // Logique pour la génération d'image
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: body.prompt,
                config: {
                    numberOfImages: body.numImages,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: body.aspectRatio,
                }
            });

            if (response.generatedImages) {
                const images = response.generatedImages
                    .map(img => img.image?.imageBytes ? `data:image/jpeg;base64,${img.image.imageBytes}` : null)
                    .filter((item): item is string => item !== null);
                
                console.log(`Succès avec la clé se terminant par ...${key?.slice(-4)}`);
                // Succès ! On renvoie les images et on s'arrête là.
                return new Response(JSON.stringify({ images }), { status: 200 });
            }
        }

      } catch (error: any) {
        // Si l'erreur est une erreur de quota, on l'ignore et on passe à la clé suivante
        if (error.message && (error.message.includes('quota') || error.message.includes('Quota'))) {
          console.log(`Clé API finissant par ...${key?.slice(-4)} a atteint son quota. Essai de la suivante.`);
          continue; // Passe à l'itération suivante de la boucle for
        }
        // Si c'est une autre erreur, on la renvoie immédiatement
        throw error;
      }
    }

    // Si on arrive ici, c'est que toutes les clés ont échoué à cause du quota
    return new Response(JSON.stringify({ error: 'Toutes les clés API ont atteint leur quota. Veuillez réessayer plus tard.' }), { status: 429 });

  } catch (error: any) {
    console.error("Erreur dans l'API Route:", error);
    return new Response(JSON.stringify({ error: error.message || 'Une erreur inconnue est survenue' }), { status: 500 });
  }
}
