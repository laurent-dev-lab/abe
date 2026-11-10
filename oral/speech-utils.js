(function (global) {
    'use strict';

    // Mots mal prononcés par la synthèse vocale française.
    // Clé = mot original, Valeur = substitut phonétique forçant la bonne prononciation.
    const CORRECTIONS_PHONETIQUES = {
        'bus': 'busse',
        // Adjectifs en -ent dont la terminaison ne doit pas être traitée comme muette :
        'violent': 'violant',
        'violente': 'violente',
        'evident': 'évidant',
        'évident': 'évidant',
        'evidente': 'évidente',
        'évidente': 'évidente',
        'prudent': 'prudant',
        'prudente': 'prudente',
        'patient': 'passiant',
        'patiente': 'passiante'
    };

    function preparerTexteSynthese(texte) {
        let resultat = String(texte || '')
            // Nettoyer les apostrophes suivies d'une espace (ex: "qu' il" -> "qu'il", "l' astronaute" -> "l'astronaute")
            .replace(/([ldjnmtsqcLDJNMTSQC]|qu|Qu|QU)['’]\s+/g, "$1'");

        for (const [mot, substitut] of Object.entries(CORRECTIONS_PHONETIQUES)) {
            // Utiliser des lookarounds unicode pour gérer correctement les lettres accentuées françaises
            const regex = new RegExp('(?<=^|[^\\p{L}\\p{N}])' + mot + '(?=$|[^\\p{L}\\p{N}])', 'giu');
            resultat = resultat.replace(regex, (match) => {
                // Préserver la casse du mot original
                if (match === match.toUpperCase()) return substitut.toUpperCase();
                if (match[0] === match[0].toUpperCase()) return substitut[0].toUpperCase() + substitut.slice(1);
                return substitut;
            });
        }
        return resultat;
    }

    function obtenirMeilleureVoixFrancaise(synthese = null) {
        const synth = synthese || (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
        if (!synth || typeof synth.getVoices !== 'function') return null;

        const voix = synth.getVoices() || [];
        if (!Array.isArray(voix) || voix.length === 0) return null;

        const voixFr = voix.filter((v) => v && (v.lang === 'fr-FR' || (typeof v.lang === 'string' && v.lang.toLowerCase().startsWith('fr'))));
        if (voixFr.length === 0) return null;

        // Ordre de préférence qualitatif décroissant :
        // 1. Voix Neural / Natural (Edge, Azure, Chrome OS) : très expressives
        // 2. Google français (Chrome Desktop/Android) : fluide
        // 3. Apple Enhanced / Premium (macOS, iOS) : Thomas / Audrey
        // 4. Voix par défaut fr-FR
        const motifsPreferences = [
            /natural/i,
            /neural/i,
            /google/i,
            /enhanced/i,
            /premium/i,
            /thomas/i,
            /audrey/i,
            /hortense/i,
            /paul/i
        ];

        for (const motif of motifsPreferences) {
            const trouve = voixFr.find((v) => motif.test(v.name || ''));
            if (trouve) return trouve;
        }

        // Repli : première voix fr-FR standard
        return voixFr.find((v) => v.lang === 'fr-FR') || voixFr[0] || null;
    }

    const api = {
        CORRECTIONS_PHONETIQUES,
        preparerTexteSynthese,
        obtenirMeilleureVoixFrancaise
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.AbeSpeechUtils = Object.assign({}, globalThis.AbeSpeechUtils, api);
    }
    if (typeof window !== 'undefined') {
        window.AbeSpeechUtils = Object.assign({}, window.AbeSpeechUtils, api);
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));