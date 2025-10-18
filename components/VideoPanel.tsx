import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64 } from '../utils/helpers';

// Fix: Define an interface for window.aistudio to resolve the TypeScript error
// and provide strong typing.
interface AIStudio {
    openSelectKey: () => Promise<void>;
    hasSelectedApiKey: () => Promise<boolean>;
}

declare global {
    interface Window {
        aistudio?: AIStudio;
    }
}

// Ce panneau appelle maintenant /api/generateVideo
const VideoPanel = () => {
    const [prompt, setPrompt] = useState('Un chaton mignon jouant avec une pelote de laine, style cinématique.');
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [resolution, setResolution] = useState('720p');
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [baseImage, setBaseImage] = useState<{ file: File | null, base64: string | null, url: string | null }>({ file: null, base64: null, url: null });

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        // Fix: Check for API key using window.aistudio as per guidelines, with a fallback to env vars.
        const checkApiKey = async () => {
            if (window.aistudio?.hasSelectedApiKey) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (isMounted.current) {
                    setApiKeySelected(hasKey);
                }
            } else if (import.meta.env.VITE_GEMINI_API_KEY) {
                setApiKeySelected(true);
            }
        };
        checkApiKey();
        return () => { isMounted.current = false; };
    }, []);

    const handleSelectKey = async () => {
         if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
             setApiKeySelected(true); // On assume que la sélection a réussi
        } else {
            setError("Cette fonctionnalité est optimisée pour AI Studio. Assurez-vous que votre VITE_GEMINI_API_KEY est configurée.");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const base64 = await fileToBase64(file);
            setBaseImage({ file, base64, url: URL.createObjectURL(file) });
        }
    };
    const removeBaseImage = () => setBaseImage({ file: null, base64: null, url: null });

    const handleGenerateVideo = async () => {
        if (!prompt.trim() && !baseImage.file) {
            setError('Veuillez entrer une invite ou importer une image de départ.');
            return;
        }

        const frontendApiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!frontendApiKey) {
            setError('Clé API Frontend non configurée. Veuillez définir VITE_GEMINI_API_KEY.');
            return;
        }
        
        setLoading(true);
        setLoadingMessage('Initialisation de la génération...');
        setError(null);
        setVideoUrl(null);
        
        try {
            const requestPayload: any = {
                model: 'veo-3.1-fast-generate-preview',
                prompt,
                config: { numberOfVideos: 1, resolution, aspectRatio }
            };

            if (baseImage.base64 && baseImage.file) {
                requestPayload.image = { imageBytes: baseImage.base64, mimeType: baseImage.file.type };
            }

            // Étape 1: On appelle notre propre API pour démarrer la génération avec rotation de clé
            const apiResponse = await fetch('/api/generateVideo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestPayload })
            });

            const data = await apiResponse.json();
            if (!apiResponse.ok) throw new Error(data.error || "Erreur lors du démarrage de la génération.");

            let operation = data.operation;
            setLoadingMessage('La vidéo est en cours de traitement. Cela peut prendre quelques minutes...');
            
            // Étape 2: On continue de "poller" avec la clé du frontend
            const ai = new GoogleGenAI({ apiKey: frontendApiKey });

            while (operation && !operation.done && isMounted.current) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (!isMounted.current) return;

            if (operation?.done) {
                const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                if (downloadLink) {
                    setLoadingMessage('Téléchargement de la vidéo finalisée...');
                    const videoResponse = await fetch(`${downloadLink}&key=${frontendApiKey}`);
                    if (!videoResponse.ok) throw new Error(`Erreur lors du téléchargement: ${videoResponse.statusText}`);
                    
                    const videoBlob = await videoResponse.blob();
                    const url = URL.createObjectURL(videoBlob);
                    setVideoUrl(url);
                } else {
                    throw new Error("L'opération s'est terminée mais aucun lien de téléchargement n'a été trouvé.");
                }
            } else if (operation?.error) {
                 throw new Error(`L'opération a échoué: ${operation.error.message}`);
            }

        } catch (e: any) {
            console.error(e);
            // Fix: Handle API key errors specifically, prompting the user to re-select a key.
            const errorMessage = (e as Error).message || "Une erreur est survenue.";
            if (errorMessage.includes("Requested entity was not found")) {
                setError("La clé API sélectionnée semble invalide. Veuillez en sélectionner une nouvelle.");
                setApiKeySelected(false);
            } else {
                setError(errorMessage);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setLoadingMessage('');
            }
        }
    };
    
    if (!apiKeySelected) {
        return (
            <div className="panel-container panel-centered">
                <div className="api-key-prompt">
                    <h2>Clé API requise pour la génération de vidéo</h2>
                    <p>La génération de vidéo avec Veo nécessite une clé API d'un projet avec la facturation activée. Veuillez configurer votre `VITE_GEMINI_API_KEY`.</p>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="link">En savoir plus sur la facturation.</a>
                    {/* On garde le bouton pour la compatibilité avec AI Studio */}
                    <button className="button button-primary" onClick={handleSelectKey}>Sélectionner une clé API (AI Studio)</button>
                    {error && <div className="alert-error mt-4">{error}</div>}
                </div>
            </div>
        )
    }

    return (
        <div className="panel-container">
            <h1 className="panel-title">Génération de Vidéo (Veo)</h1>

            <div className="image-dropper" onClick={() => document.getElementById('video-image-upload')?.click()} >
                <input type="file" id="video-image-upload" accept="image/*" hidden onChange={handleImageUpload} />
                {baseImage.url ? (
                    <div className="image-preview-container">
                        <img src={baseImage.url} className="image-preview" alt="Image de départ"/>
                        <button onClick={(e) => { e.stopPropagation(); removeBaseImage(); }} className="button-remove-image">&times;</button>
                    </div>
                ) : (
                    <span>(Optionnel) Glissez-déposez ou cliquez pour importer une image de départ.</span>
                )}
            </div>
            
            <textarea className="textarea" rows={3} placeholder="Ex: Un astronaute surfant sur une vague cosmique..." value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
            
            <div className="grid-2-cols">
                <div className="form-group"><label className="form-label">Format</label><select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="select"><option value="16:9">16:9 (Paysage)</option><option value="9:16">9:16 (Portrait)</option></select></div>
                <div className="form-group"><label className="form-label">Résolution</label><select value={resolution} onChange={(e) => setResolution(e.target.value)} className="select"><option value="720p">720p</option><option value="1080p">1080p</option></select></div>
            </div>

            <button className="button button-primary" onClick={handleGenerateVideo} disabled={loading}>{loading ? "Génération en cours..." : "Générer la vidéo"}</button>
            
            {loading && <div className="loading-indicator">{loadingMessage}</div>}
            {error && <div className="alert-error">{error}</div>}
            
            {videoUrl && (
                <div className="video-player-container">
                    <h3>Résultat :</h3>
                    <video controls muted autoPlay loop src={videoUrl} className="generated-video">
                        Votre navigateur ne supporte pas la balise vidéo.
                    </video>
                </div>
            )}
        </div>
    );
};

export default VideoPanel;