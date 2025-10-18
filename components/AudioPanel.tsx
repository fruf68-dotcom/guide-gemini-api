import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { fileToBase64, decode, addWavHeader } from '../utils/helpers';

// Fix: Define AudioContext to handle browser differences and TypeScript typing issues.
// @ts-ignore
const AudioContext: any = window.AudioContext || window.webkitAudioContext;

// --- SVG Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" /></svg>;
const SpinnerIcon = () => <svg className="spinner" viewBox="0 0 50 50"><circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>;


// Liste complète des voix disponibles, groupées par genre et triées.
const allVoices = [
    // --- Voix Féminines ---
    { id: 'autonoe', name: 'Camille', gender: 'Féminin' },
    { id: 'Kore', name: 'Chloé', gender: 'Féminin' },
    { id: 'leda', name: 'Juliette', gender: 'Féminin' },
    { id: 'Zephyr', name: 'Léa', gender: 'Féminin' },
    { id: 'gacrux', name: 'Lucie', gender: 'Féminin' },
    { id: 'vindemiatrix', name: 'Olivia', gender: 'Féminin' },
    { id: 'erinome', name: 'Pauline', gender: 'Féminin' },
    { id: 'despina', name: 'Sophie', gender: 'Féminin' },
    // --- Voix Masculines ---
    { id: 'alnilam', name: 'Antoine', gender: 'Masculin' },
    { id: 'iapetus', name: 'Éliott', gender: 'Masculin' },
    { id: 'Umbriel', name: 'Hugo', gender: 'Masculin' },
    { id: 'sadachbia', name: 'Isaac', gender: 'Masculin' },
    { id: 'puck', name: 'Louis', gender: 'Masculin' },
    { id: 'rasalgethi', name: 'Marc', gender: 'Masculin' },
    { id: 'algenib', name: 'Mathieu', gender: 'Masculin' },
    { id: 'Charon', name: 'Thomas', gender: 'Masculin' },
];


const AudioPanel = () => {
    const [mode, setMode] = useState<'tts' | 'transcribe'>('tts');

    // --- TTS State ---
    const [ttsPrompt, setTtsPrompt] = useState('');
    const [ttsVoice, setTtsVoice] = useState(allVoices[0].id);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsError, setTtsError] = useState<string | null>(null);
    const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
    const [speakingRate, setSpeakingRate] = useState(1);
    const [previewLoadingVoice, setPreviewLoadingVoice] = useState<string | null>(null);

    // --- Transcription State ---
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [transcribing, setTranscribing] = useState(false);
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
    const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
    const [enableDiarization, setEnableDiarization] = useState(false);

     // Fermer la liste déroulante si on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectVoice = (voiceId: string) => {
        setTtsVoice(voiceId);
        setIsDropdownOpen(false);
    };

    const handlePreviewVoice = async (voiceId: string) => {
        if (previewLoadingVoice) return;
        setPreviewLoadingVoice(voiceId);
        setTtsError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: "Voici un aperçu de ma voix." }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const pcmData = decode(base64Audio);
                const wavData = addWavHeader(pcmData, 24000, 1, 16); // 24kHz, 1 channel, 16-bit
                // CORRECTION : utiliser wavData.buffer au lieu de wavData
                const audioBlob = new Blob([new Uint8Array(wavData.buffer)], { type: 'audio/wav' });
                const url = URL.createObjectURL(audioBlob);
                const audio = new Audio(url);
                audio.play();
                audio.onended = () => URL.revokeObjectURL(url);
            } else {
                throw new Error("Aperçu non disponible.");
            }
        } catch (e: any) {
            setTtsError(e.message || "Erreur lors de la pré-écoute.");
        } finally {
            setPreviewLoadingVoice(null);
        }
    };
    

    const handleGenerateTTS = async () => {
        if (!ttsPrompt) {
            setTtsError("Veuillez entrer un texte à vocaliser.");
            return;
        }
        setTtsLoading(true);
        setTtsError(null);
        setTtsAudioUrl(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: ttsPrompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: ttsVoice },
                        },
                        // Fix: Suppress TypeScript error for 'speakingRate', which is valid for the API but may not be in the SDK types.
                        // @ts-ignore
                        speakingRate: speakingRate,
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const pcmData = decode(base64Audio);
                const wavData = addWavHeader(pcmData, 24000, 1, 16);
                // CORRECTION : utiliser wavData.buffer au lieu de wavData
                const audioBlob = new Blob([new Uint8Array(wavData.buffer)], { type: 'audio/wav' });
                const url = URL.createObjectURL(audioBlob);
                setTtsAudioUrl(url);
            } else {
                throw new Error("Aucun audio n'a été généré.");
            }
        } catch (e: any) {
            setTtsError(e.message || "Une erreur est survenue lors de la génération audio.");
        } finally {
            setTtsLoading(false);
        }
    };
    
    // --- Transcription Logic ---

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
            setSelectedFile(file);
            setTranscriptionResult(null);
            setTranscriptionError(null);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
            setSelectedFile(file);
            setTranscriptionResult(null);
            setTranscriptionError(null);
        }
    };

    const formatDiarizationResult = (rawText: string): string => {
        if (!rawText) return '';
    
        const lines = rawText.split('\n');
        let lastSpeaker: string | null = null;
        const formattedLines: string[] = [];
    
        // Regex pour capturer l'identifiant de base du locuteur (ex: "Intervenant 1")
        const speakerIdentifierRegex = /(Intervenant\s+\d+)/;
    
        for (const line of lines) {
            const speakerMatch = line.match(speakerIdentifierRegex);
            const colonIndex = line.indexOf(':');
    
            // Une ligne n'est valide que si elle a un locuteur ET un deux-points
            if (!speakerMatch || colonIndex === -1) {
                continue;
            }
    
            const currentSpeaker = speakerMatch[0].trim(); // ex: "Intervenant 1"
            const dialogue = line.substring(colonIndex + 1).trim();
    
            // S'il n'y a pas de dialogue après le deux-points, on ignore la ligne
            if (!dialogue) {
                continue;
            }
    
            // Si le locuteur a changé, on ajoute son nom
            if (currentSpeaker !== lastSpeaker) {
                // Ajoute une ligne vide pour la lisibilité si ce n'est pas le premier
                if (formattedLines.length > 0) {
                    formattedLines.push(''); 
                }
                formattedLines.push(`**${currentSpeaker}:**`);
                lastSpeaker = currentSpeaker;
            }
    
            // Ajoute le dialogue
            formattedLines.push(dialogue);
        }
    
        return formattedLines.join('\n');
    };


    const handleTranscribe = async () => {
        if (!selectedFile) {
            setTranscriptionError("Veuillez sélectionner un fichier à transcrire.");
            return;
        }
        setTranscribing(true);
        setTranscriptionError(null);
        setTranscriptionResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const base64Data = await fileToBase64(selectedFile);
            
            const filePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: selectedFile.type,
                },
            };

            const promptText = enableDiarization
                ? "Transcris ce fichier audio en identifiant et en étiquetant chaque intervenant distinct (par exemple, Intervenant 1, Intervenant 2, etc.)."
                : "Transcris le contenu de ce fichier audio en français.";

            const textPart = { text: promptText };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [filePart, textPart] },
            });
            
            const rawResult = response.text;
            if (rawResult) {
                const finalResult = enableDiarization ? formatDiarizationResult(rawResult) : rawResult;
                setTranscriptionResult(finalResult);
            } else {
                setTranscriptionResult("La transcription n'a produit aucun résultat.");
            }

        } catch (e: any) {
            setTranscriptionError(e.message || "Une erreur est survenue lors de la transcription.");
        } finally {
            setTranscribing(false);
        }
    };

    const selectedVoiceName = allVoices.find(v => v.id === ttsVoice)?.name || 'Sélectionner une voix';
    let lastGender: string | null = null;

    return (
        <div className="panel-container">
            <h1 className="panel-title">Studio Audio</h1>

            <div className="mode-switcher">
                <button className={`mode-button ${mode === 'tts' ? 'active' : ''}`} onClick={() => setMode('tts')}>Texte vers Parole (TTS)</button>
                <button className={`mode-button ${mode === 'transcribe' ? 'active' : ''}`} onClick={() => setMode('transcribe')}>Transcrire un Fichier</button>
            </div>

            {mode === 'tts' && (
                <div className="tts-container">
                    <textarea className="textarea" rows={4} placeholder="Écrivez votre texte ici..." value={ttsPrompt} onChange={(e) => setTtsPrompt(e.target.value)}></textarea>
                    
                     <div className="form-group">
                        <label className="form-label">Voix</label>
                        <div className="custom-select-container" ref={dropdownRef}>
                            <button className="custom-select-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                                {selectedVoiceName}
                                <ChevronDownIcon />
                            </button>
                            {isDropdownOpen && (
                                <div className="custom-select-panel">
                                    {allVoices.map(voice => {
                                        const showHeader = voice.gender !== lastGender;
                                        lastGender = voice.gender;
                                        return (
                                            <React.Fragment key={voice.id}>
                                                {showHeader && <div className="custom-select-header">{voice.gender === 'Féminin' ? 'Féminines' : 'Masculines'}</div>}
                                                <div className={`custom-select-option ${ttsVoice === voice.id ? 'active' : ''}`} onClick={() => handleSelectVoice(voice.id)}>
                                                    <span>{voice.name} <span className="voice-gender">({voice.gender})</span></span>
                                                    <button 
                                                        className="voice-preview-button"
                                                        title={`Écouter ${voice.name}`}
                                                        onClick={(e) => { e.stopPropagation(); handlePreviewVoice(voice.id); }}
                                                        disabled={!!previewLoadingVoice}
                                                    >
                                                        {previewLoadingVoice === voice.id ? <SpinnerIcon /> : <PlayIcon />}
                                                    </button>
                                                </div>
                                            </React.Fragment>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="speed-control" className="form-label">Vitesse de la voix : {speakingRate.toFixed(2)}x</label>
                        <input 
                            type="range" 
                            id="speed-control"
                            min="0.5" 
                            max="2" 
                            step="0.05" 
                            value={speakingRate} 
                            onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                            className="slider"
                        />
                    </div>

                    <button className="button button-primary" onClick={handleGenerateTTS} disabled={ttsLoading}>{ttsLoading ? 'Génération...' : 'Générer Audio'}</button>
                    {ttsError && <div className="alert-error">{ttsError}</div>}
                    
                    {ttsAudioUrl && (
                        <div className="audio-player-container">
                            <audio src={ttsAudioUrl} controls></audio>
                            <div className="audio-actions">
                                <a href={ttsAudioUrl} download="audio_genere.wav" className="button button-success">Télécharger (.wav)</a>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {mode === 'transcribe' && (
                <div className="transcribe-container">
                    <div className="file-uploader" onDrop={handleFileDrop} onDragOver={(e) => e.preventDefault()} onClick={() => document.getElementById('file-upload')?.click()}>
                        <input type="file" id="file-upload" accept="audio/*,video/*" hidden onChange={handleFileChange} />
                        {selectedFile ? (
                            <div className="file-info">
                                <strong>Fichier sélectionné :</strong> {selectedFile.name}
                            </div>
                        ) : (
                            <span>Glissez-déposez un fichier audio/vidéo ici ou cliquez pour en importer un.</span>
                        )}
                    </div>
                     <div className="form-group form-group-checkbox">
                        <input 
                            type="checkbox" 
                            id="diarization-checkbox" 
                            className="checkbox"
                            checked={enableDiarization}
                            onChange={(e) => setEnableDiarization(e.target.checked)}
                        />
                        <label htmlFor="diarization-checkbox" className="form-label">Identifier les différents intervenants</label>
                    </div>
                     <button className="button button-primary" onClick={handleTranscribe} disabled={transcribing || !selectedFile}>{transcribing ? 'Transcription en cours...' : 'Transcrire le fichier'}</button>
                     {transcriptionError && <div className="alert-error">{transcriptionError}</div>}
                     {transcriptionResult && (
                        <div className="transcription-result">
                            <h3 className="result-title">Résultat de la Transcription :</h3>
                            <textarea className="textarea" value={transcriptionResult || ''} onChange={(e) => setTranscriptionResult(e.target.value)} rows={10}></textarea>
                        </div>
                     )}
                </div>
            )}
        </div>
    );
};

export default AudioPanel;