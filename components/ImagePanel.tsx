import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { fileToBase64 } from '../utils/helpers';
import { withApiKeyRotation } from '../utils/apiKeyManager';

// Interface pour suivre l'état de chaque image individuellement
interface ImageResult {
    id: number;
    src: string | null;
    status: 'loading' | 'success' | 'error';
    error?: string;
}

const ImagePanel = () => {
    const [mode, setMode] = useState<'generate' | 'edit'>('generate');
    const [prompt, setPrompt] = useState('');
    const [baseImage, setBaseImage] = useState<{ file: File | null, base64: string | null, url: string | null }>({ file: null, base64: null, url: null });
    const [loading, setLoading] = useState(false);
    const [progressText, setProgressText] = useState('');
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [imageResults, setImageResults] = useState<ImageResult[]>([]);
    const [numImages, setNumImages] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    
    const placeholder = mode === 'edit' ? "Ex: Changer l'arrière-plan en plage..." : "Ex: Un robot futuriste dans une ville néon...";

    const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const base64 = await fileToBase64(file);
            setBaseImage({ file, base64, url: URL.createObjectURL(file) });
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

    const handleDownload = (dataUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const dataURLtoFile = (dataurl: string, filename: string): File | null => {
        const arr = dataurl.split(',');
        if (arr.length < 2) { return null; }
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) { return null; }
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: mime });
    }

    const handleUseAsBase = (dataUrl: string) => {
        const file = dataURLtoFile(dataUrl, 'generated-image.jpeg');
        if (file) {
            const base64 = dataUrl.split(',')[1];
            setBaseImage({ file, base64, url: dataUrl });
            setMode('edit');
            setPrompt(''); // Clear prompt for a new editing instruction
        } else {
            setGlobalError("Impossible de traiter l'image pour l'édition.");
        }
    };

    const handleGenerate = async () => {
        if (!prompt) { setGlobalError('Veuillez entrer une invite.'); return; }
        if (mode === 'edit' && !baseImage.file) { setGlobalError('Veuillez importer une image à éditer.'); return; }

        setLoading(true);
        setGlobalError(null);
        setImageResults([]);
        
        try {
            if (mode === 'generate') {
                setProgressText(numImages > 1 ? `Génération de ${numImages} images...` : 'Génération en cours...');
                setImageResults(Array.from({ length: numImages }, (_, i) => ({ id: i, src: null, status: 'loading' })));

                const response = await withApiKeyRotation(apiKey => {
                    const ai = new GoogleGenAI({ apiKey });
                    return ai.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: prompt,
                        config: {
                          numberOfImages: numImages,
                          outputMimeType: 'image/jpeg',
                          aspectRatio: aspectRatio,
                        },
                    });
                });

                if (!response.generatedImages || response.generatedImages.length === 0) {
                    throw new Error("L'API n'a retourné aucune image.");
                }

                const successResults: ImageResult[] = response.generatedImages.map((img, i) => {
                    const imageBytes = img?.image?.imageBytes;
                    if (imageBytes) {
                        return {
                            id: i,
                            src: `data:image/jpeg;base64,${imageBytes}`,
                            status: 'success' as const,
                        };
                    }
                    return {
                        id: i,
                        src: null,
                        status: 'error' as const,
                        error: "Données d'image manquantes dans la réponse.",
                    };
                });
                setImageResults(successResults);

            } else { // mode === 'edit'
                setProgressText("Édition en cours...");
                setImageResults([{ id: 0, src: null, status: 'loading' }]);

                const response = await withApiKeyRotation(apiKey => {
                    const ai = new GoogleGenAI({ apiKey });
                    const parts = [
                        { inlineData: { data: baseImage.base64!, mimeType: baseImage.file!.type } },
                        { text: prompt }
                    ];
                    return ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: parts },
                        config: { responseModalities: [Modality.IMAGE] }
                    });
                });

                const imageData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
                if (!imageData) throw new Error("L'API n'a retourné aucune image.");
                
                const imageResult = `data:image/png;base64,${imageData}`;
                setImageResults([{ id: 0, src: imageResult, status: 'success' }]);
            }
        } catch (e: any) {
            const error = e as Error;
            setGlobalError(error.message || "Une erreur est survenue lors de la génération.");
            setImageResults([]);
        }
        
        setLoading(false);
        setProgressText('');
    };
    
    const getButtonText = () => {
        if (loading) return progressText || "Chargement...";
        if (mode === 'edit') return "Éditer l'image";
        return `Générer ${numImages > 1 ? numImages + ' images' : "l'image"}`;
    };

    return (
        <div className="panel-container">
            <h1 className="panel-title">Création & Édition d'Image</h1>

            <div className="mode-switcher">
                <button className={`mode-button ${mode === 'generate' ? 'active' : ''}`} onClick={() => setMode('generate')}>Générer (Texte vers Image)</button>
                <button className={`mode-button ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')}>Éditer une Image</button>
            </div>

            {mode === 'edit' && (
                 <div className="image-dropper" onDrop={handleImageDrop} onDragOver={(e) => e.preventDefault()} onClick={() => document.getElementById('image-upload')?.click()} >
                    <input type="file" id="image-upload" accept="image/*" hidden onChange={handleImageUpload} />
                    {baseImage.url ? (<div className="image-preview-container"><img src={baseImage.url} className="image-preview" alt="Aperçu"/><button onClick={(e) => { e.stopPropagation(); removeBaseImage(); }} className="button-remove-image">&times;</button></div>) : (<span>Glissez-déposez une image ici ou cliquez pour en importer une.</span>)}
                </div>
            )}
           
            <textarea className="textarea" rows={3} placeholder={placeholder} value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
            
            {mode === 'generate' && (
                 <div className="grid-2-cols">
                    <div className="form-group">
                        <label className="form-label">Nombre d'images</label>
                        <input type="number" min={1} max={8} value={numImages} onChange={(e) => setNumImages(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} className="input"/>
                    </div>
                     <div className="form-group">
                        <label htmlFor="aspect-ratio-select" className="form-label">Format d'image</label>
                        <select id="aspect-ratio-select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="select">
                            <option value="1:1">1:1 (Carré)</option>
                            <option value="16:9">16:9 (Paysage)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                            <option value="4:3">4:3 (Classique)</option>
                            <option value="3:4">3:4 (Vertical)</option>
                        </select>
                    </div>
                </div>
            )}

            <button className="button button-primary" onClick={handleGenerate} disabled={loading}>{getButtonText()}</button>
            {globalError && <div className="alert-error">{globalError}</div>}
            
            {imageResults.length > 0 && (
                <div className="image-results-grid">
                    {imageResults.map((result) => (
                        <div key={result.id} className={`image-result-item ${result.src ? 'has-image' : ''}`} onClick={() => result.src && setLightboxImage(result.src)}>
                            {result.status === 'loading' && <div className="skeleton-loader"></div>}
                            {result.status === 'success' && result.src && (
                                <>
                                    <img src={result.src} alt={`Image générée ${result.id + 1}`} />
                                    <div className="image-actions">
                                        <button onClick={(e) => { e.stopPropagation(); handleDownload(result.src!, `image-generee-${result.id}.jpeg`); }} title="Enregistrer l'image">Enregistrer</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleUseAsBase(result.src!);}} title="Utiliser cette image comme base pour une nouvelle édition">Modifier</button>
                                    </div>
                                </>
                            )}
                            {result.status === 'error' && (
                                <div className="error-placeholder">
                                    <p>Échec</p>
                                    {result.error && <span>{result.error}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {lightboxImage && (
                <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <img src={lightboxImage} alt="Aperçu en grand" className="lightbox-image" />
                        <button onClick={() => setLightboxImage(null)} className="lightbox-close-button" title="Fermer">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImagePanel;