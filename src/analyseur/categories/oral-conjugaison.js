/**
 * Catégorie: explications de conjugaison pour la dictée orale.
 */
(function (global) {
    'use strict';

    const categories = global.AbeAnalyseurCategories = global.AbeAnalyseurCategories || {};

    /**
     * Détecte une erreur de conjugaison entre le mot saisi et le mot attendu.
     * Cas traités :
     *   - Même lemme, forme conjuguée différente (ex: accroche → accrochent)
     *   - Mot saisi préfixe du mot attendu (terminaison tronquée)
     *
     * @param {string} motSaisi    - Mot écrit par l'élève
     * @param {string} motAttendu  - Mot attendu par la dictée
     * @param {object} analyseur   - Instance de l'analyseur (pour getWordData)
     * @returns {object|null}      - { explication, titreAide, memo } ou null
     */
    /**
     * Règles de terminaison par personne pour guider sans donner la réponse.
     */
    const REGLES_TERMINAISON = [
        { sujet: /je\b/i,   regle: 'À la 1re personne du singulier, vérifie la terminaison du verbe (‑e, ‑s ou ‑x selon le groupe).' },
        { sujet: /tu\b/i,   regle: 'À la 2e personne du singulier, les verbes conjugués prennent un « s » à la fin (ou « x » pour pouvoir/valoir/vouloir).' },
        { sujet: /il\b|elle\b|on\b/i, regle: 'À la 3e personne du singulier, les verbes conjugués se terminent par « e » (1er groupe), « d » (3e groupe) ou « t » (autres).' },
        { sujet: /nous\b/i, regle: 'À la 1re personne du pluriel, les verbes conjugués se terminent par « ‑ons » (sauf être → sommes).' },
        { sujet: /vous\b/i, regle: 'À la 2e personne du pluriel, les verbes conjugués se terminent par « ‑ez » (1er/2e groupe) ou « ‑ez »/« ‑tes » (3e groupe).' },
        { sujet: /ils\b|elles\b/i, regle: 'À la 3e personne du pluriel, les verbes conjugués prennent « ‑ent » (1er/2e groupe) ou la terminaison du 3e groupe.' }
    ];

    /**
     * Tente de détecter la personne du verbe à partir des tokens précédents.
     * Remonte jusqu'à 5 tokens en arrière pour trouver un pronom sujet ou un nom sujet.
     */
    function detecterPersonne(index, tokensReference, analyseur) {
        if (!Array.isArray(tokensReference) || typeof index !== 'number' || index < 0) return null;
        const estPonctuation = (t) => /^[.,;:!?]$/.test(t && t.texte || '');
        const debut = Math.max(0, index - 5);
        for (let i = index - 1; i >= debut; i--) {
            const tok = tokensReference[i];
            if (!tok || !tok.texte || estPonctuation(tok)) continue;
            const texte = tok.texte.toLowerCase();
            for (const r of REGLES_TERMINAISON) {
                if (r.sujet.test(texte)) return r.regle;
            }
        }
        return null;
    }

    /**
     * Trouve le sujet d'un verbe dans les tokens du corpus en remontant
     * les dépendances (nsubj) ou en cherchant un nom/pronom avant le verbe.
     * Retourne { texte, donnees } ou null.
     */
    function trouverSujetCorpus(index, tokensReference, tokenCorpusAttendu, tokensCorpus) {
        const source = Array.isArray(tokensCorpus) && tokensCorpus.length > 0
            ? tokensCorpus
            : (Array.isArray(tokensReference) ? tokensReference : []);
        if (!Array.isArray(source) || source.length === 0 || typeof index !== 'number' || index < 0) return null;
        const estPonctuation = (t) => /^[.,;:!?]$/.test(t && t.texte || '');

        // 1) Chercher un token avec dependance.type === 'nsubj' qui pointe vers ce verbe
        const tokenVerbe = tokenCorpusAttendu || source[index] || null;
        if (tokenVerbe) {
            const idVerbe = Number(tokenVerbe.id);
            for (let i = 0; i < source.length; i++) {
                const t = source[i];
                if (t && t.dependance && t.dependance.type === 'nsubj' && Number(t.dependance.cible) === Number(tokenVerbe.id)) {
                    return { texte: t.texte, donnees: t, indexMot: i };
                }
            }
            if (Number.isInteger(idVerbe) && idVerbe > 0) {
                for (let i = 0; i < source.length; i++) {
                    const t = source[i];
                    if (t && t.dependance && t.dependance.type === 'nsubj' && Number(t.dependance.cible) === idVerbe) {
                        return { texte: t.texte, donnees: t, indexMot: i };
                    }
                }
            }
        }

        // 2) Chercher un nom/pronom juste avant le verbe
        for (let i = index - 1; i >= 0; i--) {
            const tok = source[i];
            if (!tok || !tok.texte || estPonctuation(tok)) continue;
            const nature = String(tok.nature || '').toLowerCase();
            if (nature.includes('nom') || nature.includes('pronom')) {
                return { texte: tok.texte, donnees: tok, indexMot: i };
            }
            // Arrêter si on rencontre un verbe (on est sorti du groupe sujet)
            if (nature.includes('verbe')) break;
        }
        return null;
    }

    function enrichirExplicationConjugaison(motSaisi, motAttendu, analyseur, index, tokensReference, tokenCorpusAttendu, tokensCorpus) {
        if (!analyseur) return null;

        // Priorité au corpus pour la nature et le lemme (plus fiable que getWordData)
        const natureCorpus = tokenCorpusAttendu ? String(tokenCorpusAttendu.nature || '').toLowerCase() : '';
        const estVerbeCorpus = natureCorpus === 'verbe';
        const donneesAttendu = analyseur.getWordData(motAttendu);
        const estVerbeDict = donneesAttendu && /^verbe$/i.test(String(donneesAttendu.type || ''));
        if (!estVerbeCorpus && !estVerbeDict) return null;

        // Lemme : corpus en priorité, sinon dictionnaire
        const lemmeAttendu = tokenCorpusAttendu && tokenCorpusAttendu.lemme
            ? String(tokenCorpusAttendu.lemme).toLowerCase()
            : String((donneesAttendu && (donneesAttendu.lemme || donneesAttendu.infinitif)) || '').toLowerCase();

        // Données du mot saisi (dictionnaire uniquement — pas de corpus pour la saisie)
        const donneesSaisi = analyseur.getWordData(motSaisi);
        const lemmeSaisi = donneesSaisi
            ? String(donneesSaisi.lemme || donneesSaisi.infinitif || '').toLowerCase()
            : '';

        // Infos riches du corpus pour guider l'élève
        const personneCorpus = tokenCorpusAttendu ? String(tokenCorpusAttendu.personne || '') : '';
        const modeCorpus = tokenCorpusAttendu ? String(tokenCorpusAttendu.mode || '').toLowerCase() : '';
        const tempsCorpus = tokenCorpusAttendu ? String(tokenCorpusAttendu.temps || '').toLowerCase() : '';

        // Construire un indice de personne/mode/temps si disponible
        const indiceConjugaison = [];
        if (personneCorpus) {
            const persLabel = { '1': '1re personne', '2': '2e personne', '3': '3e personne' };
            indiceConjugaison.push(persLabel[personneCorpus] || `${personneCorpus}e personne`);
        }
        if (modeCorpus && modeCorpus !== 'null') {
            const modeLabel = { 'indicatif': 'indicatif', 'subjonctif': 'subjonctif', 'conditionnel': 'conditionnel', 'impératif': 'impératif', 'infinitif': 'infinitif', 'participe': 'participe' };
            indiceConjugaison.push(modeLabel[modeCorpus] || modeCorpus);
        }
        if (tempsCorpus && tempsCorpus !== 'null') {
            const tempsLabel = { 'présent': 'présent', 'passé': 'passé composé', 'imparfait': 'imparfait', 'futur': 'futur', 'plus-que-parfait': 'plus-que-parfait' };
            indiceConjugaison.push(tempsLabel[tempsCorpus] || tempsCorpus);
        }
        const estInfinitif = modeCorpus === 'infinitif';
        const infinitifHint = (!estInfinitif && lemmeAttendu)
            ? ` Verbe à l'infinitif : ${lemmeAttendu}.`
            : '';
        const indiceStr = indiceConjugaison.length > 0
            ? (estInfinitif
                ? `Ce verbe est à l'infinitif.`
                : `Ce verbe est conjugué à la ${indiceConjugaison.join(', ')}.`)
            : '';

        // Même lemme, forme conjuguée différente → guider sans donner la réponse
        if (lemmeAttendu && lemmeSaisi && lemmeAttendu === lemmeSaisi) {
            const reglePersonne = detecterPersonne(index, tokensReference, analyseur);
            // Trouver le sujet dans les tokens précédents pour contexteAccord
            const sujetCorpus = trouverSujetCorpus(index, tokensReference, tokenCorpusAttendu, tokensCorpus);
            // Si un sujet existe dans le corpus et le verbe n'est pas à l'infinitif,
            // l'erreur est un accord sujet-verbe (pas une conjugaison isolée)
            const estAccordSujetVerbe = !estInfinitif && sujetCorpus;
            return {
                explication: estInfinitif
                    ? `Conjugaison : tu as écrit « ${motSaisi} » mais ce verbe doit être à l'infinitif. ${indiceStr || 'Après certains verbes, le verbe suivant reste à l\'infinitif.'}`
                    : estAccordSujetVerbe
                        ? `Le verbe doit s'accorder avec le sujet « ${sujetCorpus.texte} ». Vérifie la terminaison.${infinitifHint}`
                        : `Conjugaison : tu as écrit « ${motSaisi} » mais ce n'est pas la bonne forme de ce verbe. ${indiceStr || reglePersonne || 'Identifie le sujet du verbe puis choisis la bonne terminaison.'}${infinitifHint}`,
                titreAide: estInfinitif ? 'Infinitif du verbe' : estAccordSujetVerbe ? 'Accord sujet-verbe' : 'Conjugaison verbe',
                memo: estInfinitif ? `Après aller, vouloir, pouvoir, devoir... le verbe suivant est à l'infinitif.` : estAccordSujetVerbe ? `Pour accorder le verbe avec son sujet, identifie le sujet (qui ?) puis choisis la terminaison qui convient.` : `Pour un verbe, identifie le sujet puis choisis la bonne terminaison.`,
                parcoursType: estAccordSujetVerbe ? 'accord_sujet_verbe' : 'conjugaison_verbe',
                modeVerbe: modeCorpus || '',
                contexteAccord: { verbe: { texte: motSaisi, donnees: tokenCorpusAttendu }, ...(sujetCorpus ? { sujet: sujetCorpus } : {}) }
            };
        }

        // Le mot saisi est un préfixe du mot attendu (terminaison tronquée)
        if (motAttendu.toLowerCase().startsWith(motSaisi.toLowerCase()) && motAttendu.length > motSaisi.length) {
            const reglePersonne = detecterPersonne(index, tokensReference, analyseur);
            const sujetCorpus = trouverSujetCorpus(index, tokensReference, tokenCorpusAttendu, tokensCorpus);
            const estAccordSujetVerbe = !estInfinitif && sujetCorpus;
            return {
                explication: estInfinitif
                    ? `Conjugaison : il manque des lettres à la fin du verbe.\n ${indiceStr || 'Ce verbe doit être à l\'infinitif.'}`
                    : estAccordSujetVerbe
                        ? `Le verbe doit s'accorder avec le sujet « ${sujetCorpus.texte} ». Vérifie la terminaison.${infinitifHint}`
                        : `Conjugaison : il manque des lettres à la fin du verbe.\n ${indiceStr || reglePersonne || 'Identifie le sujet du verbe pour trouver la terminaison correcte.'}${infinitifHint}`,
                titreAide: estInfinitif ? 'Infinitif du verbe' : estAccordSujetVerbe ? 'Accord sujet-verbe' : 'Conjugaison verbe',
                memo: estInfinitif ? `Après aller, vouloir, pouvoir, devoir... le verbe suivant est à l'infinitif.` : estAccordSujetVerbe ? `Pour accorder le verbe avec son sujet, identifie le sujet (qui ?) puis choisis la terminaison qui convient.` : `Pour un verbe, identifie le sujet puis choisis la bonne terminaison.`,
                parcoursType: estAccordSujetVerbe ? 'accord_sujet_verbe' : 'conjugaison_verbe',
                modeVerbe: modeCorpus || '',
                contexteAccord: { verbe: { texte: motSaisi, donnees: tokenCorpusAttendu }, ...(sujetCorpus ? { sujet: sujetCorpus } : {}) }
            };
        }

        // Cas sans lemme commun mais le mot attendu est un verbe (corpus) :
        // le mot saisi est probablement une mauvaise conjugaison du même verbe
        if (estVerbeCorpus && lemmeAttendu && !lemmeSaisi) {
            // Vérifier si le mot saisi ressemble au lemme (même radical)
            const a = motSaisi.toLowerCase();
            const b = lemmeAttendu.toLowerCase();
            const minLen = Math.min(a.length, b.length);
            let sharedPrefix = 0;
            while (sharedPrefix < minLen && a[sharedPrefix] === b[sharedPrefix]) sharedPrefix++;
            if (sharedPrefix >= 3) {
                const reglePersonne = detecterPersonne(index, tokensReference, analyseur);
                const sujetCorpus = trouverSujetCorpus(index, tokensReference, tokenCorpusAttendu, tokensCorpus);
                const estAccordSujetVerbe = !estInfinitif && sujetCorpus;
                return {
                    explication: estInfinitif
                        ? `Conjugaison : vérifie la forme de « ${motSaisi} ». ${indiceStr || 'Ce verbe doit être à l\'infinitif.'}`
                        : estAccordSujetVerbe
                            ? `Le verbe doit s'accorder avec le sujet « ${sujetCorpus.texte} ». Vérifie la terminaison.${infinitifHint}`
                            : `Conjugaison : vérifie la terminaison de « ${motSaisi} ». ${indiceStr || reglePersonne || 'Identifie le sujet du verbe puis choisis la bonne terminaison.'}${infinitifHint}`,
                    titreAide: estInfinitif ? 'Infinitif du verbe' : estAccordSujetVerbe ? 'Accord sujet-verbe' : 'Conjugaison verbe',
                    memo: estInfinitif ? `Après aller, vouloir, pouvoir, devoir... le verbe suivant est à l'infinitif.` : estAccordSujetVerbe ? `Pour accorder le verbe avec son sujet, identifie le sujet (qui ?) puis choisis la terminaison qui convient.` : `Pour un verbe, identifie le sujet puis choisis la bonne terminaison.`,
                    parcoursType: estAccordSujetVerbe ? 'accord_sujet_verbe' : 'conjugaison_verbe',
                    modeVerbe: modeCorpus || '',
                    contexteAccord: { verbe: { texte: motSaisi, donnees: tokenCorpusAttendu }, ...(sujetCorpus ? { sujet: sujetCorpus } : {}) }
                };
            }
        }

        return null;
    }

    categories.enrichirExplicationConjugaison = enrichirExplicationConjugaison;
})(typeof window !== 'undefined' ? window : globalThis);
