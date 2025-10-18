// utils/voices.ts

export interface Voice {
    name: string;
    gender: string;
    apiName: string;
}

export const VOICES: Voice[] = [
    // --- Féminines ---
    { name: 'Chloé', gender: 'Féminin', apiName: 'Kore' },
    { name: 'Juliette', gender: 'Féminin', apiName: 'leda' },
    { name: 'Léa', gender: 'Féminin', apiName: 'Zephyr' },
    { name: 'Lucie', gender: 'Féminin', apiName: 'Charon' },
    { name: 'Olivia', gender: 'Féminin', apiName: 'Fenrir' },
    { name: 'Pauline', gender: 'Féminin', apiName: 'autonoe' },
    { name: 'Sophie', gender: 'Féminin', apiName: 'despina' },
    { name: 'Amélie', gender: 'Féminin', apiName: 'laomedeia' },
    { name: 'Camille', gender: 'Féminin', apiName: 'callirrhoe' },
    { name: 'Emma', gender: 'Féminin', apiName: 'aoede' },

    // --- Masculins ---
    { name: 'Hugo', gender: 'Masculin', apiName: 'Puck' },
    // Fix: Removed typo '-' which was causing 'name' to be treated as a number (NaN).
    { name: "Mathieu", gender: "Masculin", apiName: "Charon" },
    { name: "Isaac", gender: "Masculin", apiName: "Fenrir" },
    { name: 'Thomas', gender: 'Masculin', apiName: 'alnilam' },
    { name: 'Antoine', gender: 'Masculin', apiName: 'rasalgethi' },
    { name: 'Alexandre', gender: 'Masculin', apiName: 'gacrux' },
    { name: 'Clément', gender: 'Masculin', apiName: 'achernar' },
    { name: 'Gabriel', gender: 'Masculin', apiName: 'achird' },
    { name: 'Léo', gender: 'Masculin', apiName: 'algenib' },
    { name: 'Louis', gender: 'Masculin', apiName: 'algieba' },
];