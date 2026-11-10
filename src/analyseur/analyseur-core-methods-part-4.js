/**
 * M?thodes extraites d'AnalyseurGrammatical (4/4).
 * Source: analyseurexemple.js
 */
(function (global) {
    const coreMethods = {};

    coreMethods.verifierMotsInconnus = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierMotsInconnus !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierMotsInconnus');
        }

        return categories.verifierMotsInconnus.call(this);
    };

    coreMethods.tokeniser = function (phrase) {
        // Gestion minimale des élisions fréquentes: "l'arbre" -> "l' arbre"
        const mots = phrase
            .replace(/[\uFFFD]/g, "'")
            .replace(/[’´`]/g, "'")
            .replace(/\b(qu|[ldjtmnsc])'/gi, "$1' ")
            .replace(/\b([A-Za-zÀ-ÖØ-öø-ÿ]+)-(t-)?(tu|il|elle|on|nous|vous|ils|elles)\b/gi, (_m, verbe, liaisonT, pronom) => {
                return liaisonT ? `${verbe} -t- ${pronom}` : `${verbe} - ${pronom}`;
            })
            .replace(/[.,;:!?"«»()\[\]{}]/g, ' $& ') // Ajoute des espaces autour de la ponctuation et des guillemets/crochets
            .split(/\s+/)
            .filter(mot => mot.length > 0)
            .map(mot => ({
                texte: mot,
                position: 0, // Sera mis à jour plus tard
                donnees: null,
                erreurs: []
            }));

        // Ajout des positions
        mots.forEach((mot, index) => {
            mot.position = index;
            mot.donnees = this.getWordData(mot.texte);
        });

        return mots;
    };

    coreMethods.verifierErreursFrequentes = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierErreursFrequentes !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierErreursFrequentes');
        }

        return categories.verifierErreursFrequentes.call(this);
    };

    coreMethods.verifierFautesLexicalesFrequentes = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierFautesLexicalesFrequentes !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierFautesLexicalesFrequentes');
        }

        return categories.verifierFautesLexicalesFrequentes.call(this);
    };

    coreMethods.verifierMotifsErreursFrequentes = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierMotifsErreursFrequentes !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierMotifsErreursFrequentes');
        }

        return categories.verifierMotifsErreursFrequentes.call(this);
    };

    coreMethods.verifierAccordDeterminantNom = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierAccordDeterminantNom !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierAccordDeterminantNom');
        }

        return categories.verifierAccordDeterminantNom.call(this);
    };

    coreMethods.verifierQuantificateurNomNombre = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierQuantificateurNomNombre !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierQuantificateurNomNombre');
        }

        return categories.verifierQuantificateurNomNombre.call(this);
    };

    coreMethods.verifierAccordSujetVerbe = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierAccordSujetVerbe !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierAccordSujetVerbe');
        }

        return categories.verifierAccordSujetVerbe.call(this);
    };

    coreMethods.verifierAccordAdjectifNom = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierAccordAdjectifNom !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierAccordAdjectifNom');
        }

        return categories.verifierAccordAdjectifNom.call(this);
    };

    coreMethods.verifierAccordsComplexes = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierAccordsComplexes !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierAccordsComplexes');
        }

        return categories.verifierAccordsComplexes.call(this);
    };

    coreMethods.estSujet = function (mot) {
        if (!mot.donnees) return false;
        if (this.estType(mot.donnees, 'nom')) {
            return true;
        }
        if (this.estType(mot.donnees, 'pronom')) {
            return this.estPronomSujetToken(mot.texte);
        }
        return false;
    };

    coreMethods.estContexteNominalPlurielProbable = function (indexNom) {
        if (typeof indexNom !== 'number' || indexNom <= 0) return false;
        const nom = this.phraseAnalysee[indexNom];
        const precedent = this.phraseAnalysee[indexNom - 1];
        if (!nom || !precedent) return false;
        if (!this.estType(nom.donnees, 'nom')) return false;
        if (!this.estDeterminantNominalToken(precedent)) return false;

        const nombreDet = this.normaliserNombre(precedent.donnees && precedent.donnees.nombre);
        return nombreDet === 'pluriel';
    };

    coreMethods.estSujetCorrigePluriel = function (sujetMot, indexSujet = null) {
        if (!sujetMot) return false;
        const nombre = this.getNombreSujet(sujetMot);
        if (nombre === 'pluriel') return true;

        const erreurs = Array.isArray(sujetMot.erreurs) ? sujetMot.erreurs : [];
        const corrigePluriel = erreurs.some((e) =>
            e && e.type === 'accord_nom_nombre' && typeof e.correction === 'string' && /[sx]$/i.test(e.correction)
        );
        if (corrigePluriel) return true;

        if (typeof indexSujet === 'number' && this.estContexteNominalPlurielProbable(indexSujet)) {
            return true;
        }

        return false;
    };

    coreMethods.getNombreSujetAvecCorrections = function (sujetMot, indexSujet = null) {
        if (!sujetMot) return null;

        if (typeof indexSujet === 'number' && indexSujet > 0 && sujetMot.donnees && this.estType(sujetMot.donnees, 'nom')) {
            const texteSujet = this.normaliserTexte(sujetMot.texte || '');
            const nombreDict = this.normaliserNombre(sujetMot.donnees.nombre);
            if (nombreDict === 'pluriel' && /[sx]$/.test(texteSujet)) {
                const precedent = this.phraseAnalysee[indexSujet - 1];
                const textePrecedent = this.normaliserTexte(precedent && precedent.texte ? precedent.texte : '').replace(/[’']/g, '');
                if (['la', 'le', 'un', 'une', 'ce', 'cet', 'cette', 'mon', 'ma', 'ton', 'ta', 'son', 'sa', 'chaque'].includes(textePrecedent)) {
                    return 'singulier';
                }
            }
        }

        if (this.estSujetCorrigePluriel(sujetMot, indexSujet)) {
            return 'pluriel';
        }

        return this.getNombreSujet(sujetMot);
    };

    coreMethods.trouverAntecedentRelatif = function (indexQui) {
        let idx = this.obtenirIndexPrecedentSignificatif(indexQui);
        while (idx >= 0) {
            const mot = this.phraseAnalysee[idx];
            if (!mot) return null;
            if (this.estType(mot.donnees, 'nom') || this.estSujetOuPronomToken(mot)) {
                return { mot, index: idx };
            }
            const texte = this.normaliserTexte(mot.texte || '');
            const probableNomPluriel = !mot.donnees && /[sx]$/i.test(texte) && texte.length >= 3;
            if (probableNomPluriel) {
                return { mot, index: idx };
            }
            if (this.estPonctuationToken(mot.texte)) return null;
            idx = this.obtenirIndexPrecedentSignificatif(idx);
        }
        return null;
    };

    coreMethods.determinerIndicePersonneSujet = function (sujetMot) {
        if (!sujetMot || !sujetMot.texte) return 2;
        const t = this.normaliserTexte(sujetMot.texte).replace(/[’']/g, '');
        if (t === 'j' || t === 'je') return 0;
        if (t === 'moi') return 0;
        if (t === 'tu') return 1;
        if (t === 'toi') return 1;
        if (t === 'nous') return 3;
        if (t === 'vous') return 4;
        if (t === 'ils' || t === 'elles') return 5;
        if (t === 'eux') return 5;
        if (Array.isArray(sujetMot.erreurs)) {
            const erreurNomPluriel = sujetMot.erreurs.find((e) => e && e.type === 'accord_nom_nombre' && typeof e.correction === 'string' && /[sx]$/i.test(e.correction));
            if (erreurNomPluriel) return 5;
        }
        // Pour les sujets nominaux, utiliser le nombre pour distinguer singulier (2) et pluriel (5)
        if (sujetMot.donnees) {
            const nombre = this.getNombreSujet(sujetMot);
            if (nombre === 'pluriel') return 5;
        }
        return 2;
    };

    coreMethods.obtenirGenreSujet = function (sujetMot) {
        if (!sujetMot || !sujetMot.texte) return null;
        const t = this.normaliserTexte(sujetMot.texte).replace(/[\u2018\u2019']/g, '');
        if (t === 'elle' || t === 'elles') return 'feminin';
        if (t === 'il' || t === 'ils' || t === 'on') return 'masculin';
        
        if (sujetMot.donnees && sujetMot.donnees.genre) {
            const g = sujetMot.donnees.genre;
            if (g === 'feminin') return 'feminin';
            if (g === 'masculin') return 'masculin';
            // Si genre=mixte, essayer de déduire du suffixe
            if (g === 'mixte' || !g) {
                const indexSujet = Array.isArray(this.phraseAnalysee) ? this.phraseAnalysee.indexOf(sujetMot) : -1;
                if (indexSujet > 0) {
                    const precedent = this.phraseAnalysee[indexSujet - 1];
                    const textePrecedent = this.normaliserTexte(precedent && precedent.texte ? precedent.texte : '').replace(/[’']/g, '');
                    if (['la', 'une', 'cette', 'ma', 'ta', 'sa'].includes(textePrecedent)) {
                        return 'feminin';
                    }
                    if (['le', 'un', 'ce', 'cet', 'mon', 'ton', 'son'].includes(textePrecedent)) {
                        return 'masculin';
                    }
                }

                // Heuristique: pluriels féminins courants en -es, -ies, -ées
                if (/es$/i.test(t) && sujetMot.donnees && sujetMot.donnees.nombre === 'pluriel') {
                    return 'feminin'; // Très probable: amies, fleurs, billes, etc.
                }
            }
        }
        return null;
    };

    coreMethods.choisirVariationVerbeSelonSujet = function (verbeData, sujetMot, fallback = null) {
        if (!verbeData || !Array.isArray(verbeData.variations) || verbeData.variations.length === 0) {
            return this.trouverCorrectionFormeVerbaleUsuelle(fallback, sujetMot) || fallback;
        }
        const idx = this.determinerIndicePersonneSujet(sujetMot);
        const variation = verbeData.variations[idx];
        if (typeof variation === 'string' && variation.trim()) {
            const formeUsuelle = this.trouverCorrectionFormeVerbaleUsuelle(fallback, sujetMot);
            if (fallback
                && this.normaliserTexte(variation) === this.normaliserTexte(fallback)
                && formeUsuelle
                && this.normaliserTexte(formeUsuelle) !== this.normaliserTexte(fallback)) {
                return formeUsuelle;
            }
            return variation;
        }
        return this.trouverCorrectionFormeVerbaleUsuelle(fallback, sujetMot) || fallback;
    };

    coreMethods.ajusterCorrectionVerbeSelonSujet = function (correction, sujetMot) {
        const corr = String(correction || '').toLowerCase().trim();
        if (!corr || !sujetMot || !sujetMot.texte) return corr;

        const formeUsuelle = this.trouverCorrectionFormeVerbaleUsuelle(corr, sujetMot);
        if (formeUsuelle) {
            return formeUsuelle;
        }

        const donneesCorr = this.getWordData(corr);
        if (!this.estType(donneesCorr, 'verbe')) return corr;

        const sujet = this.normaliserTexte(sujetMot.texte).replace(/[’']/g, '');
        const sujetsJeTu = new Set(['j', 'je', 'tu']);
        const sujetsTroisieme = new Set(['il', 'elle', 'on', 'ce', 'ca', 'cela']);

        if (sujetsJeTu.has(sujet) && corr.endsWith('t')) {
            const candidat = `${corr.slice(0, -1)}s`;
            const donneesCandidat = this.getWordData(candidat);
            if (this.estType(donneesCandidat, 'verbe')) {
                return candidat;
            }
        }

        if (sujetsTroisieme.has(sujet) && corr.endsWith('s')) {
            const candidat = `${corr.slice(0, -1)}t`;
            const donneesCandidat = this.getWordData(candidat);
            if (this.estType(donneesCandidat, 'verbe')) {
                return candidat;
            }
        }

        return corr;
    };

    coreMethods.getNombreSujet = function (sujet) {
        if (!sujet.donnees) {
            const texte = this.normaliserTexte(sujet && sujet.texte ? sujet.texte : '').replace(/[’']/g, '');
            if (['ils', 'elles', 'nous', 'vous'].includes(texte)) return 'pluriel';
            if (['je', 'j', 'tu', 'il', 'elle', 'on'].includes(texte)) return 'singulier';
            if (/[sx]$/.test(texte) && texte.length >= 3) return 'pluriel';
            return null;
        }

        if (this.estType(sujet.donnees, 'nom')) {
            const texte = this.normaliserTexte(sujet && sujet.texte ? sujet.texte : '').replace(/[’']/g, '');
            const nombreDict = this.normaliserNombre(sujet.donnees.nombre);
            if (nombreDict === 'pluriel' && /[sx]$/.test(texte)) {
                const indexSujet = Array.isArray(this.phraseAnalysee) ? this.phraseAnalysee.indexOf(sujet) : -1;
                if (indexSujet > 0) {
                    const precedent = this.phraseAnalysee[indexSujet - 1];
                    const textePrecedent = this.normaliserTexte(precedent && precedent.texte ? precedent.texte : '').replace(/[’']/g, '');
                    if (['la', 'le', 'un', 'une', 'ce', 'cet', 'cette', 'mon', 'ma', 'ton', 'ta', 'son', 'sa', 'chaque'].includes(textePrecedent)) {
                        return 'singulier';
                    }
                }
            }
        }

        return this.normaliserNombre(sujet.donnees.nombre);
    };

    coreMethods.accordCorrect = function (mot1, mot2) {
        const genre1 = this.normaliserGenre(mot1.genre);
        const genre2 = this.normaliserGenre(mot2.genre);
        const nombre1 = this.normaliserNombre(mot1.nombre);
        const nombre2 = this.normaliserNombre(mot2.nombre);

        const genreOK = !genre1 || !genre2 || genre1 === 'mixte' || genre2 === 'mixte' || genre1 === genre2;
        const nombreOK = !nombre1 || !nombre2 || nombre1 === nombre2;
        return genreOK && nombreOK;
    };

    coreMethods.suggereCorrectionDeterminant = function (determinant, nom) {
        const nombreCible = this.normaliserNombre(nom.nombre);
        const genreCible = this.normaliserGenre(nom.genre);

        // Recherche d'un déterminant approprié dans la structure plate
        for (const [clef, entree] of Object.entries(this.dictionnaire.mots)) {
            const det = Array.isArray(entree) ? entree[0] : entree;
            if (!this.estType(det, 'déterminant')) continue;
            const nombreDet = this.normaliserNombre(det.nombre);
            const genreDet = this.normaliserGenre(det.genre);

            if (nombreDet && nombreDet === nombreCible &&
                (!genreCible || !genreDet || genreDet === 'mixte' || genreDet === genreCible)) {
                return clef;
            }
        }

        return determinant.variations ? determinant.variations[0] : determinant;
    };

    coreMethods.verifierFormeVerbaleApresAuxiliaire = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierFormeVerbaleApresAuxiliaire !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierFormeVerbaleApresAuxiliaire');
        }

        return categories.verifierFormeVerbaleApresAuxiliaire.call(this);
    };

    coreMethods.verifierSubjonctifApresConjonction = function () {
        // Détecte les erreurs de subjonctif après "fallait que", "il faut que", etc.
        const CONJONCTIONS_SUBJONCTIF = ['fallait', 'faut', 'faudrait', 'faudra', 'fallait'];
        const FORMES_SUBJONCTIF_COURANT = new Set([
            'sois', 'soit', 'soyons', 'soyez', 'soient',
            'aie', 'ait', 'ayons', 'ayez', 'aient',
            'fasse', 'fasses', 'fassiez', 'fassent',
            'vienne', 'viennes', 'veniez', 'viennent',
            'prenne', 'prennes', 'preniez', 'prennent',
            'dise', 'dises', 'disiez', 'disent',
            'aille', 'ailles', 'alliez', 'aillent',
            'pense', 'penses', 'pensions', 'pensiez', 'pensent',
            'aime', 'aimes', 'aimions', 'aimiez', 'aiment',
            'sache', 'saches', 'sachions', 'sachiez', 'sachent',
            'oublie', 'oublies', 'oubliions', 'oubliiez', 'oublient'
        ]);
        
        for (let i = 0; i < this.phraseAnalysee.length - 2; i++) {
            const mot = this.phraseAnalysee[i];
            if (!mot || !mot.texte) continue;
            
            const texte = this.normaliserTexte(mot.texte);
            if (!CONJONCTIONS_SUBJONCTIF.includes(texte)) continue;
            
            // Chercher "que" après "fallait"
            let idxQue = -1;
            for (let j = i + 1; j < this.phraseAnalysee.length && j <= i + 3; j++) {
                const mj = this.phraseAnalysee[j];
                if (!mj) continue;
                let tj = this.normaliserTexte(mj.texte);
                let tjClean = tj.replace(/['`']/g, '');
                if (tjClean === 'que' || tjClean === 'qu') {
                    idxQue = j;
                    break;
                }
            }
            
            if (idxQue < 0) continue;
            
            // Chercher le sujet après "que"
            const CLITIQUES = ['me', 'm\'', 'te', 't\'', 'se', 's\'', 'moi', 'toi', 'lui', 'leur', 'ne', 'n\'', 'pas', 'plus', 'jamais', 'y', 'en'];
            let sujetTexte = null;
            let sujetNombre = null;
            for (let j = idxQue + 1; j < this.phraseAnalysee.length && j <= idxQue + 3; j++) {
                const mj = this.phraseAnalysee[j];
                if (!mj) continue;
                const tj = this.normaliserTexte(mj.texte);
                if (!CLITIQUES.includes(tj) && ['pronom', 'nom'].includes(mj.donnees?.type || '')) {
                    sujetTexte = tj;
                    sujetNombre = this.getNombreSujet(mj);
                    break;
                }
            }
            
            // Chercher le verbe après "que" (en sautant les clitiques et les negations)
            let idxVerbe = -1;
            let motVerbe = null;
            for (let j = idxQue + 1; j < this.phraseAnalysee.length && j <= idxQue + 6; j++) {
                const mj = this.phraseAnalysee[j];
                if (!mj) continue;
                const tj = this.normaliserTexte(mj.texte);
                // Chercher un verbe CONNU OU un mot qui ressemble à un verbe
                const isKnownVerb = this.estType(mj.donnees, 'verbe');
                const couldBeVerbForm = !CLITIQUES.includes(tj) && /[aeiouàâäéèêëîïôöùûüÿ]/.test(tj);
                
                if (isKnownVerb || (couldBeVerbForm && j >= idxQue + 2)) {
                    idxVerbe = j;
                    motVerbe = mj;
                    break;
                }
            }
            
            if (idxVerbe < 0 || !motVerbe) continue;
            
            const formeVerbe = this.normaliserTexte(motVerbe.texte);
            
            // Si c'est déjà un subjonctif connu, ne pas marquer comme erreur
            if (FORMES_SUBJONCTIF_COURANT.has(formeVerbe)) {
                continue;
            }
            
            // Mapping indicatif → subjonctif selon le sujet
            // Structure: { indicatif: { tu: subjonctif, vous: subjonctif, ... }, ... }
            const mapIndToSubjByPerson = {
                'prends': { tu: 'prennes', vous: 'preniez', other: 'prenne' },
                'prend': { tu: 'prennes', vous: 'preniez', other: 'prenne' },
                'prenons': { nous: 'prenions' },
                'prenez': { vous: 'preniez' },
                'dis': { tu: 'dises', vous: 'disiez', other: 'dise' },
                'dit': { tu: 'dises', vous: 'disiez', other: 'dise' },
                'disons': { nous: 'disions' },
                'dites': { vous: 'disiez' },
                'fais': { tu: 'fasses', vous: 'fassiez', other: 'fasse' },
                'fait': { tu: 'fasses', vous: 'fassiez', other: 'fasse' },
                'faisons': { nous: 'fassions' },
                'faites': { vous: 'fassiez' },
                'viens': { tu: 'viennes', vous: 'veniez', other: 'vienne' },
                'vient': { tu: 'viennes', vous: 'veniez', other: 'vienne' },
                'viene': { tu: 'viennes', vous: 'veniez', other: 'vienne' },
                'vienes': { tu: 'viennes', vous: 'veniez', other: 'vienne' },
                'venons': { nous: 'venions' },
                'venez': { vous: 'veniez' },
                'oublies': { tu: 'oublies', vous: 'oubliiez', other: 'oublie' },
                'oublie': { tu: 'oublies', vous: 'oubliiez', other: 'oublie' },
                'oublions': { nous: 'oubliions' },
                'oubliez': { vous: 'oubliiez' },
                'penses': { tu: 'penses', vous: 'pensiez', other: 'pense' },
                'pense': { tu: 'penses', vous: 'pensiez', other: 'pense' },
                'pensons': { nous: 'pensions' },
                'pensez': { vous: 'pensiez' },
                'aimes': { tu: 'aimes', vous: 'aimiez', other: 'aime' },
                'aime': { tu: 'aimes', vous: 'aimiez', other: 'aime' },
                'aimons': { nous: 'aimions' },
                'aimez': { vous: 'aimiez' }
            };
            
            // Chercher si le verbe est une mauvaise forme
            let correctionSubjonctif = null;
            
            // D'abord vérifier si c'est une forme presque correcte (avec une lettre de trop)
            // Ex: "oubliezs" → "oubliez" (après suppression du 's')
            if (formeVerbe.endsWith('s') && formeVerbe.length > 2) {
                const formeWithoutS = formeVerbe.slice(0, -1);
                if (mapIndToSubjByPerson[formeWithoutS] !== undefined) {
                    const mapping = mapIndToSubjByPerson[formeWithoutS];
                    if (sujetTexte) {
                        if (sujetTexte === 'tu' && mapping.tu) correctionSubjonctif = mapping.tu;
                        else if (sujetTexte === 'vous' && mapping.vous) correctionSubjonctif = mapping.vous;
                        else if (sujetTexte === 'nous' && mapping.nous) correctionSubjonctif = mapping.nous;
                        else if (mapping.other) correctionSubjonctif = mapping.other;
                    } else if (mapping.other) {
                        correctionSubjonctif = mapping.other;
                    }
                }
            }
            
            // Sinon utiliser le mapping direct
            if (!correctionSubjonctif && mapIndToSubjByPerson[formeVerbe]) {
                const mapping = mapIndToSubjByPerson[formeVerbe];
                if (sujetTexte) {
                    if (sujetTexte === 'tu' && mapping.tu) correctionSubjonctif = mapping.tu;
                    else if (sujetTexte === 'vous' && mapping.vous) correctionSubjonctif = mapping.vous;
                    else if (sujetTexte === 'nous' && mapping.nous) correctionSubjonctif = mapping.nous;
                    else if (mapping.other) correctionSubjonctif = mapping.other;
                } else if (mapping.other) {
                    correctionSubjonctif = mapping.other;
                }
            }
            
            if (correctionSubjonctif && correctionSubjonctif !== formeVerbe) {
                const erreur = {
                    type: 'conjugaison_verbe',
                    position: idxVerbe,
                    mot: motVerbe.texte,
                    correction: correctionSubjonctif,
                    explication: `Après "${texte} que", le verbe doit être au subjonctif.`,
                    regle: `Le subjonctif s'utilise après les verbes d'obligation et d'hypothèse comme falloir, il faut, il faudrait.`
                };
                this.erreursTrouvees.push(erreur);
                if (!motVerbe.erreurs) motVerbe.erreurs = [];
                motVerbe.erreurs.push(erreur);
            }
        }
    };

    coreMethods.epurerErreursVerbalesSecondaires = function () {
        const positionsSpecifiques = new Set(
            this.erreursTrouvees
                .filter((e) => e && (e.type === 'verbe_infinitif_requis' || e.type === 'verbe_participe_requis'))
                .map((e) => e.position)
        );

        if (positionsSpecifiques.size === 0) return;

        this.erreursTrouvees = this.erreursTrouvees.filter((e) => {
            if (!e) return false;
            if (e.type !== 'conjugaison_verbe') return true;
            return !positionsSpecifiques.has(e.position);
        });

        for (const mot of this.phraseAnalysee) {
            if (!mot || !Array.isArray(mot.erreurs)) continue;
            mot.erreurs = mot.erreurs.filter((e) => {
                if (!e) return false;
                if (e.type !== 'conjugaison_verbe') return true;
                return !positionsSpecifiques.has(e.position);
            });
        }
    };

    coreMethods.verifierInfinitifApresPreposition = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierInfinitifApresPreposition !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierInfinitifApresPreposition');
        }

        return categories.verifierInfinitifApresPreposition.call(this);
    };

    coreMethods.verifierHomophonesContextuels = function () {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : null;

        if (!categories || typeof categories.verifierHomophonesContextuels !== 'function') {
            throw new Error('Module homophones non chargé: analyseur/categories/homophones.js');
        }

        return categories.verifierHomophonesContextuels.call(this);
    };

    coreMethods.suggereCorrectionVerbe = function (verbe, nombreSujet, motTexte = null, sujetMot = null) {
        const formeUsuelle = sujetMot ? this.trouverCorrectionFormeVerbaleUsuelle(motTexte || verbe.texte || verbe, sujetMot) : null;
        if (formeUsuelle) {
            return formeUsuelle;
        }

        if (!verbe.variations) {
            const base = motTexte || verbe.texte || verbe;
            return this.proposerFormeVerbeParNombre(base, nombreSujet) || base;
        }

        const variationPersonne = this.choisirVariationVerbeSelonSujet(verbe, sujetMot, null);
        if (variationPersonne) {
            const dataVariation = this.getWordData(variationPersonne);
            const nombreVariation = dataVariation ? this.normaliserNombre(dataVariation.nombre) : null;
            const nombreObserve = this.normaliserNombre(verbe && verbe.nombre);
            const variationEgaleFormeObservee = !!(motTexte && this.normaliserTexte(variationPersonne) === this.normaliserTexte(motTexte));
            if (variationEgaleFormeObservee && nombreSujet && nombreObserve && nombreObserve !== nombreSujet) {
                // La table a simplement renvoyé la forme observée, qui est justement au mauvais nombre.
            } else if (!nombreSujet || !nombreVariation || nombreVariation === nombreSujet) {
                return variationPersonne;
            }
        }

        // Pour un sujet pluriel, on cherche la 3e personne du pluriel (ils/elles)
        // Pour un sujet singulier, on cherche la 3e personne du singulier (il/elle)
        const personneCible = '3e'; // Toujours 3e personne pour un sujet nominal
        
        // Recherche de la bonne variation selon le nombre et la personne
        for (const variation of verbe.variations) {
            const variationData = this.getWordData(variation);
            if (variationData && 
                this.normaliserNombre(variationData.nombre) === nombreSujet && 
                variationData.personne === personneCible) {
                return variation;
            }
        }

        // Fallback: pour un sujet pluriel, retourner la dernière variation (ils/elles -> -ent)
        // Ordre standard: je, tu, il/elle, nous, vous, ils/elles
        if (nombreSujet === 'pluriel') {
            // Chercher la variation qui finit par "-ent"
            for (const variation of verbe.variations) {
                if (variation.endsWith('ent')) {
                    return variation;
                }
            }

            // Si la table est incomplète (ex: ["mange"]), essayer une forme plausible.
            const basePlural = motTexte || verbe.variations[0];
            const propositionPlural = this.proposerFormeVerbeParNombre(basePlural, nombreSujet);
            if (propositionPlural) {
                return propositionPlural;
            }

            // Sinon dernière variation
            if (verbe.variations.length > 0) {
                const derniere = verbe.variations[verbe.variations.length - 1];
                return derniere;
            }
        }
        
        // Heuristique morphologique si la table des variations est incomplète (ex: "mange" seul)
        const base = motTexte || verbe.variations[0];
        const proposition = this.proposerFormeVerbeParNombre(base, nombreSujet);
        if (proposition) {
            return proposition;
        }

        // Pour singulier, première variation
        return verbe.variations[0];
    };

    coreMethods.proposerFormeVerbeParNombre = function (motTexte, nombreSujet) {
        const mot = (motTexte || '').toLowerCase().trim();
        if (!mot) return null;

        const donneesMot = this.getWordData(mot);
        if (donneesMot && this.estType(donneesMot, 'verbe')) {
            const nombreMot = this.normaliserNombre(donneesMot.nombre);
            if (!nombreMot || nombreMot === nombreSujet) {
                return mot;
            }
        }

        const candidats = [];
        if (nombreSujet === 'pluriel') {
            if (mot.endsWith('ent') || mot.endsWith('ont')) {
                candidats.push(mot);
            } else if (mot.endsWith('es')) {
                candidats.push(`${mot.slice(0, -2)}ent`);
            } else if (mot.endsWith('e')) {
                candidats.push(`${mot}nt`);
            } else {
                candidats.push(`${mot}ent`);
            }
        } else if (nombreSujet === 'singulier') {
            if (mot.endsWith('issent')) {
                candidats.push(`${mot.slice(0, -6)}it`);
            }
            if (mot.endsWith('ent')) {
                candidats.push(`${mot.slice(0, -3)}e`);
            }
            if (mot.endsWith('ont')) {
                candidats.push(`${mot.slice(0, -3)}a`);
            }
            candidats.push(mot);
        }

        for (const candidat of candidats) {
            const donnees = this.getWordData(candidat);
            if (donnees && this.estType(donnees, 'verbe')) {
                const nombre = this.normaliserNombre(donnees.nombre);
                if (!nombre || nombre === nombreSujet) {
                    return candidat;
                }
            }
        }

        if (donneesMot && this.estType(donneesMot, 'verbe')) {
            const nombreMot = this.normaliserNombre(donneesMot.nombre);
            if (!nombreMot || !nombreSujet || nombreMot === nombreSujet) {
                return mot;
            }
        }

        return null;
    };

    coreMethods.genererOptionsConjugaisonPedagogiques = function (correction, motErreur, nombreSujet = null) {
        const corr = (correction || '').toLowerCase().trim();
        const source = (motErreur || '').toLowerCase().trim();
        const cibleOptions = 4;
        const minimumOptions = 3;
        const options = new Set();
        if (corr) options.add(corr);
        if (source && source !== corr) options.add(source);

        const ajouterSiVerbe = (forme) => {
            const f = (forme || '').toLowerCase().trim();
            if (!f || options.has(f)) return;
            const data = this.getWordData(f);
            if (data && this.estType(data, 'verbe')) {
                options.add(f);
            }
        };

        const donneesCorr = this.getWordData(corr);
        if (donneesCorr && this.estType(donneesCorr, 'verbe') && Array.isArray(donneesCorr.variations) && donneesCorr.variations.length >= 3) {
            const variations = donneesCorr.variations.map((v) => (v || '').toLowerCase().trim()).filter(Boolean);
            if (nombreSujet === 'pluriel') {
                if (variations[5]) options.add(variations[5]);
                if (variations[2]) options.add(variations[2]);
            } else if (nombreSujet === 'singulier') {
                if (variations[2]) options.add(variations[2]);
                if (variations[5]) options.add(variations[5]);
            } else {
                if (variations[0]) options.add(variations[0]);
                if (variations[5]) options.add(variations[5]);
            }
        }

        if (corr) {
            if (corr.endsWith('s')) options.add(corr.slice(0, -1));
            else options.add(`${corr}s`);

            if (corr.endsWith('ent')) options.add(`${corr.slice(0, -3)}e`);
            else if (corr.endsWith('e')) options.add(`${corr}nt`);
        }

        // Cas irréguliers fréquents pour éviter des distracteurs absurdes (ex: vaisc).
        const variantesIrregulieres = {
            vais: ['vas', 'va', 'vont', 'allez', 'allons'],
            vas: ['vais', 'va', 'vont', 'allez', 'allons'],
            va: ['vais', 'vas', 'vont', 'allons', 'allez'],
            vont: ['vais', 'vas', 'va', 'allons', 'allez'],
            suis: ['es', 'est', 'sommes', 'etes', 'sont'],
            est: ['suis', 'es', 'sommes', 'etes', 'sont'],
            ai: ['as', 'a', 'avons', 'avez', 'ont'],
            as: ['ai', 'a', 'avons', 'avez', 'ont'],
            a: ['ai', 'as', 'avons', 'avez', 'ont'],
            fait: ['fais', 'font', 'faisons', 'faites'],
            fais: ['fait', 'font', 'faisons', 'faites']
        };

        if (variantesIrregulieres[corr]) {
            variantesIrregulieres[corr].forEach(ajouterSiVerbe);
        }

        // Fallback morphologique simple mais filtré par dictionnaire.
        const base = corr.replace(/(ais|ait|aient|ons|ez|ent|es|e|s)$/i, '');
        const suffixes = ['e', 'es', 'ent', 'ons', 'ez', 'ai', 'as', 'a', 'ont', 'ait', 'aient'];
        for (const suf of suffixes) {
            if (options.size >= cibleOptions) break;
            if (!base) break;
            ajouterSiVerbe(`${base}${suf}`);
        }

        // En dernier recours, conserver une option proche issue de la proposition élève.
        if (options.size < minimumOptions && source && !options.has(source)) {
            options.add(source);
        }

        const filtrees = [...options].filter(Boolean).slice(0, cibleOptions);

        return this.melangerTableau(filtrees);
    };

    coreMethods.suggereCorrectionAdjectif = function (adjectif, nom, motTexte = '') {
        if (!adjectif || !nom) return (adjectif && adjectif.variations && adjectif.variations[0]) ? adjectif.variations[0] : motTexte;
        if (!adjectif.variations) return motTexte || adjectif;

        const genreCible = this.normaliserGenre(nom.genre) || nom.genre;
        const nombreCible = this.normaliserNombre(nom.nombre) || nom.nombre;
        const candidats = new Set();

        adjectif.variations.forEach((variation) => {
            if (variation) candidats.add(String(variation).toLowerCase());
        });

        const motSource = String(motTexte || '').toLowerCase().trim();
        if (motSource) {
            candidats.add(motSource);
            if (motSource.endsWith('s') && motSource.length > 2) {
                candidats.add(motSource.slice(0, -1));
            }
            if (motSource.endsWith('x') && motSource.length > 2) {
                candidats.add(motSource.slice(0, -1));
            }
            if (motSource.endsWith('aux') && motSource.length > 3) {
                candidats.add(`${motSource.slice(0, -3)}al`);
            }
        }

        // Recherche de la bonne variation
        for (const variation of candidats) {
            const variationData = this.getWordData(variation);
            if (variationData && 
                this.estType(variationData, 'adjectif') &&
                this.normaliserGenre(variationData.genre) === this.normaliserGenre(genreCible) && 
                this.normaliserNombre(variationData.nombre) === this.normaliserNombre(nombreCible)) {
                return variation;
            }
        }

        // Fallback morphologique : appliquer les règles de genre/nombre si aucune variation trouvée dans le dict
        if (motSource) {
            const nombreCibleNorm = this.normaliserNombre(nombreCible);
            const genreCibleNorm = this.normaliserGenre(genreCible);

            const irreguliers = new Map([
                ['vieux|féminin|singulier', 'vieille'],
                ['neuf|féminin|singulier', 'neuve'],
                ['neuf|féminin|pluriel', 'neuves'],
                ['sportif|féminin|pluriel', 'sportives'],
                ['ouvert|féminin|singulier', 'ouverte'],
                ['lourd|féminin|singulier', 'lourde']
            ]);
            const cleIrreg = `${motSource}|${genreCibleNorm}|${nombreCibleNorm}`;
            if (irreguliers.has(cleIrreg)) {
                return irreguliers.get(cleIrreg);
            }

            if (nombreCibleNorm === 'pluriel') {
                if (motSource.endsWith('eau')) {
                    return `${motSource.slice(0, -3)}eaux`;
                }
                // Chercher d'abord dans le dict
                const candidatS = motSource + 's';
                const dS = this.getWordData(candidatS);
                if (dS && this.estType(dS, 'adjectif') && this.normaliserNombre(dS.nombre) === 'pluriel') return candidatS;
                // Fallback direct (incroyable → incroyables)
                if (!motSource.endsWith('s') && !motSource.endsWith('x') && !motSource.endsWith('z')) {
                    return motSource + 's';
                }
            } else if (nombreCibleNorm === 'singulier' && genreCibleNorm === 'féminin') {
                const candidatE = motSource + 'e';
                const dE = this.getWordData(candidatE);
                if (dE && this.estType(dE, 'adjectif')) return candidatE;
                if (!motSource.endsWith('e')) return motSource + 'e';
            }
        }
        return motSource || adjectif.variations[0];
    };

    coreMethods.genererQuestionAide = function (erreur, contexte) {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.genererQuestionAide !== 'function') {
            throw new Error('Module catégorie non chargé pour genererQuestionAide');
        }

        return categories.genererQuestionAide.call(this, erreur, contexte);
    };

    coreMethods.verifierReponse = function (question, reponse, contexte) {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierReponse !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierReponse');
        }

        return categories.verifierReponse.call(this, question, reponse, contexte);
    };

    coreMethods.verifierSelection = function (cible, reponse, contexte) {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierSelection !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierSelection');
        }

        return categories.verifierSelection.call(this, cible, reponse, contexte);
    };

    coreMethods.verifierChoix = function (question, reponse, contexte) {
        const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            ? window.AbeAnalyseurCategories
            : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                ? globalThis.AbeAnalyseurCategories
                : null;

        if (!categories || typeof categories.verifierChoix !== 'function') {
            throw new Error('Module catégorie non chargé pour verifierChoix');
        }

        return categories.verifierChoix.call(this, question, reponse, contexte);
    };

    coreMethods.trouverMotsSimilaires = function (mot, correctionProbable = null) {
        const motLower = (mot || '').toLowerCase().trim();
        if (!motLower || !this.dictionnaire || !this.dictionnaire.mots) return [];

        const normaliserIndice = (value) => this
            .normaliserTexte(value || '')
            .replace(/[’'\-\s]/g, '');

        const prefixesDerivation = ['re', 'de', 'me', 'im', 'in', 'pre', 'sur'];
        const suffixesDerivation = ['er', 'ir', 're', 'ment', 'ements', 'tion', 'sion', 'age', 'ure', 'able', 'ible', 'if', 'ive', 'eux', 'euse', 'iser', 'isation'];

        const longueurPrefixeCommun = (a, b) => {
            const max = Math.min(a.length, b.length);
            let i = 0;
            while (i < max && a[i] === b[i]) i += 1;
            return i;
        };

        const stemsDepuis = (value) => {
            const v = (value || '').toLowerCase().trim();
            if (!v) return [];
            const stems = new Set();
            stems.add(v);
            const racine = this.extraireRacine(v);
            if (racine && racine.length >= 5) stems.add(racine);
            const baseFlex = v.replace(/(es|s|e|ent|ant|ante|ants|antes)$/i, '');
            if (baseFlex && baseFlex.length >= 5) stems.add(baseFlex);
            const simple = normaliserIndice(v);
            if (simple && simple.length >= 5) stems.add(simple);
            return [...stems].filter((s) => s.length >= 5);
        };

        const dedupeParMot = (liste) => {
            const map = new Map();
            for (const item of liste) {
                if (!item || !item.mot) continue;
                const cle = item.mot.toLowerCase();
                if (!map.has(cle) || (item.score || 999) < (map.get(cle).score || 999)) {
                    map.set(cle, item);
                }
            }
            return [...map.values()];
        };

        const motNorm = normaliserIndice(motLower);
        const correctionNorm = correctionProbable ? normaliserIndice(correctionProbable) : '';
        const exclusions = new Set([motNorm]);
        if (correctionNorm) exclusions.add(correctionNorm);

        const filtrerSortie = (liste) => dedupeParMot(liste)
            .filter((x) => x && x.mot && !exclusions.has(normaliserIndice(x.mot)))
            .sort((a, b) => (a.score || 999) - (b.score || 999) || (a.distance || 999) - (b.distance || 999))
            .map((x) => ({ ...x, mot: this.reparerTexteMojibake(x.mot) }))
            .slice(0, 4);

        const baseCorrection = correctionProbable || this.trouverMotCorrection(motLower) || '';
        const stems = stemsDepuis(baseCorrection);
        const baseCorrLower = (baseCorrection || '').toLowerCase();

        const formesFlexionSimples = new Set();
        const formesFlexionNorm = new Set();
        const ajouterFlexion = (f) => {
            if (!f) return;
            formesFlexionSimples.add(f);
            formesFlexionNorm.add(normaliserIndice(f));
        };
        if (baseCorrLower) {
            ajouterFlexion(baseCorrLower);
            ajouterFlexion(`${baseCorrLower}s`);
            ajouterFlexion(`${baseCorrLower}e`);
            ajouterFlexion(`${baseCorrLower}es`);
            ajouterFlexion(`${baseCorrLower}ent`);
            if (baseCorrLower.endsWith('e')) {
                const sansE = baseCorrLower.slice(0, -1);
                ajouterFlexion(sansE);
                ajouterFlexion(`${sansE}s`);
            }
        }

        const candidatsFamille = [];
        for (const [cle, donnees] of Object.entries(this.dictionnaire.mots)) {
            const cleLower = cle.toLowerCase();
            const cleNorm = normaliserIndice(cleLower);
            if (exclusions.has(cleNorm)) continue;

            const distanceMot = this.calculerDistance(motLower, cleLower, true);
            const baseCorrNorm = baseCorrLower ? normaliserIndice(baseCorrLower) : '';
            const distanceCorr = baseCorrection ? this.calculerDistance(baseCorrNorm, cleNorm, true) : 999;
            const prefixeCommun = baseCorrection ? longueurPrefixeCommun(baseCorrNorm, cleNorm) : 0;

            let meilleurStem = '';
            for (const stem of stems) {
                const stemNorm = normaliserIndice(stem);
                if (stemNorm && cleNorm.includes(stemNorm)) {
                    if (stem.length > meilleurStem.length) meilleurStem = stem;
                }
            }

            const meilleurStemNorm = normaliserIndice(meilleurStem);

            const estDerive = !!meilleurStem && (
                cleNorm.startsWith(meilleurStemNorm) ||
                suffixesDerivation.some((s) => cleNorm === `${meilleurStemNorm}${normaliserIndice(s)}` || cleNorm.endsWith(`${meilleurStemNorm}${normaliserIndice(s)}`)) ||
                prefixesDerivation.some((p) => cleNorm.startsWith(`${normaliserIndice(p)}${meilleurStemNorm}`))
            );

            const estFlexionSimple = formesFlexionSimples.has(cleLower) || formesFlexionNorm.has(cleNorm);
            if (estFlexionSimple) continue;

            const ecartLongueur = baseCorrLower ? Math.abs(cleLower.length - baseCorrLower.length) : 0;

            const stemAncre = !!meilleurStem && (
                cleNorm.startsWith(meilleurStemNorm) ||
                prefixesDerivation.some((p) => cleNorm.startsWith(`${normaliserIndice(p)}${meilleurStemNorm}`))
            );

            const estMemeFamille = correctionProbable
                ? (meilleurStem.length >= 5 && stemAncre && (estDerive || ecartLongueur >= 2))
                : (meilleurStem.length >= 5 && (estDerive || (prefixeCommun >= 5 && ecartLongueur >= 2) || (distanceCorr <= 5 && ecartLongueur >= 2)));

            if (!estMemeFamille) continue;
            const distanceMaxFamille = correctionProbable ? 20 : 10;
            if (distanceMot > distanceMaxFamille) continue;

            const score = (distanceMot * 0.7) + (distanceCorr * 0.6)
                - (meilleurStem.length >= 5 ? 1.2 : 0.5)
                - (estDerive ? 0.8 : 0)
                - (prefixeCommun >= 5 ? 0.5 : 0);

            candidatsFamille.push({
                mot: cle,
                distance: distanceMot,
                donnees: donnees[0],
                score
            });
        }

        const sortieFamille = filtrerSortie(candidatsFamille);
        if (correctionProbable) {
            return sortieFamille;
        }
        if (sortieFamille.length > 0) return sortieFamille;

        // Fallback robuste: mots proches, mais sans le meilleur candidat (souvent la solution)
        const proches = [];
        for (const [cle, donnees] of Object.entries(this.dictionnaire.mots)) {
            const candidate = this.evaluerCandidatCorrection(motLower, cle);
            if (!candidate) continue;
            const cleNorm = normaliserIndice(candidate.mot);
            if (exclusions.has(cleNorm)) continue;
            proches.push({
                mot: candidate.mot,
                distance: candidate.distance,
                score: candidate.score,
                donnees: donnees[0]
            });
        }

        proches.sort((a, b) => a.score - b.score);
        const prochesSansTop = proches.slice(1);
        const sortieFallback = filtrerSortie(prochesSansTop);
        return sortieFallback;
    };

    coreMethods.trouverMotCorrection = function (mot, contexte = null) {
        const motLower = (mot || '').toLowerCase();
        if (!motLower || !this.dictionnaire || !this.dictionnaire.mots) return null;

        const correctionPrioritaire = this.trouverCorrectionLexicalePrioritaire(motLower, contexte);
        if (correctionPrioritaire) {
            return this.reparerTexteMojibake(correctionPrioritaire);
        }

        const candidats = [];
        const pool = this.obtenirCandidatsCorrection(motLower);
        for (const cle of pool) {
            const candidate = this.evaluerCandidatCorrection(motLower, cle, contexte);
            if (candidate) {
                candidats.push(candidate);
            }
        }

        candidats.sort((a, b) => a.score - b.score);
        return candidats.length > 0 ? this.reparerTexteMojibake(candidats[0].mot) : null;
    };

    coreMethods.evaluerCandidatCorrection = function (motLower, cle, contexte = null) {
        if (!motLower || !cle) return null;
        const cleLower = cle.toLowerCase();
        const distance = this.calculerDistance(motLower, cleLower, true);
        const phonetiqueMot = this.simplifierPhonetique(motLower);
        const phonetiqueCle = this.simplifierPhonetique(cleLower);
        const distancePhonetique = this.calculerDistance(phonetiqueMot, phonetiqueCle, true);

        // Accepter un peu plus large pour les graphies phonétiques (ex: bocou -> beaucoup)
        const maxDistance = distancePhonetique === 0 ? 4 : (distancePhonetique === 1 ? 3 : 2);
        if (distance > maxDistance || distance <= 0) return null;

        // Score: distance + bonus
        let score = distance;

        // Bonus si le mot cherché est un préfixe du mot trouvé (ex: "tar" -> "tard")
        if (cleLower.startsWith(motLower)) {
            score -= 0.5;
        }

        // Bonus si même première lettre
        if (cleLower[0] === motLower[0]) {
            score -= 0.2;
        }

        // Bonus si même début de mot (souvent indicatif d'une faute orthographique simple)
        if (cleLower.length >= 2 && motLower.length >= 2 && cleLower.slice(0, 2) === motLower.slice(0, 2)) {
            score -= 0.4;
        }

        // Bonus phonétique fort
        if (distancePhonetique === 0) {
            score -= 3.0;
        } else if (distancePhonetique === 1) {
            score -= 0.4;
        }

        // Bonus supplémentaire si la correction correspond à une confusion phonographique fréquente
        // (ex: contant -> content, bocou -> beaucoup).
        const typeConfusionPhono = this.detecterTypeConfusionPhonographique(motLower, cleLower);
        if (typeConfusionPhono) {
            score -= 1.2;
        }

        // Bonus de contexte: si le mot suivant est un nom, favoriser le déterminant compatible.
        if (contexte && Array.isArray(contexte.phrase) && typeof contexte.indexMot === 'number') {
            const motAvant = contexte.indexMot > 0 ? contexte.phrase[contexte.indexMot - 1] : null;
            const motApres = contexte.phrase[contexte.indexMot + 1];
            const donneesCandidat = this.getWordData(cleLower);
            const typeCandidat = this.normaliserType(donneesCandidat && donneesCandidat.type);
            if (motApres && motApres.donnees && this.normaliserType(motApres.donnees.type) === 'nom' && donneesCandidat) {
                if (typeCandidat === 'déterminant') {
                    score -= 1.0;
                    const nombreNom = this.normaliserNombre(motApres.donnees.nombre);
                    const nombreCand = this.normaliserNombre(donneesCandidat.nombre);
                    if (nombreNom && nombreCand && nombreNom === nombreCand) {
                        score -= 1.6;
                    } else if (nombreNom && nombreCand && nombreNom !== nombreCand) {
                        score += 1.0;
                    }
                }
            }

            if (donneesCandidat && typeCandidat === 'verbe') {
                const avantDeterminant = !!motAvant && this.estDeterminantNominalToken(motAvant);
                const avantNombre = !!motAvant && this.estDeterminantOuNombrePlurielToken(motAvant);
                const suitCopule = !!motApres && this.estFormeEtreTexte(motApres.texte);
                const suitAdjectif = !!motApres && this.estType(motApres.donnees, 'adjectif');
                if (avantDeterminant || avantNombre) {
                    score += 3.0;
                }
                if (suitCopule && avantDeterminant) {
                    score += 3.0;
                }
                if (suitAdjectif && avantDeterminant) {
                    score += 1.5;
                }
            }

            if (donneesCandidat && ['préposition', 'adverbe'].includes(typeCandidat)) {
                const motPrecNormalise = this.normaliserTexte(motAvant && motAvant.texte ? motAvant.texte : '');
                if (['suis', 'es', 'est', 'sommes', 'etes', 'sont'].includes(motPrecNormalise)) {
                    score -= 0.8;
                }
            }

            if (this.corpusBescherelleActif) {
                const voisinGauche = this.obtenirVoisinLexicalNormaliseDepuisPhrase(contexte.phrase, contexte.indexMot, -1);
                const voisinDroite = this.obtenirVoisinLexicalNormaliseDepuisPhrase(contexte.phrase, contexte.indexMot, 1);

                if (voisinGauche || voisinDroite) {
                    const motNorm = this.normaliserMotSimple(motLower);
                    const candNorm = this.normaliserMotSimple(cleLower);

                    const scoreContexteMot = this.scoreContexteMotCorpusBescherelle(voisinGauche, motNorm, voisinDroite);
                    const scoreContexteCand = this.scoreContexteMotCorpusBescherelle(voisinGauche, candNorm, voisinDroite);
                    const deltaContexte = scoreContexteCand - scoreContexteMot;

                    const bonusContexte = Math.max(-2.5, Math.min(2.5, deltaContexte * 1.2));
                    score -= bonusContexte;

                    const freqMot = this.obtenirFrequenceCorpus(this.frequencesUnigrammesBescherelle, motNorm);
                    const freqCand = this.obtenirFrequenceCorpus(this.frequencesUnigrammesBescherelle, candNorm);
                    if (freqCand > 0) {
                        score -= Math.min(1.2, Math.log10(freqCand + 1) * 0.35);
                    }
                    if (freqCand > Math.max(2, freqMot * 3) && deltaContexte > 0.4) {
                        score -= 0.5;
                    }
                }
            }
        }

        // Bonus graphique léger pour accents mal placés (ex: "lé" -> "les")
        const motSimple = this.normaliserMotSimple(motLower);
        const cleSimple = this.normaliserMotSimple(cleLower);
        if (motSimple && cleSimple && motSimple === cleSimple) {
            score -= 0.6;
        }

        return { mot: cle, distance, score };
    };

    coreMethods.simplifierPhonetique = function (mot) {
        return (mot || '')
            .toLowerCase()
            .replace(/eau/g, 'o')
            .replace(/au/g, 'o')
            .replace(/ph/g, 'f')
            .replace(/qu/g, 'k')
            .replace(/(.)\1+/g, '$1')
            .replace(/([a-z])p$/g, '$1');
    };

    coreMethods.extraireRacine = function (mot) {
        const motLower = mot.toLowerCase();
        
        // Supprimer les suffixes courants pour trouver la racine
        const suffixes = [
            'issements', 'issement', 'isations', 'isation', 'ations', 'ation',
            'ements', 'ement', 'ances', 'ance', 'ences', 'ence',
            'ateurs', 'ateur', 'atrices', 'atrice',
            'utions', 'ution', 'itions', 'ition', 'tions', 'tion', 'sions', 'sion',
            'euses', 'euse', 'eurs', 'eur',
            'ables', 'able', 'ibles', 'ible',
            'ismes', 'isme', 'istes', 'iste',
            'eries', 'erie', 'iers', 'ier', 'iere', 'ieres',
            'ages', 'age', 'ures', 'ure',
            'ives', 'ive', 'ifs', 'if',
            'ants', 'antes', 'ant', 'ante',
            'ements', 'ement',
            'er', 'ir', 're', 'ons', 'ez', 'ent', 'es', 'e', 's'
        ];
        
        for (const suffixe of suffixes) {
            if (motLower.endsWith(suffixe) && motLower.length > suffixe.length + 2) {
                return motLower.slice(0, -suffixe.length);
            }
        }
        
        // Retourner le mot sans les 2 dernières lettres si possible
        return motLower.length > 3 ? motLower.slice(0, -2) : motLower;
    };

    coreMethods.calculerDistance = function (mot1, mot2, ignorerSeuilLongueur = false) {
        const len1 = mot1.length;
        const len2 = mot2.length;
        
        // Si les longueurs sont très différentes, on ignore
        if (!ignorerSeuilLongueur && Math.abs(len1 - len2) > 2) {
            return 999;
        }
        
        // Matrice de programmation dynamique pour Levenshtein simplifié
        const matrix = [];
        
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (mot1[i - 1] === mot2[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // suppression
                    );
                }
            }
        }
        
        return matrix[len1][len2];
    };

    global.AbeAnalyseurCoreMethods = Object.assign(
        global.AbeAnalyseurCoreMethods || {},
        coreMethods
    );
})(typeof window !== 'undefined' ? window : globalThis);