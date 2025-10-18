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
            const wavData = addWavHeader(pcmData, 24000, 1, 16);
            // CORRECTION : utiliser wavData.buffer
            const audioBlob = new Blob([wavData.buffer], { type: 'audio/wav' });
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
                    // @ts-ignore
                    speakingRate: speakingRate,
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const pcmData = decode(base64Audio);
            const wavData = addWavHeader(pcmData, 24000, 1, 16);
            // CORRECTION : utiliser wavData.buffer
            const audioBlob = new Blob([wavData.buffer], { type: 'audio/wav' });
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