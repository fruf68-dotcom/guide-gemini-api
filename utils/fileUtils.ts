/**
 * Convertit un objet File en une chaîne de caractères base64.
 * @param file Le fichier à convertir.
 * @returns Une promesse qui se résout avec la chaîne base64 (sans le préfixe MIME).
 */
export const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Supprime le préfixe "data:mime/type;base64," pour n'obtenir que les données base64
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};
