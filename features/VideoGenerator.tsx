import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import Spinner from '../components/Spinner';
import { Download, UploadCloud, Video, XCircle } from '../components/Icons';
import { toBase64 } from '../utils/fileUtils';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

type AspectRatio = "16:9" | "9:16";
type Resolution = "720p" | "1080p";

const loadingMessages = [
    "Initialisation du moteur de rendu vidéo...",
    "Analyse de votre requête...",
    "Composition des premières images...",
    "Génération des scènes intermédiaires...",
    "Application des effets visuels...",
    "Rendu de la piste audio...",
    "Finalisation de la vidéo, presque terminé...",
];

const VideoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [resolution, setResolution] = useState<Resolution>('720p');
    const [loadingState, setLoadingState] = useState<{ active: boolean; message: string }>({ active: false, message: '' });
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const removeImage = () => {
        setImage(null);
        if(imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    }

    const handleGenerateVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!prompt.trim() && !image) || loadingState.active) return;

        setError(null);
        setGeneratedVideoUrl(null);
        setLoadingState({ active: true, message: loadingMessages[0] });

        try {
            let imagePayload;
            if (image) {
                const base64Data = await toBase64(image);
                imagePayload = { imageBytes: base64Data, mimeType: image.type };
            }

            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt || 'Animer cette image.',
                image: imagePayload,
                config: {
                  numberOfVideos: 1,
                  resolution,
                  aspectRatio,
                }
            });

            let messageIndex = 1;
            const messageInterval = setInterval(() => {
                setLoadingState(prev => ({ ...prev, message: loadingMessages[messageIndex % loadingMessages.length] }));
                messageIndex++;
            }, 7000);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }
            
            clearInterval(messageInterval);

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                // The API key must be appended to the download URI
                const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const videoBlob = await videoResponse.blob();
                const videoUrl = URL.createObjectURL(videoBlob);
                setGeneratedVideoUrl(videoUrl);
            } else {
                throw new Error("Le lien de la vidéo n'a pas été trouvé dans la réponse.");
            }

        } catch (err) {
            console.error(err);
            setError("La génération de la vidéo a échoué. Veuillez réessayer.");
        } finally {
            setLoadingState({ active: false, message: '' });
        }
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">Générateur de Vidéos</h1>
                <p className="text-brand-text-secondary mt-2">Créez une vidéo à partir d'un texte ou d'une image.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <form onSubmit={handleGenerateVideo} className="space-y-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Un plan-séquence d'une ville futuriste la nuit..."
                        rows={3}
                        className="w-full bg-brand-surface border border-gray-700/50 rounded-lg p-3 focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all"
                        disabled={loadingState.active}
                    />
                    
                    <div>
                        <label htmlFor="image-upload" className="block text-sm font-medium text-brand-text-secondary mb-1">Image de départ (optionnel)</label>
                        {!imagePreview ? (
                            <label className="cursor-pointer w-full flex flex-col items-center justify-center p-6 bg-brand-surface border-2 border-dashed border-gray-700/50 rounded-lg hover:bg-brand-surface/50 transition-colors">
                                <UploadCloud className="h-8 w-8 text-brand-text-secondary mb-2" />
                                <span className="text-brand-text-secondary">Cliquer pour téléverser</span>
                                <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={loadingState.active}/>
                            </label>
                        ) : (
                            <div className="relative">
                                <img src={imagePreview} alt="Aperçu" className="w-full rounded-lg max-h-48 object-cover" />
                                <button onClick={removeImage} type="button" className="absolute top-2 right-2 p-1 bg-gray-900/70 rounded-full text-white hover:bg-red-500 transition-colors">
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="aspectRatioVideo" className="block text-sm font-medium text-brand-text-secondary mb-1">Format</label>
                            <select id="aspectRatioVideo" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-brand-surface border border-gray-700/50 rounded-lg p-3 focus:ring-2 focus:ring-brand-primary focus:outline-none" disabled={loadingState.active}>
                                <option value="16:9">Paysage (16:9)</option>
                                <option value="9:16">Portrait (9:16)</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="resolution" className="block text-sm font-medium text-brand-text-secondary mb-1">Résolution</label>
                            <select id="resolution" value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} className="w-full bg-brand-surface border border-gray-700/50 rounded-lg p-3 focus:ring-2 focus:ring-brand-primary focus:outline-none" disabled={loadingState.active}>
                                <option value="720p">720p (Rapide)</option>
                                <option value="1080p">1080p (Haute qualité)</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={loadingState.active || (!prompt.trim() && !image)} className="w-full flex justify-center items-center gap-2 bg-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-80 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {loadingState.active ? <><Spinner /> Génération...</> : 'Générer la vidéo'}
                    </button>
                </form>

                <div className="bg-brand-surface/50 rounded-lg border border-dashed border-gray-700/50 flex items-center justify-center p-4 min-h-[300px] lg:min-h-0">
                    {loadingState.active && (
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-4 text-brand-text-primary font-semibold">Création de votre vidéo...</p>
                            <p className="mt-1 text-brand-text-secondary text-sm">{loadingState.message}</p>
                        </div>
                    )}
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    {generatedVideoUrl && (
                        <div className="relative group w-full">
                            <video src={generatedVideoUrl} controls autoPlay loop className="w-full rounded-lg shadow-2xl" />
                             <a 
                                href={generatedVideoUrl} 
                                download={`video-${Date.now()}.mp4`}
                                className="absolute bottom-4 right-4 bg-gray-900/70 text-white p-3 rounded-full hover:bg-brand-primary transition-all opacity-0 group-hover:opacity-100"
                                aria-label="Télécharger la vidéo"
                            >
                               <Download className="h-5 w-5" />
                            </a>
                        </div>
                    )}
                     {!loadingState.active && !generatedVideoUrl && !error && (
                        <div className="text-center text-brand-text-secondary">
                            <Video className="h-16 w-16 mx-auto mb-4" />
                            <p>Votre vidéo générée apparaîtra ici.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoGenerator;
