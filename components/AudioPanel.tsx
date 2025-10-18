import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { encode, decode, decodeAudioData } from '../utils/helpers';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const AudioPanel = () => {
    const [isLive, setIsLive] = useState(false);
    const [transcripts, setTranscripts] = useState<{ source: string, text: string }[]>([]);
    const [status, setStatus] = useState({ text: 'Inactif', color: 'gray' });
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContexts = useRef<{input: AudioContext | null, output: AudioContext | null, sources: Set<AudioBufferSourceNode>}>({ input: null, output: null, sources: new Set() });
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    let nextStartTime = 0;

    const startConversation = async () => {
        try {
            // @ts-ignore
            if (!(window.AudioContext || window.webkitAudioContext)) {
                setStatus({ text: "Erreur: API Audio non supportée", color: 'red' });
                return;
            }
            
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsLive(true);
            setStatus({ text: 'Connexion...', color: 'yellow' });
            
            // @ts-ignore
            const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            // @ts-ignore
            const outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            audioContexts.current = { input: inputAudioContext, output: outputAudioContext, sources: new Set() };
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus({ text: 'Connecté. En écoute...', color: 'red' });
                        if (!streamRef.current || !inputAudioContext) return;
                        const source = inputAudioContext.createMediaStreamSource(streamRef.current);
                        processorRef.current = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        processorRef.current.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
                            const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processorRef.current);
                        processorRef.current.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message) => {
                        if (message.serverContent?.outputTranscription?.text) { setTranscripts(prev => [...prev, { source: 'modèle', text: message.serverContent.outputTranscription.text }]); }
                        if (message.serverContent?.inputTranscription?.text) { setTranscripts(prev => [...prev, { source: 'vous', text: message.serverContent.inputTranscription.text }]); }
                        if (message.serverContent?.modelTurn?.parts[0]?.inlineData.data) {
                            setStatus({ text: 'En train de parler...', color: 'green' });
                            const b64 = message.serverContent.modelTurn.parts[0].inlineData.data;
                            if (!outputAudioContext) return;
                            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(b64), outputAudioContext, 24000, 1);
                            const sourceNode = outputAudioContext.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputAudioContext.destination);
                            sourceNode.addEventListener('ended', () => {
                                audioContexts.current.sources?.delete(sourceNode);
                                if (audioContexts.current.sources?.size === 0) setStatus({ text: 'Connecté. En écoute...', color: 'red' });
                            });
                            sourceNode.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                             audioContexts.current.sources?.add(sourceNode);
                        }
                    },
                    onerror: () => setStatus({ text: 'Erreur', color: 'red' }),
                    onclose: () => setStatus({ text: 'Inactif', color: 'gray' }),
                },
                config: { responseModalities: [Modality.AUDIO], outputAudioTranscription: {}, inputAudioTranscription: {} },
            });
        } catch (error) {
            console.error("Erreur de démarrage audio:", error);
            setStatus({ text: "Erreur d'autorisation micro", color: 'red' });
            setIsLive(false);
        }
    };

    const stopConversation = () => {
        sessionPromiseRef.current?.then(session => session.close());
        streamRef.current?.getTracks().forEach(track => track.stop());
        processorRef.current?.disconnect();
        audioContexts.current.input?.close();
        audioContexts.current.output?.close();
        setIsLive(false);
        setTranscripts([]);
        setStatus({ text: 'Inactif', color: 'gray' });
    };

    return (
        <div className="panel-container audio-panel">
             <h1 className="panel-title">Conversation Audio</h1>
             <div className="audio-controls">
                <div className="audio-status"><span className={`status-indicator status-${status.color}`}></span><span>{status.text}</span></div>
                {!isLive ?
                    <button onClick={startConversation} className="button button-success">Démarrer</button> :
                    <button onClick={stopConversation} className="button button-danger">Arrêter</button>
                }
             </div>
             <div className="transcript-container">
                {transcripts.map((t, i) => <div key={i}><span className={`transcript-source transcript-${t.source}`}>{t.source}: </span><span className="transcript-text">{t.text}</span></div>)}
             </div>
        </div>
    );
};

export default AudioPanel;
