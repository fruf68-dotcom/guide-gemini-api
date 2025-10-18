import React, { useState, useEffect } from 'react';
import { GoogleGenAI, VideoGenerationReferenceType } from "@google/genai";
import { fileToBase64 } from '../utils/helpers';

const VideoPanel = () => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [lastOperation, setLastOperation] = useState<any>(null);
    const [preset, setPreset] = useState('');
    const [presetDescription, setPresetDescription] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [resolution, setResolution] = useState('720p');
    const [startImage, setStartImage] = useState<{ file: File | null, base64: string | null }>({ file: null, base64: null });
    const [endImage, setEndImage] = useState<{ file: File | null, base64: string | null }>({ file: null, base64: null });
    const [refImages, setRefImages] = useState<{ file: File, base64: string }[]>([]);

    const videoPresets: { [key: string]: { prompt: string, aspectRatio: string, resolution: string, description: string } } = {
        '': { prompt: '', aspectRatio: '16:9', resolution: '720p', description: '' },
        'short-clip': { prompt: 'Un time-lapse rapide de nuages se déplaçant dans le ciel.', aspectRatio: '16:9', resolution: '720p', description: 'Idéal pour les réseaux sociaux. Génère une courte vidéo dynamique.' },
        'cinematic-scene': { prompt: 'Une vue panoramique lente d\'une chaîne de montagnes au lever du soleil.', aspectRatio: '16:9', resolution: '1080p', description: 'Pour un rendu de haute qualité avec des mouvements de caméra lents.' },
        'animation-loop': { prompt: 'Une animation en boucle de formes géométriques abstraites.', aspectRatio: '1:1', resolution: '720p', description: 'Crée une séquence conçue pour se répéter de manière transparente.' },
    };

    useEffect(() => {
        if (refImages.length > 0) {
            setAspectRatio('16:9');
            setResolution('720p');
        }
    }, [refImages]);

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedPreset = e.target.value;
        const settings = videoPresets[selectedPreset];
        setPreset(selectedPreset);
        setPrompt(settings.prompt);
        setAspectRatio(settings.aspectRatio);
        setResolution(settings.resolution);
        setPresetDescription(settings.description);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, setImageState: React.Dispatch<React.SetStateAction<{ file: File | null, base64: string | null }>>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            setImageState({ file, base64 });
        }
    };

    const handleRefImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).slice(0, 3 - refImages.length);
        if (files.length > 0) {
            // Fix: Explicitly type 'file' as File to prevent type inference issues.
            const newImages = await Promise.all(files.map(async (file: File) => ({
                file,
                base64: await fileToBase64(file)
            })));
            setRefImages(prev => [...prev, ...newImages]);
        }
    };

    const removeRefImage = (index: number) => {
        setRefImages(prev => prev.filter((_, i) => i !== index));
    };

    const generateVideo = async (extendVideo: any = null) => {
        if (!prompt && !extendVideo && refImages.length === 0) {
            setError('Veuillez entrer une invite.');
            return;
        }
        setLoading(true);
        setError(null);
        setVideoUrl(null);
        try {
            // @ts-ignore
            if (!await window.aistudio.hasSelectedApiKey()) {
                // @ts-ignore
                await window.aistudio.openSelectKey();
            }
            const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const isRefVideo = refImages.length > 0;
            const modelName = isRefVideo ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
            let payload: any = { model: modelName, prompt, config: { numberOfVideos: 1, resolution: resolution, aspectRatio: aspectRatio } };
            if (extendVideo) {
                payload.video = extendVideo;
            } else if (isRefVideo) {
                payload.config.referenceImages = refImages.map(img => ({ image: { imageBytes: img.base64, mimeType: img.file.type }, referenceType: VideoGenerationReferenceType.ASSET }));
            } else {
                if (startImage.base64 && startImage.file) payload.image = { imageBytes: startImage.base64, mimeType: startImage.file.type };
                if (endImage.base64 && endImage.file) payload.config.lastFrame = { imageBytes: endImage.base64, mimeType: endImage.file.type };
            }
            let operation = await currentAi.models.generateVideos(payload);
            setLastOperation(operation);
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await currentAi.operations.getVideosOperation({ operation });
                setLastOperation(operation);
            }
            if (operation.error) throw new Error(String(operation.error.message));
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                setVideoUrl(URL.createObjectURL(blob));
            } else {
                throw new Error("La génération de la vidéo a échoué.");
            }
        } catch (e: any) {
            const message = (e as Error).message || 'Une erreur inconnue est survenue.';
            setError(message.includes("was not found") ? "Clé API non valide. Veuillez en sélectionner une." : message);
            setLastOperation(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel-container">
             <h1 className="panel-title">Création Vidéo</h1>
            <textarea className="textarea" rows={3} placeholder="Ex: Un hologramme néon d'un chat conduisant à toute vitesse..." value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
            <div className="form-group">
                <label htmlFor="preset-select" className="form-label">Préréglages</label>
                <select id="preset-select" value={preset} onChange={handlePresetChange} className="select"><option value="">-- Choisir un préréglage --</option><option value="short-clip">Clip court</option><option value="cinematic-scene">Scène cinématique</option><option value="animation-loop">Boucle d'animation</option></select>
                {presetDescription && <p className="form-help-text">{presetDescription}</p>}
            </div>
            <details className="advanced-options">
                <summary>Options avancées</summary>
                <div className="advanced-options-content">
                    <div className="grid-2-cols">
                        <div className="form-group"><label className="form-label">Image de début (Facultatif)</label><input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setStartImage)} className="input-file"/></div>
                        <div className="form-group"><label className="form-label">Image de fin (Facultatif)</label><input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setEndImage)} className="input-file"/></div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Images de Référence (jusqu'à 3)</label>
                        <input type="file" accept="image/*" multiple onChange={handleRefImagesChange} disabled={refImages.length >= 3} className="input-file"/>
                        {refImages.length > 0 && <p className="form-warning-text">L'utilisation d'images de référence verrouille le format sur 16:9 et la résolution sur 720p.</p>}
                        <div className="ref-images-preview">{refImages.map((img, index) => (<div key={index} className="ref-image-item"><img src={URL.createObjectURL(img.file)} alt={`Ref ${index + 1}`}/><button onClick={() => removeRefImage(index)}>&times;</button></div>))}</div>
                    </div>
                    <div className="grid-2-cols">
                        <div className="form-group"><label className="form-label">Format d'image</label><select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={refImages.length > 0} className="select"><option value="16:9">16:9 (Paysage)</option><option value="9:16">9:16 (Portrait)</option><option value="1:1">1:1 (Carré)</option></select></div>
                        <div className="form-group"><label className="form-label">Résolution</label><select value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={refImages.length > 0} className="select"><option value="720p">720p</option><option value="1080p">1080p</option></select></div>
                    </div>
                </div>
            </details>
            <button className="button button-primary" onClick={() => generateVideo()} disabled={loading}>{loading ? 'Génération en cours...' : 'Générer la vidéo'}</button>
            {error && <div className="alert-error">{error}</div>}
            {loading && !videoUrl && <div className="loading-text">Création de la vidéo... Cela peut prendre plusieurs minutes.</div>}
            {videoUrl && (<div className="video-result"><video src={videoUrl} controls></video><div className="button-group"><a href={videoUrl} download="generated_video.mp4" className="button button-success">Télécharger</a><button onClick={() => generateVideo(lastOperation.response?.generatedVideos?.[0]?.video)} disabled={loading || !lastOperation} title="Prolonge la vidéo générée." className="button button-secondary">Étendre la vidéo</button></div></div>)}
        </div>
    );
};

export default VideoPanel;