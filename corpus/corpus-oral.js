(function () {
    'use strict';

    const MIN_WORDS_PER_PHRASE = 1;

    function compterMots(phrase) {
        const texte = String(phrase || '').trim();
        if (!texte) return 0;
        const mots = texte.match(/[A-Za-zÀ-ÖØ-öø-ÿŒœ]+(?:[’'\-][A-Za-zÀ-ÖØ-öø-ÿŒœ]+)*/g);
        return Array.isArray(mots) ? mots.length : 0;
    }

    function estPhraseOraleValide(phrase) {
        return compterMots(phrase) >= MIN_WORDS_PER_PHRASE;
    }

    function obtenirIdDicteeUrl() {
        if (typeof window === 'undefined' || !window.location) return '';
        try {
            const params = new URLSearchParams(window.location.search || '');
            const brut = (params.get('d') || params.get('dictee') || '').trim();
            if (/^[a-zA-Z0-9_-]{2,64}$/.test(brut)) {
                return brut;
            }
        } catch {
            // ignore
        }
        return '';
    }

    function normaliserExclusions(exclusionOptionnelle) {
        if (!exclusionOptionnelle) return new Set();

        const valeurs = Array.isArray(exclusionOptionnelle)
            ? exclusionOptionnelle
            : (exclusionOptionnelle instanceof Set ? Array.from(exclusionOptionnelle) : [exclusionOptionnelle]);

        return new Set(
            valeurs
                .map((valeur) => String(valeur || '').trim().toLowerCase())
                .filter(Boolean)
        );
    }

    const phrases = [];
    let chargementCorpusPromise = null;

    function getPhraseByIndex(index) {
        const idx = Number(index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= phrases.length) {
            return '';
        }
        return phrases[idx] || '';
    }

    function getSecureRandomPhrase(exclusionOptionnelle) {
        if (phrases.length === 0) return '';
        if (phrases.length === 1) return phrases[0];

        const exclusions = normaliserExclusions(exclusionOptionnelle);
        for (const phrase of phrases) {
            if (!exclusions.has(String(phrase || '').toLowerCase())) {
                return phrase;
            }
        }
        return phrases[0];
    }

    function normaliserPhraseCanonique(phrase) {
        return String(phrase || '')
            .replace(/([ldjnmtsqcLDJNMTSQC]|qu|Qu|QU)['’]\s+/g, "$1'")
            .replace(/\s+/g, ' ')
            .replace(/\s+([.,;:!?])/g, '$1')
            .trim()
            .toLowerCase();
    }

    function extrairePhrasesManquantes(phrasesCandidates) {
        const candidates = Array.isArray(phrasesCandidates) ? phrasesCandidates : [];
        const existantes = new Set(phrases.map((p) => normaliserPhraseCanonique(p)));
        const manquantes = [];

        candidates.forEach((phrase) => {
            const original = String(phrase || '').replace(/\s+/g, ' ').trim();
            if (!original) return;
            if (!estPhraseOraleValide(original)) return;
            const canon = normaliserPhraseCanonique(original);
            if (!canon || existantes.has(canon)) return;
            existantes.add(canon);
            manquantes.push(original);
        });

        return manquantes;
    }

    function remplacerCorpus(phrasesCandidates) {
        const prochainesPhrases = Array.isArray(phrasesCandidates)
            ? phrasesCandidates
                .map((phrase) => String(phrase || '').replace(/\s+/g, ' ').trim())
                .filter((phrase) => estPhraseOraleValide(phrase))
            : [];

        phrases.length = 0;
        phrases.push(...prochainesPhrases);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('abe-corpus-mis-a-jour', {
                detail: { count: phrases.length, phrases: phrases.slice() }
            }));
        }

        return {
            ajoutees: phrases.length,
            total: phrases.length,
            phrasesAjoutees: phrases.slice()
        };
    }

    function extrairePhrasesDepuisCorpusDetaille(data) {
        const entrees = Array.isArray(data) ? data : [];
        return entrees
            .map((entree) => String((entree && (entree.phrase_normalisee || entree.phrase_originale)) || '').trim())
            .filter(Boolean);
    }

    function chargerCorpusDepuisJson() {
        if (phrases.length > 0) {
            return Promise.resolve({
                ajoutees: phrases.length,
                total: phrases.length,
                phrasesAjoutees: phrases.slice()
            });
        }

        if (chargementCorpusPromise) return chargementCorpusPromise;

        const dicteeId = obtenirIdDicteeUrl();
        if (!dicteeId) {
            return Promise.resolve({
                ajoutees: 0,
                total: 0,
                phrasesAjoutees: []
            });
        }

        chargementCorpusPromise = fetch(`corpus/dictees/${encodeURIComponent(dicteeId)}.json?v=${Date.now()}`, { cache: 'no-store' })
            .then((response) => {
                if (!response.ok) return [];
                return response.json();
            })
            .then((data) => {
                const extraites = extrairePhrasesDepuisCorpusDetaille(data);
                return remplacerCorpus(extraites);
            })
            .catch(() => {
                chargementCorpusPromise = null;
                return {
                    ajoutees: 0,
                    total: phrases.length,
                    phrasesAjoutees: phrases.slice()
                };
            });

        return chargementCorpusPromise;
    }

    window.ABE_CORPUS_ORAL = {
        phrases,
        minWordsPerPhrase: MIN_WORDS_PER_PHRASE,
        get count() {
            return phrases.length;
        },
        obtenirIdDicteeUrl,
        getPhraseByIndex,
        getSecureRandomPhrase,
        getMissingPhrasesFrom: extrairePhrasesManquantes,
        ensureLoaded: chargerCorpusDepuisJson,
        chargerDepuisJson: chargerCorpusDepuisJson,
        remplacerCorpus,
        mergeMissingPhrasesFrom(phrasesCandidates) {
            return remplacerCorpus(phrasesCandidates);
        }
    };

    chargerCorpusDepuisJson();
})();
