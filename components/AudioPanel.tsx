import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { decode, addWavHeader, fileToBase64 } from '../utils/helpers';
import { VOICES, Voice } from '../utils/voices';

// Ce panneau appelle maintenant /api/generateAudio et /api/transcribe
const AudioPanel = () => {
    // États communs
    const [mode, setMode] = useState<'tts' | 'transcribe'>('tts');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // États pour TTS
    const [prompt, setPrompt] = useState('');
    const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState<string | null>(null);
    const [speakingRate, setSpeakingRate] = useState(1.0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // États pour Transcription
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [transcription, setTranscription] = useState('');
    const [enableDiarization, setEnableDiarization] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    
    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
    const selectVoice = (voice: Voice) => {
        setSelectedVoice(voice);
        setIsDropdownOpen(false);
    };

    const handlePreviewVoice = async (e: React.MouseEvent, voice: Voice) => {
        e.stopPropagation();
        setPreviewLoading(voice.apiName);
        try {
            const response = await fetch('/api/generateAudio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: "Bonjour, voici un aperçu de ma voix.",
                    selectedVoice: voice.apiName,
                    speakingRate: 1.0,
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            const pcmData = decode(data.base64Audio);
            const wavBuffer = addWavHeader(pcmData, 24000, 1, 16);
            const audioBlob = new Blob([new Uint8Array(wavBuffer)], { type: 'audio/wav' });
            const url = URL.createObjectURL(audioBlob);
            
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => URL.revokeObjectURL(url);
            
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setPreviewLoading(null);
        }
    };
    
    const handleGenerateAudio = async () => {
        if (!prompt.trim()) { setError('Veuillez entrer un texte.'); return; }
        setLoading(true); setError(null); setAudioUrl(null);
        try {
            const response = await fetch('/api/generateAudio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, selectedVoice: selectedVoice.apiName, speakingRate })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            const pcmData = decode(data.base64Audio);
            const wavBuffer = addWavHeader(pcmData, 24000, 1, 16);
            const audioBlob = new Blob([new Uint8Array(wavBuffer)], { type: 'audio/wav' });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };
    
    // Fonctions pour la transcription
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleTranscribe = async () => {
        if (!selectedFile) { setError("Veuillez sélectionner un fichier."); return; }
        setLoading(true); setError(null); setTranscription('');
        try {
            const audioBase64 = await fileToBase64(selectedFile);
            const transcriptionPrompt = enableDiarization 
                ? `Transcris l'audio suivant. Identifie clairement chaque intervenant différent (par ex: Intervenant 1, Intervenant 2). Fournis uniquement la transcription formatée.`
                : `Transcris l'audio suivant. Fournis uniquement la transcription.`;
            
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audioBase64,
                    audioMimeType: selectedFile.type,
                    prompt: transcriptionPrompt
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            setTranscription(formatTranscription(data.transcription));

        } catch(err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const formatTranscription = (rawText: string): string => {
        const lines = rawText.split('\n').filter(line => line.trim() !== '');
        let formattedText = '';
        let lastSpeaker = '';

        for (const line of lines) {
            // Regex pour trouver "Intervenant X:" ou "**Intervenant X:**"
            const speakerMatch = line.match(/\*?\*?Intervenant\s+\d+:?.*?\*?\*?/i);
            
            if (speakerMatch) {
                const currentSpeaker = speakerMatch[0].replace(/:.*/, '').trim();
                let dialog = line.substring(speakerMatch[0].length).trim();
                
                // Nettoyer les potentiels horodatages restants
                dialog = dialog.replace(/\[\s*\d{2}:\d{2}(:\d{3})?\s*\]/g, '').trim();

                if (currentSpeaker !== lastSpeaker) {
                    formattedText += `\n\n**${currentSpeaker}:**\n${dialog}`;
                    lastSpeaker = currentSpeaker;
                } else {
                    formattedText += `\n${dialog}`;
                }
            } else {
                 // Si pas de locuteur trouvé, on ajoute la ligne telle quelle si elle ne ressemble pas à un en-tête
                if (!line.match(/^\*?\*?Intervenant\s+\d+\*?\*?$/i)) {
                    const cleanedLine = line.replace(/\[\s*\d{2}:\d{2}(:\d{3})?\s*\]/g, '').trim();
                    if(cleanedLine) formattedText += `\n${cleanedLine}`;
                }
            }
        }
        return formattedText.trim();
    };

    const renderTTSPanel = () => (
        <div className="tts-container">
            <textarea className="textarea" rows={5} placeholder="Ex: Dites joyeusement : Passez une excellente journée !" value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
            
            <div className="form-group">
                <label className="form-label">Choix de la voix</label>
                <div className="custom-select-container">
                    <div className="custom-select-trigger" onClick={toggleDropdown}>
                       <span>{selectedVoice.name} <span className="voice-gender">({selectedVoice.gender})</span></span>
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    {isDropdownOpen && (
                        <div className="custom-select-panel">
                            {['Féminines', 'Masculins'].map(genderGroup => (
                                <React.Fragment key={genderGroup}>
                                    <div className="custom-select-header">{genderGroup}</div>
                                    {VOICES.filter(v => v.gender === genderGroup.slice(0, -1)).map(voice => (
                                         <div key={voice.apiName} className={`custom-select-option ${selectedVoice.apiName === voice.apiName ? 'active' : ''}`} onClick={() => selectVoice(voice)}>
                                           <span>{voice.name}</span>
                                           <button className="voice-preview-button" onClick={(e) => handlePreviewVoice(e, voice)} disabled={!!previewLoading}>
                                             {previewLoading === voice.apiName ? <Spinner/> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.22 8.22a.75.75 0 011.06 0l3.22 3.22a.75.75 0 010 1.06l-3.22 3.22a.75.75 0 01-1.06-1.06L8.94 12 6.22 9.28a.75.75 0 010-1.06z" /><path d="M12.22 8.22a.75.75 0 011.06 0l3.22 3.22a.75.75 0 010 1.06l-3.22 3.22a.75.75 0 01-1.06-1.06L14.94 12l-2.72-2.72a.75.75 0 010-1.06z" /></svg>}
                                            </button>
                                         </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Vitesse de la voix ({speakingRate.toFixed(2)}x)</label>
                <input type="range" min="0.5" max="2" step="0.05" value={speakingRate} onChange={(e) => setSpeakingRate(parseFloat(e.target.value))} className="slider" />
            </div>

            <button className="button button-primary" onClick={handleGenerateAudio} disabled={loading}>{loading ? "Génération..." : "Générer l'audio"}</button>

            {audioUrl && (
                <div className="audio-player-container">
                    <h3>Résultat :</h3>
                    <audio controls src={audioUrl} ref={audioRef} />
                    <div className="audio-actions">
                         <a href={audioUrl} download={`${prompt.slice(0,20).replace(/\s/g, '_')}.wav`} className="button button-secondary">Télécharger (.wav)</a>
                    </div>
                </div>
            )}
        </div>
    );
    
    const renderTranscribePanel = () => (
         <div className="transcribe-container">
            <div className="file-uploader" onClick={() => document.getElementById('audio-upload')?.click()}>
                <input type="file" id="audio-upload" hidden onChange={handleFileChange} accept="audio/*,video/*" />
                {selectedFile ? <span className="file-info">{selectedFile.name}</span> : <span>Glissez-déposez un fichier audio/vidéo ou cliquez pour en importer un.</span>}
            </div>

            <div className="form-group-checkbox" onClick={() => setEnableDiarization(!enableDiarization)}>
                <input type="checkbox" id="diarization" className="checkbox" checked={enableDiarization} readOnly/>
                <label htmlFor="diarization" className="form-label">Identifier les différents intervenants</label>
            </div>
            
            <button className="button button-primary" onClick={handleTranscribe} disabled={loading || !selectedFile}>{loading ? "Transcription..." : "Transcrire le fichier"}</button>
            
            {transcription && (
                <div className="transcription-result">
                    <h3 className="result-title">Transcription :</h3>
                    <div className="transcription-output">
                        <ReactMarkdown>{transcription}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );

    const Spinner = () => (
      <svg className="spinner" viewBox="0 0 50 50">
        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
      </svg>
    );

    return (
        <div className="panel-container">
            <h1 className="panel-title">Audio</h1>
            <div className="mode-switcher">
                <button className={`mode-button ${mode === 'tts' ? 'active' : ''}`} onClick={() => setMode('tts')}>Texte vers Audio</button>
                <button className={`mode-button ${mode === 'transcribe' ? 'active' : ''}`} onClick={() => setMode('transcribe')}>Transcrire un Fichier</button>
            </div>
            {error && <div className="alert-error">{error}</div>}
            {mode === 'tts' ? renderTTSPanel() : renderTranscribePanel()}
        </div>
    );
};

export default AudioPanel;
