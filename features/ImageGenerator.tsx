import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import Spinner from '../components/Spinner';
import { Download, Image } from '../components/Icons';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateImage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/png',
                  aspectRatio: aspectRatio,
                },
            });
    
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
            setGeneratedImage(imageUrl);

        } catch (err) {
            console.error(err);
            setError("La génération d'image a échoué. Le contenu pourrait être non sécurisé ou une erreur s'est produite. Veuillez réessayer.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">Générateur d'Images</h1>
                <p className="text-brand-text-secondary mt-2">Décrivez l'image que vous souhaitez créer.</p>
            </div>

            <form onSubmit={handleGenerateImage} className="w-full space-y-4 mb-8">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Un astronaute surfant sur une vague cosmique, style synthwave..."
                    rows={3}
                    className="w-full bg-brand-surface border border-gray-700/50 rounded-lg p-3 focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all"
                    disabled={isLoading}
                />
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label htmlFor="aspectRatio" className="block text-sm font-medium text-brand-text-secondary mb-1">Format</label>
                        <select
                            id="aspectRatio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                            className="w-full bg-brand-surface border border-gray-700/50 rounded-lg p-3 focus:ring-2 focus:ring-brand-primary focus:outline-none"
                            disabled={isLoading}
                        >
                            <option value="1:1">Carré (1:1)</option>
                            <option value="16:9">Paysage (16:9)</option>
                            <option value="9:16">Portrait (9:16)</option>
                            <option value="4:3">Paysage (4:3)</option>
                            <option value="3:4">Portrait (3:4)</option>
                        </select>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading || !prompt.trim()} 
                        className="self-end w-full sm:w-auto flex justify-center items-center gap-2 bg-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-80 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <><Spinner /> Génération...</> : 'Générer'}
                    </button>
                </div>
            </form>

            <div className="flex-1 bg-brand-surface/50 rounded-lg border border-dashed border-gray-700/50 flex items-center justify-center p-4">
                {isLoading && (
                    <div className="text-center">
                        <Spinner />
                        <p className="mt-2 text-brand-text-secondary">Création de votre image en cours...</p>
                    </div>
                )}
                {error && <p className="text-red-400 text-center">{error}</p>}
                {generatedImage && (
                    <div className="relative group">
                        <img src={generatedImage} alt={prompt} className="max-h-[60vh] rounded-lg shadow-2xl" />
                        <a 
                            href={generatedImage} 
                            download={`image-${Date.now()}.png`}
                            className="absolute bottom-4 right-4 bg-gray-900/70 text-white p-3 rounded-full hover:bg-brand-primary transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Télécharger l'image"
                        >
                           <Download className="h-5 w-5" />
                        </a>
                    </div>
                )}
                 {!isLoading && !generatedImage && !error && (
                    <div className="text-center text-brand-text-secondary">
                        <Image className="h-16 w-16 mx-auto mb-4" />
                        <p>Votre image générée apparaîtra ici.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageGenerator;
