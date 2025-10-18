import React, { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from '../utils/helpers';

const ImagePanel = () => {
    const [prompt, setPrompt] = useState('');
    const [baseImage, setBaseImage] = useState<{ file: File | null, base64: string | null, url: string | null }>({ file: null, base64: null, url: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [numImages, setNumImages] = useState(1);
    const isEditing = !!baseImage.file;
    const placeholder = isEditing ? "Ex: Changer l'arrière-plan en plage..." : "Ex: Un robot futuriste dans une ville néon...";

    const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); 
        e.stopPropagation();
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

    const handleGenerate = async () => {
        if (!prompt) { 
            setError('Veuillez entrer une invite.'); 
            return; 
        }
        setLoading(true); 
        setError(null); 
        setGeneratedImages([]);
        
        try {
            const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            if (isEditing && baseImage.base64 && baseImage.file) {
                const response = await currentAi.models.generateContent({ 
                    model: 'gemini-2.5-flash-image', 
                    contents: { 
                        parts: [
                            { inlineData: { data: baseImage.base64, mimeType: baseImage.file.type } }, 
                            { text: prompt }
                        ] 
                    }, 
                    config: { responseModalities: [Modality.IMAGE] } 
                });
                
                const imageData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
                if (imageData) {
                    setGeneratedImages([`data:image/png;base64,${imageData}`]);
                } else {
                    throw new Error("Aucune image n'a été retournée.");
                }
            } else {
                const response = await currentAi.models.generateImages({ 
                    model: 'imagen-4.0-generate-001', 
                    prompt: prompt, 
                    config: { 
                        numberOfImages: numImages, 
                        outputMimeType: 'image/jpeg', 
                        aspectRatio: aspectRatio 
                    } 
                });
                
                // CORRECTION : Vérification que les données existent
                if (response.generatedImages && response.generatedImages.length > 0) {
                    const images = response.generatedImages.map(img => {
                        if (img.image?.imageBytes) {
                            return `data:image/jpeg;base64,${img.image.imageBytes}`;
                        }
                        return '';
                    }).filter(img => img !== '');
                    
                    setGeneratedImages(images);
                } else {
                    throw new Error("Aucune image n'a été générée.");
                }
            }
        } catch(e) { 
            setError((e as Error).message || "Une erreur est survenue."); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="panel-container">
            <h1 className="panel-title">Création & Édition d'Image</h1>
            
            <div 
                className="image-dropper" 
                onDrop={handleImageDrop} 
                onDragOver={(e) => e.preventDefault()} 
                onClick={() => document.getElementById('image-upload')?.click()}
            >
                <input 
                    type="file" 
                    id="image-upload" 
                    accept="image/*" 
                    hidden 
                    onChange={handleImageUpload} 
                />
                {baseImage.url ? (
                    <div className="image-preview-container">
                        <img src={baseImage.url} className="image-preview" alt="Aperçu"/>
                        <button 
                            onClick={(e) => { e.stopPropagation(); removeBaseImage(); }} 
                            className="button-remove-image"
                        >
                            &times;
                        </button>
                    </div>
                ) : (
                    <span>Glissez-déposez une image ici ou cliquez pour en importer une.</span>
                )}
            </div>
            
            <textarea 
                className="textarea" 
                rows={3} 
                placeholder={placeholder} 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)}
            />
            
            {!isEditing && (
                <div className="grid-2-cols">
                    <div className="form-group">
                        <label className="form-label">Format d'image</label>
                        <select 
                            value={aspectRatio} 
                            onChange={(e) => setAspectRatio(e.target.value)} 
                            className="select"
                        >
                            <option value="1:1">1:1 (Carré)</option>
                            <option value="16:9">16:9 (Paysage)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nombre d'images</label>
                        <input 
                            type="number" 
                            min={1} 
                            max={4} 
                            value={numImages} 
                            onChange={(e) => setNumImages(Number(e.target.value) || 1)} 
                            className="input"
                        />
                    </div>
                </div>
            )}
            
            <button 
                className="button button-primary" 
                onClick={handleGenerate} 
                disabled={loading}
            >
                {loading ? 'Génération...' : (isEditing ? 'Éditer l\'image' : 'Générer l\'image')}
            </button>
            
            {error && <div className="alert-error">{error}</div>}
            
            {generatedImages.length > 0 && (
                <div className="image-results-grid">
                    {generatedImages.map((imgSrc, index) => (
                        <img key={index} src={imgSrc} alt={`Generated ${index + 1}`}/>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImagePanel;