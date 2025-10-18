// ==================================================================
// FICHIER OBSOLÈTE - Ce fichier n'est plus utilisé par l'application.
// ==================================================================
//
// La logique de génération d'images a été déplacée directement dans 
// le composant ImagePanel.tsx (côté client).
//
// Cette modification a été faite pour améliorer la fiabilité et la 
// performance, en utilisant la même méthode d'appel à l'API que 
// les autres panneaux (Chat, Vidéo, Audio).
//

export default async function handler(request: Request) {
    return new Response(JSON.stringify({ 
        error: "Cette route API est obsolète et n'est plus fonctionnelle." 
    }), { 
        status: 410, // 410 Gone
        headers: { 'Content-Type': 'application/json' }
    });
}
