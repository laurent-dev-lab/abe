(function (global) {
    class AbeMainOralPedagogyClass {
construireExplicationParNatureToken(tokenDetail = null) {
    if (!tokenDetail) return null;

    const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
        ? window.AbeAnalyseurCategories
        : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
            ? globalThis.AbeAnalyseurCategories
            : null;

    if (categories && typeof categories.construireExplicationParNature === 'function') {
        return categories.construireExplicationParNature(tokenDetail);
    }

    // Fallback minimal si le module n'est pas chargé
    const nature = String(tokenDetail.nature || '').trim().toLowerCase();
    if (!nature) return null;
    return {
        titreAide: 'Aide pour ce mot',
        explication: `Le mot attendu est un ${nature}.`,
        memo: 'Vérifie l\'orthographe de ce mot.'
    };
}

obtenirAideDetailleeTokenReference(indexMot, tokenAttendu) {
    if (!Number.isInteger(indexMot) || indexMot < 0) return null;
    const entree = this.obtenirEntreeCorpusDetailleReference();
    if (!entree || !Array.isArray(entree.tokensLexicaux)) return null;

    let tokenDetail = entree.tokensLexicaux[indexMot] || null;
    if (!tokenDetail && tokenAttendu && tokenAttendu.texte) {
        const texteAttendu = this.normaliserTokenComparaison(tokenAttendu.texte);
        tokenDetail = entree.tokensLexicaux.find((token) =>
            this.normaliserTokenComparaison(token && token.texte) === texteAttendu
        ) || null;
    }
    if (!tokenDetail) return null;

    const nature = String(tokenDetail.nature || '').trim();
    const fonction = String(tokenDetail.fonction || '').trim();
    const lemme = String(tokenDetail.lemme || '').trim();
    const depType = tokenDetail.dependance && tokenDetail.dependance.type
        ? String(tokenDetail.dependance.type)
        : '';

    const idToken = Number(tokenDetail.id);
    const relationsAssociees = Array.isArray(entree.relationsGlobales)
        ? entree.relationsGlobales.filter((relation) => {
            const ids = this.extraireIdsRelationGlobale(relation);
            return ids.has(idToken);
        })
        : [];

    const natureNorm = this.normaliserTokenComparaison(nature);
    const fonctionNorm = this.normaliserTokenComparaison(fonction);
    const depNorm = this.normaliserTokenComparaison(depType);

    const phraseNature = (() => {
        if (natureNorm.includes('nom')) return 'Dans la phrase dictée, ce mot est un nom.';
        if (natureNorm.includes('verbe')) {
            const personne = String(tokenDetail.personne || '').trim();
            const mode = String(tokenDetail.mode || '').trim();
            const temps = String(tokenDetail.temps || '').trim();
            let complement = 'Dans la phrase dictée, ce mot est un verbe.';
            if (lemme) complement += ` (infinitif : ${lemme})`;
            const details = [];
            if (personne && personne !== 'null') {
                const persLabel = { '1': '1re personne', '2': '2e personne', '3': '3e personne' };
                details.push(persLabel[personne] || `${personne}e personne`);
            }
            if (mode && mode !== 'null') details.push(mode);
            if (temps && temps !== 'null') details.push(temps);
            if (details.length > 0) complement += ` Il est conjugué à la ${details.join(', ')}.`;
            return complement;
        }
        if (natureNorm.includes('adjectif')) return 'Dans la phrase dictée, ce mot est un adjectif.';
        if (natureNorm.includes('determinant') || natureNorm.includes('déterminant')) return 'Dans la phrase dictée, ce mot est un déterminant.';
        if (natureNorm.includes('pronom')) return 'Dans la phrase dictée, ce mot est un pronom.';
        return 'Dans la phrase dictée, ce mot a un rôle grammatical précis.';
    })();

    const phraseFonction = (() => {
        if (fonctionNorm.includes('sujet') || depNorm === 'nsubj') {
            if (fonctionNorm.includes('impersonnel')) return "Dans cette phrase, c'est un sujet impersonnel (il faut, il pleut…).";
            return "Dans cette phrase, sa fonction est d'être le sujet : c'est lui qui commande le verbe.";
        }
        if (depNorm === 'det' || fonctionNorm === 'déterminant') {
            return 'Dans cette phrase, il accompagne un nom.';
        }
        if (depNorm === 'amod' || fonctionNorm.includes('epithete') || fonctionNorm.includes('épithète')) {
            return 'Dans cette phrase, il sert à préciser un nom (épithète).';
        }
        if (fonctionNorm.includes('attribut')) {
            return "Dans cette phrase, il est attribut du sujet : il donne une information sur le sujet après le verbe d'état.";
        }
        if (fonctionNorm === 'cod' || depNorm === 'obj') {
            return 'Dans cette phrase, il est complément d\'objet direct (COD) : il complète le verbe directement.';
        }
        if (fonctionNorm === 'coi' || depNorm === 'iobj') {
            return 'Dans cette phrase, il est complément d\'objet indirect (COI) : il complète le verbe avec une préposition.';
        }
        if (fonctionNorm.includes('circonstanciel') || depNorm === 'obl') {
            return 'Dans cette phrase, il est complément circonstanciel : il précise quand, où ou comment se passe l\'action.';
        }
        if (fonctionNorm.includes('agent')) {
            return 'Dans cette phrase, il est complément d\'agent : il indique qui fait l\'action (après « par »).';
        }
        if (fonctionNorm.includes('complement') && fonctionNorm.includes('nom') || depNorm === 'nmod') {
            return 'Dans cette phrase, il complète un nom (complément du nom).';
        }
        if (fonctionNorm.includes('auxiliaire')) {
            return 'Dans cette phrase, c\'est un verbe auxiliaire (être ou avoir) qui aide à former un temps composé.';
        }
        if (fonctionNorm.includes('verbe principal') || depNorm === 'root') {
            return 'Dans cette phrase, c\'est le verbe principal : il exprime l\'action centrale.';
        }
        if (fonctionNorm.includes('expletif')) {
            return '';
        }
        if (depNorm === 'acl') {
            return 'Dans cette phrase, il est un participe ou un adjectif qui complète un nom.';
        }
        if (fonctionNorm.includes('complement')) {
            return 'Dans cette phrase, il complète le verbe.';
        }
        return '';
    })();

    const aLienAccord = relationsAssociees.some((relation) => {
        const type = this.normaliserTokenComparaison(relation && relation.type ? relation.type : '');
        return type.startsWith('accord_');
    });

    const relationAccordPrioritaire = relationsAssociees.find((relation) => {
        const type = this.normaliserTokenComparaison(relation && relation.type ? relation.type : '');
        return type === 'accord_sujet_verbe' || type === 'accord_determinant_nom' || type === 'accord_adjectif_nom' || type === 'accord_sujet_participe';
    }) || null;

    let parcoursType = null;
    let contexteAccord = null;
    if (relationAccordPrioritaire) {
        const typeRel = this.normaliserTokenComparaison(relationAccordPrioritaire.type || '');
        const tokensParId = entree.tokensParId instanceof Map ? entree.tokensParId : new Map();

        if (typeRel === 'accord_sujet_verbe') {
            const idSujet = Number(relationAccordPrioritaire.sujet || 0);
            const idVerbe = Number(relationAccordPrioritaire.verbe || 0);
            const tSujet = tokensParId.get(idSujet) || null;
            const tVerbe = tokensParId.get(idVerbe) || null;
            parcoursType = 'accord_sujet_verbe';
            contexteAccord = {
                sujet: tSujet ? { texte: tSujet.texte || '', donnees: tSujet } : null,
                verbe: tVerbe ? { texte: tVerbe.texte || '', donnees: tVerbe } : null
            };
        } else if (typeRel === 'accord_determinant_nom') {
            const idDet = Number(relationAccordPrioritaire.det || 0);
            const idNom = Number(relationAccordPrioritaire.nom || 0);
            const tDet = tokensParId.get(idDet) || null;
            const tNom = tokensParId.get(idNom) || null;
            const tDetObj = tDet ? { texte: tDet.texte || '', donnees: tDet } : null;
            const tNomObj = tNom ? { texte: tNom.texte || '', donnees: tNom } : null;
            parcoursType = 'accord_determinant_nom';
            contexteAccord = {
                determinant: tDetObj,
                determinat: tDetObj,
                nom: tNomObj
            };
        } else if (typeRel === 'accord_adjectif_nom') {
            const idAdj = Number(relationAccordPrioritaire.adj || 0);
            const idNom = Number(relationAccordPrioritaire.nom || 0);
            const tAdj = tokensParId.get(idAdj) || null;
            const tNom = tokensParId.get(idNom) || null;
            parcoursType = 'accord_adjectif_nom';
            contexteAccord = {
                adjectif: tAdj ? { texte: tAdj.texte || '', donnees: tAdj } : null,
                nom: tNom ? { texte: tNom.texte || '', donnees: tNom } : null
            };
        } else if (typeRel === 'accord_sujet_participe') {
            const idSujet = Number(relationAccordPrioritaire.sujet || 0);
            const idPart = Number(relationAccordPrioritaire.participe || 0);
            const tSujet = tokensParId.get(idSujet) || null;
            const tPart = tokensParId.get(idPart) || null;
            parcoursType = 'accord_sujet_participe';
            contexteAccord = {
                sujet: tSujet ? { texte: tSujet.texte || '', donnees: tSujet } : null,
                participe: tPart ? { texte: tPart.texte || '', donnees: tPart } : null
            };
        }
    }

    const phraseConseil = aLienAccord
        ? "Vérifie bien que tu as écrit le bon mot et que tu as fait l'accord correctement."
        : "Vérifie bien que tu as écrit le bon mot dans la phrase.";

    const explicationSimple = [phraseNature, phraseFonction, phraseConseil].filter(Boolean).join(' ');
    const blocsOrdonnes = [explicationSimple];

    return {
        token: tokenDetail,
        titreAide: 'Aide pour ce mot',
        blocsOrdonnes,
        explication: explicationSimple,
        memo: aLienAccord
            ? 'Pense à vérifier singulier/pluriel et masculin/féminin.'
            : 'Relis le mot en entier et compare avec la dictée.',
        parcoursType,
        contexteAccord
    };
}

async chargerCorpusDetaille() {
    try {
        const fallbackFichiers = [
            'Corpus1.json', 'Corpus2.json'
        ];
        const fichiers = await fetch(`corpus/index.php?v=${Date.now()}`, { cache: 'no-store' })
            .then((response) => {
                if (!response.ok) return [];
                return response.json();
            })
            .then((data) => {
                const liste = Array.isArray(data && data.files) ? data.files : [];
                return liste
                    .map((nom) => String(nom || '').trim())
                    .filter((nom) => /^[^\\/]+\.json$/i.test(nom))
                    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
            })
            .catch(() => []);

        const fichiersCorpus = fichiers.length > 0 ? fichiers : fallbackFichiers;
        const reponses = await Promise.all(
            fichiersCorpus.map((fichier) =>
                fetch(`corpus/${fichier}?v=${Date.now()}`, { cache: 'no-store' })
                    .then((response) => {
                        if (!response.ok) return [];
                        return response.json();
                    })
                    .catch(() => [])
            )
        );

        const entrees = [].concat(...reponses.filter(Array.isArray));
        const index = new Map();
        const corpusIndexe = [];

        entrees.forEach((entree) => {
            if (!entree || typeof entree !== 'object') return;
            const phraseNorm = this.normaliserPhraseCorpus(entree.phrase_normalisee || entree.phrase_originale);
            if (!phraseNorm) return;
            const entreeIndexee = this.construireIndexCorpusDetaille(entree);
            index.set(phraseNorm, entreeIndexee);
            corpusIndexe.push(entreeIndexee);
        });

        this.corpusDetaille = corpusIndexe;
        this.corpusDetailleParPhrase = index;
        this.corpusDetailleCharge = true;

        let ajoutees = 0;
        if (typeof window !== 'undefined' && window.ABE_CORPUS_ORAL && typeof window.ABE_CORPUS_ORAL.remplacerCorpus === 'function') {
            const phrasesAInserer = corpusIndexe
                .map((entree) => String(entree.phrase_normalisee || entree.phrase_originale || '').trim())
                .filter(Boolean);
            const remplacement = window.ABE_CORPUS_ORAL.remplacerCorpus(phrasesAInserer);
            ajoutees = remplacement && Number.isInteger(remplacement.total) ? remplacement.total : 0;
        }

        this.statutCorpusDetaille = {
            charge: true,
            totalEntrees: corpusIndexe.length,
            phrasesAjouteesAuModeOral: ajoutees
        };
    } catch {
        this.corpusDetailleCharge = false;
        this.statutCorpusDetaille = {
            charge: false,
            totalEntrees: 0,
            phrasesAjouteesAuModeOral: 0
        };
    }
}

normaliserTokenComparaison(token) {
    if (!token) return '';
    const brut = String(token || '').trim();
    if (/^[.,;:!?]$/.test(brut)) {
        // Ponctuation stricte en mode oral: pas de tolérance.
        return `__PUNC__${brut}`;
    }
    // Comparaison stricte: on normalise juste la casse et l'apostrophe,
    // sans suppression d'accents et sans Levenshtein.
    return brut
        .toLowerCase()
        .replace(/[’']/g, "'")
        .trim();
}

calculerPositionsDivergentes(tokensSaisis, tokensReference) {
    const divergentes = new Set();
    const tailleMax = Math.max(tokensSaisis.length, tokensReference.length);

    for (let i = 0; i < tailleMax; i += 1) {
        const saisi = this.normaliserTokenComparaison(tokensSaisis[i] && tokensSaisis[i].texte);
        const attendu = this.normaliserTokenComparaison(tokensReference[i] && tokensReference[i].texte);
        if (saisi !== attendu) {
            divergentes.add(i);
        }
    }

    return divergentes;
}

extraireTokensLexicauxAvecMeta(tokens = []) {
    const resultat = [];
    let indexMot = 0;

    (tokens || []).forEach((token) => {
        const normalise = this.normaliserTokenComparaison(token && token.texte);
        if (!normalise || normalise.startsWith('__PUNC__')) return;
        resultat.push({
            normalise,
            token,
            indexMot
        });
        indexMot += 1;
    });

    return resultat;
}

obtenirTokenLexicalParIndexMot(tokens = [], indexMot = -1) {
    if (!Number.isInteger(indexMot) || indexMot < 0) return null;
    const lexicaux = this.extraireTokensLexicauxAvecMeta(tokens || []);
    const entree = lexicaux.find((item) => item && item.indexMot === indexMot);
    return entree ? entree.token : null;
}

calculerAlignementLexical(tokensSaisis = [], tokensReference = []) {
    if (window.AbeMainOralAlignment && typeof window.AbeMainOralAlignment.calculerAlignementLexical === 'function') {
        return window.AbeMainOralAlignment.calculerAlignementLexical.call(this, tokensSaisis, tokensReference);
    }
    return { saisis: [], reference: [], operations: [], divergentes: new Set(), omissions: [] };
}

calculerPositionsDivergentesLexicales(tokensSaisis = [], tokensReference = []) {
    if (window.AbeMainOralAlignment && typeof window.AbeMainOralAlignment.calculerPositionsDivergentesLexicales === 'function') {
        return window.AbeMainOralAlignment.calculerPositionsDivergentesLexicales.call(this, tokensSaisis, tokensReference);
    }
    return new Set();
}

calculerPositionsDivergentesAvecOmissionLexicale(tokensSaisis = [], tokensReference = [], indexMotOmis = -1) {
    if (window.AbeMainOralAlignment && typeof window.AbeMainOralAlignment.calculerPositionsDivergentesAvecOmissionLexicale === 'function') {
        return window.AbeMainOralAlignment.calculerPositionsDivergentesAvecOmissionLexicale.call(this, tokensSaisis, tokensReference, indexMotOmis);
    }
    return new Set();
}

detecterOmissionsMultiples(tokensSaisis = [], tokensReference = []) {
    if (window.AbeMainOralAlignment && typeof window.AbeMainOralAlignment.detecterOmissionsMultiples === 'function') {
        return window.AbeMainOralAlignment.detecterOmissionsMultiples.call(this, tokensSaisis, tokensReference);
    }
    return [];
}

calculerPositionsDivergentesAvecOmissionsMultiples(tokensSaisis = [], tokensReference = [], omissions = []) {
    if (window.AbeMainOralAlignment && typeof window.AbeMainOralAlignment.calculerPositionsDivergentesAvecOmissionsMultiples === 'function') {
        return window.AbeMainOralAlignment.calculerPositionsDivergentesAvecOmissionsMultiples.call(this, tokensSaisis, tokensReference, omissions);
    }
    return new Set();
}

detecterOmissionUnMot(tokensSaisis = [], tokensReference = []) {
    if (window.AbeMainOralAlignment && typeof window.AbeMainOralAlignment.detecterOmissionUnMot === 'function') {
        return window.AbeMainOralAlignment.detecterOmissionUnMot.call(this, tokensSaisis, tokensReference);
    }
    return null;
}

extraireTokensReconnaissancePhrase(tokens = []) {
    return (tokens || [])
        .map((token) => this.normaliserTokenComparaison(token && token.texte))
        .filter((valeur) => valeur && !valeur.startsWith('__PUNC__'));
}

calculerLongueurLCS(tokensA = [], tokensB = []) {
    const a = tokensA || [];
    const b = tokensB || [];
    const lignes = a.length + 1;
    const colonnes = b.length + 1;
    const matrice = Array.from({ length: lignes }, () => new Array(colonnes).fill(0));

    for (let i = 1; i < lignes; i += 1) {
        for (let j = 1; j < colonnes; j += 1) {
            if (a[i - 1] === b[j - 1]) {
                matrice[i][j] = matrice[i - 1][j - 1] + 1;
            } else {
                matrice[i][j] = Math.max(matrice[i - 1][j], matrice[i][j - 1]);
            }
        }
    }

    return matrice[a.length][b.length];
}

calculerDistanceLevenshtein(texteA = '', texteB = '') {
    const a = String(texteA || '');
    const b = String(texteB || '');
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const lignes = a.length + 1;
    const colonnes = b.length + 1;
    const matrice = Array.from({ length: lignes }, () => new Array(colonnes).fill(0));

    for (let i = 0; i < lignes; i += 1) {
        matrice[i][0] = i;
    }
    for (let j = 0; j < colonnes; j += 1) {
        matrice[0][j] = j;
    }

    for (let i = 1; i < lignes; i += 1) {
        for (let j = 1; j < colonnes; j += 1) {
            const cout = a[i - 1] === b[j - 1] ? 0 : 1;
            matrice[i][j] = Math.min(
                matrice[i - 1][j] + 1,
                matrice[i][j - 1] + 1,
                matrice[i - 1][j - 1] + cout
            );
        }
    }

    return matrice[a.length][b.length];
}

calculerSimilariteTokens(texteA = '', texteB = '') {
    const a = String(texteA || '');
    const b = String(texteB || '');
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    if (a === b) return 1;

    const longueurMax = Math.max(a.length, b.length, 1);
    const distance = this.calculerDistanceLevenshtein(a, b);
    return Math.max(0, 1 - (distance / longueurMax));
}

calculerScoreAlignementTokens(tokensA = [], tokensB = []) {
    const a = tokensA || [];
    const b = tokensB || [];
    const lignes = a.length + 1;
    const colonnes = b.length + 1;
    const matrice = Array.from({ length: lignes }, () => new Array(colonnes).fill(0));

    for (let i = 1; i < lignes; i += 1) {
        for (let j = 1; j < colonnes; j += 1) {
            const similarite = this.calculerSimilariteTokens(a[i - 1], b[j - 1]);
            const aligner = matrice[i - 1][j - 1] + similarite;
            const ignorerA = matrice[i - 1][j];
            const ignorerB = matrice[i][j - 1];
            matrice[i][j] = Math.max(aligner, ignorerA, ignorerB);
        }
    }

    const scoreBrut = matrice[a.length][b.length];
    const normalisateur = Math.max(a.length, b.length, 1);
    return scoreBrut / normalisateur;
}

reconnaitrePhraseOrale(phraseSaisie, phraseReference) {
    if (!phraseReference) {
        return { reconnue: true, exacte: false, score: 1 };
    }

    const tokensSaisis = this.analyseur.tokeniser(phraseSaisie || '');
    const tokensReferenceTokenises = this.analyseur.tokeniser(phraseReference || '');
    const entreeCorpus = this.obtenirEntreeCorpusDetailleReference();
    const tokensReference = (entreeCorpus && Array.isArray(entreeCorpus.tokensLexicaux) && entreeCorpus.tokensLexicaux.length > 0)
        ? entreeCorpus.tokensLexicaux
        : tokensReferenceTokenises;
    const positionsDivergentes = this.calculerPositionsDivergentes(tokensSaisis, tokensReference);
    const exacte = positionsDivergentes.size === 0;
    if (exacte) {
        return { reconnue: true, exacte: true, score: 1 };
    }

    const motsSaisis = this.extraireTokensReconnaissancePhrase(tokensSaisis);
    const motsReference = this.extraireTokensReconnaissancePhrase(tokensReference);
    const totalReference = Math.max(motsReference.length, 1);
    let motsCorrectsBonEndroit = 0;

    for (let i = 0; i < motsReference.length; i += 1) {
        const motSaisi = motsSaisis[i] || '';
        const motReference = motsReference[i] || '';
        const distance = this.calculerDistanceLevenshtein(motSaisi, motReference);
        if (distance <= 2) {
            motsCorrectsBonEndroit += 1;
        }
    }

    // Critère demandé: au moins 30% des mots attendus corrects au bon endroit,
    // avec une tolérance Levenshtein <= 2 uniquement pour la reconnaissance.
    const score = motsCorrectsBonEndroit / totalReference;
    const seuil = 0.30;
    const reconnue = score >= seuil;

    return { reconnue, exacte: false, score };
}

extraireIndexErreur(erreur) {
    const indexDebut = typeof erreur?.indexDebut === 'number'
        ? erreur.indexDebut
        : (typeof erreur?.position === 'number' ? erreur.position : (typeof erreur?.indexMot === 'number' ? erreur.indexMot : null));
    const indexFin = typeof erreur?.indexFin === 'number' ? erreur.indexFin : indexDebut;
    if (typeof indexDebut !== 'number') return [];
    if (typeof indexFin !== 'number' || indexFin < indexDebut) return [indexDebut];

    const indexes = [];
    for (let i = indexDebut; i <= indexFin; i += 1) {
        indexes.push(i);
    }
    return indexes;
}

extrairePonctuationFinale(phrase) {
    const texte = String(phrase || '').trim();
    if (!texte) return '';
    const match = texte.match(/[.!?]$/);
    return match ? match[0] : '';
}

ajouterErreurPonctuationFinaleReference(resultatAnalyse, phraseSaisie, phraseReference) {
    const ponctSaisie = this.extrairePonctuationFinale(phraseSaisie);
    const ponctReference = this.extrairePonctuationFinale(phraseReference);

    if (!ponctReference || ponctSaisie === ponctReference) {
        return resultatAnalyse;
    }

    const existeDeja = (resultatAnalyse.erreurs || []).some((erreur) => {
        return erreur
            && erreur.type === 'ponctuation_finale'
            && String(erreur.correction || '').trim() === ponctReference;
    });
    if (existeDeja) return resultatAnalyse;

    const position = Math.max(0, (Array.isArray(resultatAnalyse.mots) ? resultatAnalyse.mots.length : 1) - 1);
    const estSubstitution = /^[.!?]$/.test(ponctSaisie);
    const explicationPonct = estSubstitution
        ? `La phrase se termine par « ${ponctReference} » et non par « ${ponctSaisie} ». Remplace la mauvaise ponctuation par la bonne.`
        : `Une phrase se termine toujours par une ponctuation (un point ., un point d'interrogation ? ou un point d'exclamation !). Ajoute la ponctuation manquante.`;
    const erreurPonctuation = {
        type: 'ponctuation_finale',
        position,
        mot: ponctSaisie || '',
        correction: ponctReference,
        explication: explicationPonct,
        regle: 'Toute phrase se termine par un point, un point d\'interrogation ou un point d\'exclamation.'
    };

    return {
        ...resultatAnalyse,
        erreurs: [...(resultatAnalyse.erreurs || []), erreurPonctuation]
    };
}

ajouterErreurMajusculeReference(resultatAnalyse, phraseSaisie, phraseReference) {
    if (!resultatAnalyse || !Array.isArray(resultatAnalyse.mots) || resultatAnalyse.mots.length === 0) {
        return resultatAnalyse;
    }

    const existeDeja = (resultatAnalyse.erreurs || []).some((erreur) => erreur && erreur.type === 'majuscule_phrase');
    if (existeDeja) {
        return resultatAnalyse;
    }

    const premierIndex = resultatAnalyse.mots.findIndex((m) => m && m.texte && !/^[.,;:!?«»()\[\]{}\-–—]+$/.test(m.texte));
    if (premierIndex < 0) return resultatAnalyse;

    const premierMot = resultatAnalyse.mots[premierIndex];
    const texte = premierMot && premierMot.texte ? premierMot.texte : '';
    if (!texte || !/^[a-zàâäçéèêëîïôöûùüÿœæ]/.test(texte)) {
        return resultatAnalyse;
    }

    const correction = texte.charAt(0).toUpperCase() + texte.slice(1);
    const erreurMajuscule = {
        type: 'majuscule_phrase',
        position: premierIndex,
        indexDebut: premierIndex,
        indexFin: premierIndex,
        mot: texte,
        correction,
        explication: 'Une phrase commence par une majuscule.',
        regle: 'On met toujours une majuscule au début d’une phrase.',
        memo: 'Début de phrase = majuscule obligatoire.',
        titreAide: 'Majuscule en début de phrase'
    };

    const nouveauxMots = resultatAnalyse.mots.map((m, idx) => {
        if (idx !== premierIndex) return m;
        const erreursMot = Array.isArray(m.erreurs) ? [...m.erreurs, erreurMajuscule] : [erreurMajuscule];
        return { ...m, erreurs: erreursMot };
    });

    return {
        ...resultatAnalyse,
        mots: nouveauxMots,
        erreurs: [...(resultatAnalyse.erreurs || []), erreurMajuscule]
    };
}

enrichirExplicationAccord(motSaisi, motAttendu, index = -1, tokensReference = []) {
    if (index < 0 || !Array.isArray(tokensReference) || tokensReference.length === 0) return null;
    const base1 = this.normaliserTokenComparaison(motSaisi);
    const base2 = this.normaliserTokenComparaison(motAttendu);
    if (base1 === base2) return null;

    const entree = this.obtenirEntreeCorpusDetailleReference();
    if (!entree || !Array.isArray(entree.tokensLexicaux)) return null;

    const tokenDetail = entree.tokensLexicaux[index] || null;
    if (!tokenDetail) return null;

    // Helper : pour un token du corpus, trouver ce que l'utilisateur a écrit
    // à la même position. L'affichage doit montrer la saisie (pour ne pas
    // donner la réponse), mais la validation utilise les données du corpus.
    const texteSaisiPourIndex = (idx) => {
        if (idx < 0 || !Array.isArray(this.motsAnalyse) || idx >= this.motsAnalyse.length) return null;
        const m = this.motsAnalyse[idx];
        return (m && m.texte) || null;
    };
    const texteSaisiPourToken = (tokenCorpus) => {
        if (!tokenCorpus || !Array.isArray(entree.tokensLexicaux)) return null;
        const idx = entree.tokensLexicaux.indexOf(tokenCorpus);
        return idx >= 0 ? texteSaisiPourIndex(idx) : null;
    };

    const nature = String(tokenDetail.nature || '').toLowerCase();
    const depType = tokenDetail.dependance && tokenDetail.dependance.type
        ? String(tokenDetail.dependance.type) : '';
    const depCible = tokenDetail.dependance && tokenDetail.dependance.cible
        ? Number(tokenDetail.dependance.cible) : -1;
    const tokensParId = entree.tokensParId || new Map();
    const tokenCible = depCible > 0 ? tokensParId.get(depCible) : null;
    const natureCible = tokenCible ? String(tokenCible.nature || '').toLowerCase() : '';
    const texteCible = tokenCible ? String(tokenCible.texte || '') : '';
    const genreCible = tokenCible ? String(tokenCible.genre || '') : '';
    const nombreCible = tokenCible ? String(tokenCible.nombre || '') : '';
    const genreToken = String(tokenDetail.genre || '');
    const nombreToken = String(tokenDetail.nombre || '');

    // Corpus-first strict:
    // la décision de parcours d'accord doit venir des dépendances /
    // relations du corpus, pas de la forme saisie par l'élève.

    // 0) Reverse dependency : un déterminant pointe vers ce nom
    // Si un déterminant (dep: det) a pour cible ce token (nom),
    // l'erreur est un accord déterminant-nom, même si le nom est aussi sujet.
    if (nature.includes('nom')) {
        for (const t of entree.tokensLexicaux) {
            if (t && t.dependance && t.dependance.type === 'det' && Number(t.dependance.cible) === Number(tokenDetail.id)) {
                const genreDet = String(t.genre || '');
                const nombreDet = String(t.nombre || '');
                // Afficher ce que l'utilisateur a écrit, pas la réponse du corpus
                const texteSaisiDet = texteSaisiPourToken(t) || t.texte;
                const texteSaisiNom = texteSaisiPourIndex(index) || motSaisi;
                const detInfo = { texte: texteSaisiDet, donnees: t };
                const nomInfo = { texte: texteSaisiNom, donnees: tokenDetail };
                return {
                    explication: `Le nom doit s'accorder avec le déterminant « ${texteSaisiDet} » (${genreDet === 'f' ? 'féminin' : 'masculin'} ${nombreDet === 'p' ? 'pluriel' : 'singulier'}). Vérifie le genre et le nombre.`,
                    titreAide: 'Accord déterminant-nom',
                    memo: `Un nom s'accorde en genre et en nombre avec le déterminant qui l'accompagne.`,
                    parcoursType: 'accord_determinant_nom',
                    contexteAccord: { determinant: detInfo, determinat: detInfo, nom: nomInfo }
                };
            }
        }
    }

    // 1) Accord sujet-verbe : le token est sujet (nsubj) d'un verbe
    if (depType === 'nsubj' && natureCible.includes('verbe')) {
        const sujetSaisi = texteSaisiPourIndex(index) || motSaisi;
        const verbeSaisi = texteSaisiPourToken(tokenCible) || texteCible;
        return {
            explication: `Le verbe doit s'accorder avec le sujet « ${sujetSaisi} ». Vérifie la terminaison.`,
            titreAide: 'Accord sujet-verbe',
            memo: `Pour accorder le verbe avec son sujet, identifie le sujet (qui ?) puis choisis la terminaison qui convient.`,
            parcoursType: 'accord_sujet_verbe',
            contexteAccord: { sujet: { texte: sujetSaisi, donnees: tokenDetail }, verbe: { texte: verbeSaisi, donnees: tokenCible } }
        };
    }

    // 2) Accord déterminant-nom : le token est un déterminant (dep: det)
    if (depType === 'det' && (nature.includes('déterminant') || nature.includes('determinant')) && natureCible.includes('nom')) {
        const texteSaisiDet = texteSaisiPourIndex(index) || motSaisi;
        const texteSaisiNom = texteSaisiPourToken(tokenCible) || texteCible;
        const detInfo = { texte: texteSaisiDet, donnees: tokenDetail };
        const nomInfo = { texte: texteSaisiNom, donnees: tokenCible };
        return {
            explication: `Le déterminant doit s'accorder avec le nom « ${texteSaisiNom} » (${genreCible === 'f' ? 'féminin' : 'masculin'} ${nombreCible === 'p' ? 'pluriel' : 'singulier'}).`,
            titreAide: 'Accord déterminant-nom',
            memo: `Un déterminant s'accorde en genre (masculin/féminin) et en nombre (singulier/pluriel) avec le nom qu'il accompagne.`,
            parcoursType: 'accord_determinant_nom',
            contexteAccord: { determinant: detInfo, determinat: detInfo, nom: nomInfo }
        };
    }

    // 3) Accord adjectif-nom : le token est un adjectif (dep: amod)
    if (depType === 'amod' && nature.includes('adjectif') && natureCible.includes('nom')) {
        const texteSaisiAdj = texteSaisiPourIndex(index) || motSaisi;
        const texteSaisiNom = texteSaisiPourToken(tokenCible) || texteCible;
        return {
            explication: `L'adjectif doit s'accorder avec le nom « ${texteSaisiNom} » (${genreCible === 'f' ? 'féminin' : 'masculin'} ${nombreCible === 'p' ? 'pluriel' : 'singulier'}). Vérifie la terminaison.`,
            titreAide: 'Accord adjectif-nom',
            memo: `Un adjectif s'accorde en genre (masculin/féminin) et en nombre (singulier/pluriel) avec le nom qu'il qualifie.`,
            parcoursType: 'accord_adjectif_nom',
            contexteAccord: { adjectif: { texte: texteSaisiAdj, donnees: tokenDetail }, nom: { texte: texteSaisiNom, donnees: tokenCible } }
        };
    }

    // 4) Accord participe passé : le token est un participe passé avec sujet
    if (nature.includes('verbe') && String(tokenDetail.mode || '').includes('participe') && depType === 'acl') {
        const texteSaisiPart = texteSaisiPourIndex(index) || motSaisi;
        // Trouver le sujet du participe via nsubj pointant vers ce token
        let sujetParticipe = null;
        for (const t of entree.tokensLexicaux) {
            if (t && t.dependance && t.dependance.type === 'nsubj' && Number(t.dependance.cible) === Number(tokenDetail.id)) {
                const texteSaisiSujet = texteSaisiPourToken(t) || t.texte;
                sujetParticipe = { texte: texteSaisiSujet, donnees: t };
                break;
            }
        }
        // Trouver le COD (obj) placé avant le participe (règle avoir + COD antéposé)
        let codParticipe = null;
        for (const t of entree.tokensLexicaux) {
            if (t && t.dependance && t.dependance.type === 'obj' && Number(t.dependance.cible) === Number(tokenDetail.id)) {
                const idxT = entree.tokensLexicaux.indexOf(t);
                if (idxT >= 0 && idxT < index) {
                    const texteSaisiCOD = texteSaisiPourToken(t) || t.texte;
                    codParticipe = { texte: texteSaisiCOD, donnees: t };
                }
                break;
            }
        }
        return {
            explication: `Le participe passé doit s'accorder. Vérifie avec le sujet ou l'auxiliaire.`,
            titreAide: 'Accord participe passé',
            memo: `Un participe passé employé avec « être » s'accorde en genre et en nombre avec le sujet.\nAvec « avoir », il s'accorde avec le COD si celui-ci est placé avant.`,
            parcoursType: 'accord_sujet_participe',
            contexteAccord: {
                participe: { texte: texteSaisiPart, donnees: tokenDetail },
                ...(sujetParticipe ? { sujet: sujetParticipe } : {}),
                ...(codParticipe ? { cod: codParticipe } : {})
            }
        };
    }

    // 5) Vérification via relations_globales
    const relations = Array.isArray(entree.relationsGlobales) ? entree.relationsGlobales : [];
    const idToken = Number(tokenDetail.id);
    for (const rel of relations) {
        if (!rel || typeof rel !== 'object') continue;
        const typeRel = String(rel.type || '');
        const idsRel = this.extraireIdsRelationGlobale(rel);
        if (!idsRel.has(idToken)) continue;

        if (typeRel === 'accord_sujet_verbe') {
            const idSujet = Number(rel.sujet || 0);
            const idVerbe = Number(rel.verbe || 0);
            const tSujet = tokensParId.get(idSujet);
            const tVerbe = tokensParId.get(idVerbe);
            const sujetSaisi = tSujet ? (texteSaisiPourToken(tSujet) || tSujet.texte) : '';
            const verbeSaisi = tVerbe ? (texteSaisiPourToken(tVerbe) || tVerbe.texte) : '';
            if (idToken === idSujet && tVerbe) {
                return {
                    explication: `Le verbe doit s'accorder avec le sujet « ${sujetSaisi} ». Vérifie la terminaison.`,
                    titreAide: 'Accord sujet-verbe',
                    memo: `Pour accorder le verbe avec son sujet, identifie le sujet (qui ?) puis choisis la terminaison qui convient.`,
                    parcoursType: 'accord_sujet_verbe',
                    contexteAccord: { sujet: { texte: sujetSaisi, donnees: tSujet }, verbe: { texte: verbeSaisi, donnees: tVerbe } }
                };
            }
            if (idToken === idVerbe && tSujet) {
                return {
                    explication: `Le verbe doit s'accorder avec le sujet « ${sujetSaisi} ». Vérifie la terminaison.`,
                    titreAide: 'Accord sujet-verbe',
                    memo: `Pour accorder le verbe avec son sujet, identifie le sujet (qui ?) puis choisis la terminaison qui convient.`,
                    parcoursType: 'accord_sujet_verbe',
                    contexteAccord: { sujet: { texte: sujetSaisi, donnees: tSujet }, verbe: { texte: verbeSaisi, donnees: tVerbe } }
                };
            }
        }

        if (typeRel === 'accord_determinant_nom') {
            const idDet = Number(rel.det || 0);
            const idNom = Number(rel.nom || 0);
            const tDet = tokensParId.get(idDet);
            const tNom = tokensParId.get(idNom);
            const detSaisi = tDet ? (texteSaisiPourToken(tDet) || tDet.texte) : '';
            const nomSaisi = tNom ? (texteSaisiPourToken(tNom) || tNom.texte) : '';
            const genreNom = tNom ? String(tNom.genre || '') : genreCible;
            const nombreNom = tNom ? String(tNom.nombre || '') : nombreCible;
            if (idToken === idDet && tNom) {
                return {
                    explication: `Le déterminant doit s'accorder avec le nom « ${nomSaisi} » (${genreNom === 'f' ? 'féminin' : 'masculin'} ${nombreNom === 'p' ? 'pluriel' : 'singulier'}).`,
                    titreAide: 'Accord déterminant-nom',
                    memo: `Un déterminant s'accorde en genre et en nombre avec le nom qu'il accompagne.`,
                    parcoursType: 'accord_determinant_nom',
                    contexteAccord: { determinat: { texte: detSaisi, donnees: tDet }, nom: { texte: nomSaisi, donnees: tNom } }
                };
            }
            if (idToken === idNom && tDet) {
                return {
                    explication: `Le nom doit s'accorder avec le déterminant « ${detSaisi} ». Vérifie le genre et le nombre.`,
                    titreAide: 'Accord déterminant-nom',
                    memo: `Un nom s'accorde en genre et en nombre avec le déterminant qui l'accompagne.`,
                    parcoursType: 'accord_determinant_nom',
                    contexteAccord: { determinat: { texte: detSaisi, donnees: tDet }, nom: { texte: nomSaisi, donnees: tNom } }
                };
            }
        }

        if (typeRel === 'accord_adjectif_nom') {
            const idAdj = Number(rel.adj || 0);
            const idNom = Number(rel.nom || 0);
            const tAdj = tokensParId.get(idAdj);
            const tNom = tokensParId.get(idNom);
            const adjSaisi = tAdj ? (texteSaisiPourToken(tAdj) || tAdj.texte) : '';
            const nomSaisi = tNom ? (texteSaisiPourToken(tNom) || tNom.texte) : '';
            const genreNom = tNom ? String(tNom.genre || '') : genreCible;
            const nombreNom = tNom ? String(tNom.nombre || '') : nombreCible;
            if (idToken === idAdj && tNom) {
                return {
                    explication: `L'adjectif doit s'accorder avec le nom « ${nomSaisi} » (${genreNom === 'f' ? 'féminin' : 'masculin'} ${nombreNom === 'p' ? 'pluriel' : 'singulier'}). Vérifie la terminaison.`,
                    titreAide: 'Accord adjectif-nom',
                    memo: `Un adjectif s'accorde en genre et en nombre avec le nom qu'il qualifie.`,
                    parcoursType: 'accord_adjectif_nom',
                    contexteAccord: { adjectif: { texte: adjSaisi, donnees: tAdj }, nom: { texte: nomSaisi, donnees: tNom } }
                };
            }
            if (idToken === idNom && tAdj) {
                return {
                    explication: `Le nom doit s'accorder avec l'adjectif « ${adjSaisi} ». Vérifie le genre et le nombre.`,
                    titreAide: 'Accord adjectif-nom',
                    memo: `Un nom et l'adjectif qui le qualifie s'accordent en genre et en nombre.`,
                    parcoursType: 'accord_adjectif_nom',
                    contexteAccord: { adjectif: { texte: adjSaisi, donnees: tAdj }, nom: { texte: nomSaisi, donnees: tNom } }
                };
            }
        }

        if (typeRel === 'accord_sujet_attribut') {
            const idSujet = Number(rel.sujet || 0);
            const idAttr = Number(rel.attribut || 0);
            const tSujet = tokensParId.get(idSujet);
            const tAttr = tokensParId.get(idAttr);
            const sujetSaisi = tSujet ? (texteSaisiPourToken(tSujet) || tSujet.texte) : '';
            const attrSaisi = tAttr ? (texteSaisiPourToken(tAttr) || tAttr.texte) : '';
            if (idToken === idAttr && tSujet) {
                return {
                    explication: `L'attribut doit s'accorder avec le sujet « ${sujetSaisi} ». Vérifie le genre et le nombre.`,
                    titreAide: 'Accord sujet-attribut',
                    memo: `L'attribut du sujet s'accorde en genre et en nombre avec le sujet.`,
                    parcoursType: 'accord_adjectif_nom',
                    contexteAccord: { adjectif: { texte: attrSaisi, donnees: tAttr }, nom: { texte: sujetSaisi, donnees: tSujet } }
                };
            }
        }

        if (typeRel === 'accord_sujet_participe') {
            const idSujet = Number(rel.sujet || 0);
            const idPart = Number(rel.participe || 0);
            const tSujet = tokensParId.get(idSujet);
            const tPart = tokensParId.get(idPart);
            const sujetSaisi = tSujet ? (texteSaisiPourToken(tSujet) || tSujet.texte) : '';
            const partSaisi = tPart ? (texteSaisiPourToken(tPart) || tPart.texte) : '';
            if (idToken === idPart && tSujet) {
                return {
                    explication: `Le participe passé doit s'accorder avec le sujet « ${sujetSaisi} ». Vérifie la terminaison.`,
                    titreAide: 'Accord participe passé',
                    memo: `Un participe passé employé avec « être » s'accorde en genre et en nombre avec le sujet.`,
                    parcoursType: 'accord_sujet_verbe',
                    contexteAccord: { sujet: { texte: sujetSaisi, donnees: tSujet }, verbe: { texte: partSaisi, donnees: tPart } }
                };
            }
        }
    }

    // 6) Fallback dépendance : verbe avec nsubj détecté par la cible inverse
    if (nature.includes('verbe')) {
        for (const t of entree.tokensLexicaux) {
            if (t && t.dependance && t.dependance.type === 'nsubj' && Number(t.dependance.cible) === idToken) {
                const sujetSaisi = texteSaisiPourToken(t) || t.texte;
                const verbeSaisi = texteSaisiPourIndex(index) || motSaisi;
                return {
                    explication: `Le verbe doit s'accorder avec le sujet « ${sujetSaisi} ». Vérifie la terminaison.`,
                    titreAide: 'Accord sujet-verbe',
                    memo: `Pour accorder le verbe avec son sujet, identifie le sujet (qui ?) puis choisis la terminaison qui convient.`,
                    parcoursType: 'accord_sujet_verbe',
                    contexteAccord: { sujet: { texte: sujetSaisi, donnees: t }, verbe: { texte: verbeSaisi, donnees: tokenDetail } }
                };
            }
        }
    }

    return null;
}

enrichirExplicationOrale(motSaisi, motAttendu, index = -1, tokensReference = []) {
    const base1 = (typeof this.normaliserTokenComparaison === 'function')
        ? this.normaliserTokenComparaison(motSaisi)
        : String(motSaisi || '').toLowerCase().trim();
    const base2 = (typeof this.normaliserTokenComparaison === 'function')
        ? this.normaliserTokenComparaison(motAttendu)
        : String(motAttendu || '').toLowerCase().trim();
    const categories = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
        ? window.AbeAnalyseurCategories
        : (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
            ? globalThis.AbeAnalyseurCategories
            : null;

    // ── Système de priorité : collecter tous les candidats, choisir le meilleur ──
    // Chaque enricher ajoute un candidat avec { ...resultat, categorie, priorite }.
    // La priorité la plus élevée l'emporte, indépendamment de l'ordre d'appel.
    // Plus la priorité est élevée, plus l'explication est pédagogiquement spécifique.
    //
    // Échelle de priorité :
    //   100 = homophone (ou/où, son/sont, ce/se, ces/ses, a/à… — parcours maïeutique dédié prioritaire)
    //   95  = leur/leurs (parcours dédié très spécifique)
    //   70  = accent/cédille (règle orthographique ciblée)
    //   60  = accord corpus avec parcours guidé (accord_sujet_verbe, accord_sujet_participe…)
    //   50  = conjugaison avec sujet → accord_sujet_verbe (parcours guidé)
    //   40  = conjugaison sans sujet (conjugaison_verbe)
    //   30  = lettre manquante / en trop
    //   20  = filet é/er
    //   10  = fallback nature (verbe, nom, adjectif, déterminant…)
    const candidats = [];

    // --- Homophones (Priorité Absolue 100) ---
    if (base1 !== base2 && categories && typeof categories.enrichirExplicationHomophone === 'function') {
        const entreeCorpusHomo = (typeof this.obtenirEntreeCorpusDetailleReference === 'function')
            ? this.obtenirEntreeCorpusDetailleReference()
            : null;
        const tokenCorpusAttendu = (entreeCorpusHomo && Array.isArray(entreeCorpusHomo.tokensLexicaux) && index >= 0)
            ? (entreeCorpusHomo.tokensLexicaux[index] || null)
            : null;
        const resultat = categories.enrichirExplicationHomophone(motSaisi, motAttendu, tokenCorpusAttendu);
        if (resultat) candidats.push({ ...resultat, categorie: 'homophone', priorite: 100 });
    }

    // --- Leur/leurs ---
    if (categories && typeof categories.enrichirExplicationLeurLeurs === 'function') {
        const detecterTypeToken = (token) => {
            if (!token) return '';
            const donnees = token.donnees || (this.analyseur && this.analyseur.getWordData(token.texte || ''));
            return String((donnees && donnees.type) || '').toLowerCase();
        };
        const estPonctuationToken = (token) => /^[.,;:!?]$/.test(token && token.texte || '');
        let tokenSuivant = null;
        if (Array.isArray(tokensReference) && typeof index === 'number' && index >= 0) {
            for (let i = index + 1; i < tokensReference.length; i += 1) {
                const candidat = tokensReference[i];
                if (candidat && candidat.texte && !estPonctuationToken(candidat)) { tokenSuivant = candidat; break; }
            }
        }
        const resultat = categories.enrichirExplicationLeurLeurs(motSaisi, motAttendu, tokenSuivant, detecterTypeToken);
        if (resultat) candidats.push({ ...resultat, categorie: 'leur_leurs', priorite: 95 });
    }

    // --- Accents / cédille ---
    if (base1 !== base2 && categories && typeof categories.enrichirExplicationAccent === 'function') {
        const resultat = categories.enrichirExplicationAccent(motSaisi, motAttendu);
        if (resultat) candidats.push({ ...resultat, categorie: 'accent', priorite: 70 });
    }

    // --- Accord au/aux (préposition + article contracté) ---
    // Corpus-first: si le corpus attend « au/aux », on guide l'élève
    // avec le nom concerné et un parcours dédié.
    if (base1 !== base2) {
        const saisi = String(motSaisi || '').toLowerCase().trim();
        const attendu = String(motAttendu || '').toLowerCase().trim();
        const estPaireAuAux =
            (saisi === 'au' && attendu === 'aux') ||
            (saisi === 'aux' && attendu === 'au');

        if (estPaireAuAux) {
            const entreeCorpus = this.obtenirEntreeCorpusDetailleReference();
            let tokenNomSuivant = null;

            if (entreeCorpus && Array.isArray(entreeCorpus.tokensLexicaux) && index >= 0) {
                for (let j = index + 1; j < entreeCorpus.tokensLexicaux.length; j += 1) {
                    const t = entreeCorpus.tokensLexicaux[j];
                    const nature = String((t && t.nature) || '').toLowerCase();
                    if (nature.includes('nom')) {
                        tokenNomSuivant = t;
                        break;
                    }
                    if (nature.includes('verbe') || nature.includes('ponctuation')) {
                        break;
                    }
                }
            }

            const nomTexte = tokenNomSuivant ? String(tokenNomSuivant.texte || '') : '';
            const explicationNom = nomTexte
                ? `Ici, regarde le nom « ${nomTexte} » pour choisir.`
                : 'Ici, regarde le nom qui suit pour choisir.';

            candidats.push({
                explication: `Après « à », on écrit « au » devant un nom masculin singulier et « aux » devant un nom pluriel. ${explicationNom}`,
                titreAide: 'Accord au/aux',
                memo: 'Rappel : au = à + le (singulier) ; aux = à + les (pluriel).',
                parcoursType: 'accord_au_aux',
                contexteAccord: tokenNomSuivant
                    ? { nom: { texte: nomTexte, donnees: tokenNomSuivant } }
                    : null,
                categorie: 'au_aux',
                priorite: 65
            });
        }
    }

    // --- Accords basés sur les dépendances du corpus ---
    const resultatAccord = this.enrichirExplicationAccord(motSaisi, motAttendu, index, tokensReference);
    if (resultatAccord) candidats.push({ ...resultatAccord, categorie: 'accord', priorite: 60 });

    // --- Conjugaison ---
    if (base1 !== base2 && categories && typeof categories.enrichirExplicationConjugaison === 'function') {
        let tokenCorpusAttendu = null;
        let tokensCorpus = [];
        const entreeCorpus = this.obtenirEntreeCorpusDetailleReference();
        if (entreeCorpus && Array.isArray(entreeCorpus.tokensLexicaux)) {
            tokensCorpus = entreeCorpus.tokensLexicaux;
            if (index >= 0 && index < entreeCorpus.tokensLexicaux.length) {
                tokenCorpusAttendu = entreeCorpus.tokensLexicaux[index] || null;
            }
        }
        const resultat = categories.enrichirExplicationConjugaison(
            motSaisi,
            motAttendu,
            this.analyseur,
            index,
            tokensReference,
            tokenCorpusAttendu,
            tokensCorpus
        );
        if (resultat) {
            // Si le résultat est accord_sujet_verbe (sujet trouvé), priorité plus haute
            const estAccordSujetVerbe = resultat.parcoursType === 'accord_sujet_verbe';
            candidats.push({ ...resultat, categorie: estAccordSujetVerbe ? 'conjugaison_accord' : 'conjugaison', priorite: estAccordSujetVerbe ? 50 : 40 });
        }
    }

    // --- Astuce du féminin (consonne finale muette) ---
    // Déclenchement chirurgical: uniquement en contexte grammatical
    // pertinent (participe/adjectif), pas sur une simple faute isolée.
    if (base1 !== base2) {
        const normaliserMotSimple = (mot) => String(mot || '')
            .toLowerCase()
            .replace(/[’]/g, "'")
            .replace(/^[^a-zàâäéèêëîïôöùûüÿçœæ]+|[^a-zàâäéèêëîïôöùûüÿçœæ]+$/gi, '');
        const saisiNet = normaliserMotSimple(motSaisi);
        const attenduNet = normaliserMotSimple(motAttendu);

        const entreeCorpus = this.obtenirEntreeCorpusDetailleReference();
        const tokenCorpusAttendu = (
            entreeCorpus &&
            Array.isArray(entreeCorpus.tokensLexicaux) &&
            index >= 0 &&
            index < entreeCorpus.tokensLexicaux.length
        )
            ? (entreeCorpus.tokensLexicaux[index] || null)
            : null;
        const tokenPrecedent = (
            entreeCorpus &&
            Array.isArray(entreeCorpus.tokensLexicaux) &&
            index > 0 &&
            index - 1 < entreeCorpus.tokensLexicaux.length
        )
            ? (entreeCorpus.tokensLexicaux[index - 1] || null)
            : null;

        const nature = String((tokenCorpusAttendu && tokenCorpusAttendu.nature) || '').toLowerCase();
        const mode = String((tokenCorpusAttendu && tokenCorpusAttendu.mode) || '').toLowerCase();
        const temps = String((tokenCorpusAttendu && tokenCorpusAttendu.temps) || '').toLowerCase();
        const depType = String((tokenCorpusAttendu && tokenCorpusAttendu.dependance && tokenCorpusAttendu.dependance.type) || '').toLowerCase();
        const fonction = String((tokenCorpusAttendu && tokenCorpusAttendu.fonction) || '').toLowerCase();
        const lemme = String((tokenCorpusAttendu && tokenCorpusAttendu.lemme) || '').toLowerCase();

        const AUXILIAIRES = new Set([
            'ai','as','a','avons','avez','ont',
            'avais','avait','avions','aviez','avaient',
            'aurai','auras','aura','aurons','aurez','auront',
            'suis','es','est','sommes','êtes','sont',
            'étais','était','étions','étiez','étaient',
            'serai','seras','sera','serons','serez','seront',
            "m'est","t'est","s'est","c'est"
        ]);
        const precedentTexte = normaliserMotSimple(tokenPrecedent && tokenPrecedent.texte);
        const contexteAuxiliaire = AUXILIAIRES.has(precedentTexte);
        const contexteQualifieNom =
            depType === 'amod' ||
            depType === 'acl' ||
            fonction.includes('attribut');
        const contexteParticipeAdjectif =
            (nature.includes('verbe') && mode.includes('participe')) ||
            nature.includes('adjectif') ||
            contexteQualifieNom;
        const estVerbeConjuguePresent =
            nature.includes('verbe') &&
            !mode.includes('participe') &&
            (
                temps.includes('présent') ||
                temps.includes('present') ||
                mode.includes('indicatif') ||
                mode.includes('subjonctif') ||
                mode.includes('conditionnel') ||
                mode.includes('impératif')
            );
        const contexteValide =
            !!tokenCorpusAttendu &&
            contexteParticipeAdjectif &&
            (contexteAuxiliaire || contexteQualifieNom) &&
            !estVerbeConjuguePresent;

        // Families de formes masculines (corpus-first):
        // l'aide se déclenche si la forme attendue appartient à la famille
        // ET que la saisie semble tronquer la consonne finale muette.
        const familleS = new Set([
            'pris', 'mis', 'assis', 'requis', 'conquis', 'gris', 'soumis',
            'permis', 'promis', 'admis', 'transmis', 'surpris', 'compris', 'appris'
        ]);
        const familleT = new Set([
            'écrit', 'ecrit', 'dit', 'cuit', 'conduit', 'construit', 'inscrit', 'décrit', 'decrit',
            'produit', 'détruit', 'detruit', 'prédit', 'predit', 'ouvert', 'offert', 'souffert', 'mort', 'petit'
        ]);
        const familleD = new Set(['grand', 'froid', 'chaud', 'lourd', 'blond', 'bavard']);
        const familleX = new Set(['radieux', 'heureux', 'joyeux', 'courageux', 'peureux']);
        const familleU = new Set(['inclus', 'exclus', 'conclus', 'conclu']);

        const lemmeFamilleS = new Set(['prendre', 'apprendre', 'comprendre', 'mettre', 'promettre', 'admettre', 'transmettre', 'soumettre']);
        const lemmeFamilleT = new Set(['dire', 'écrire', 'ecrire', 'décrire', 'decrire', 'inscrire', 'conduire', 'produire', 'construire', 'détruire', 'detruire', 'ouvrir', 'offrir', 'souffrir', 'mourir']);
        const lemmeFamilleU = new Set(['inclure', 'exclure', 'conclure']);

        let astuce = null;
        if (contexteValide) {
            if (
                saisiNet.endsWith('i') &&
                attenduNet.endsWith('is') &&
                (familleS.has(attenduNet) || lemmeFamilleS.has(lemme))
            ) {
                astuce = {
                    explication: 'Astuce du féminin : « Pour savoir si un mot se termine par une lettre muette, essaie de le mettre au féminin. » Exemple : « pris » -> « prise », « mis » -> « mise », « compris » -> « comprise ». On entend le son, donc on garde -s.',
                    memo: 'Quand on entend le son au féminin, on garde la consonne finale au masculin (souvent -s).'
                };
            } else if (
                saisiNet.endsWith('i') &&
                attenduNet.endsWith('it') &&
                (familleT.has(attenduNet) || lemmeFamilleT.has(lemme))
            ) {
                astuce = {
                    explication: 'Astuce du féminin : « dit » -> « dite », « écrit » -> « écrite », « conduit » -> « conduite ». Si le féminin fait entendre [t], la forme masculine garde souvent -t.',
                    memo: 'Si le féminin fait entendre le son [t], la forme correcte garde généralement -t au masculin.'
                };
            } else if (
                saisiNet.endsWith('u') &&
                attenduNet.endsWith('us') &&
                (familleU.has(attenduNet) || lemmeFamilleU.has(lemme) || lemme.endsWith('clure'))
            ) {
                astuce = {
                    explication: 'Astuce du féminin : « inclus » -> « incluse », « exclus » -> « excluse ». Le féminin rend la consonne finale audible.',
                    memo: 'Le féminin aide à confirmer la consonne finale muette (souvent -s après -u).'
                };
            } else if (
                saisiNet.endsWith('u') &&
                attenduNet.endsWith('ut') &&
                (attenduNet === 'conclut' || lemme === 'conclure')
            ) {
                astuce = {
                    explication: 'Astuce du féminin : « conclu » devient « conclue ». On entend alors la finale attendue selon le contexte.',
                    memo: 'Cas plus rare : vérifie la famille du verbe et le féminin pour valider la finale.'
                };
            } else if (
                (saisiNet.endsWith('er') && attenduNet.endsWith('ert')) ||
                (saisiNet.endsWith('or') && attenduNet.endsWith('ort'))
            ) {
                astuce = {
                    explication: 'Astuce du féminin : « ouvert » -> « ouverte », « mort » -> « morte ». Le féminin révèle la consonne finale muette.',
                    memo: 'Le féminin permet d\'entendre la consonne finale muette et d\'éviter les formes tronquées.'
                };
            } else if (saisiNet.endsWith('d') === false && familleD.has(attenduNet) && attenduNet.slice(0, -1) === saisiNet) {
                astuce = {
                    explication: 'Astuce du féminin : « grand » -> « grande », « blond » -> « blonde », « bavard » -> « bavarde ». Le féminin confirme la présence de -d.',
                    memo: 'Sur certains adjectifs, la consonne finale muette réapparaît au féminin.'
                };
            } else if (saisiNet.endsWith('eu') && familleX.has(attenduNet)) {
                astuce = {
                    explication: 'Astuce du féminin : les adjectifs en -eux changent en -euse au féminin (radieux/radieuse, heureux/heureuse).',
                    memo: 'Le -x final du masculin est normal : vérifie la forme féminine en -euse.'
                };
            }
        }

        if (astuce) {
            candidats.push({
                explication: astuce.explication,
                titreAide: 'Astuce du féminin (participe/adjectif)',
                memo: astuce.memo,
                categorie: 'participe_finale_muette',
                priorite: 45
            });
        }
    }

    // --- Lettre manquante ---
    if (base1 !== base2 && categories && typeof categories.enrichirExplicationLettreManquante === 'function') {
        const resultat = categories.enrichirExplicationLettreManquante(motSaisi, motAttendu);
        if (resultat) candidats.push({ ...resultat, categorie: 'lettre_manquante', priorite: 30 });
    }

    // --- Lettre en trop ---
    if (base1 !== base2 && categories && typeof categories.enrichirExplicationLettreEnTrop === 'function') {
        const resultat = categories.enrichirExplicationLettreEnTrop(motSaisi, motAttendu);
        if (resultat) candidats.push({ ...resultat, categorie: 'lettre_en_trop', priorite: 30 });
    }

    // --- Filet de sécurité é/er ---
    if (base1 !== base2) {
        const normaliserMotSimple = (mot) => String(mot || '')
            .toLowerCase()
            .replace(/^[^a-zàâäéèêëîïôöùûüÿçœæ]+|[^a-zàâäéèêëîïôöùûüÿçœæ]+$/gi, '');
        const saisiNet = normaliserMotSimple(motSaisi);
        const attenduNet = normaliserMotSimple(motAttendu);
        if (saisiNet.length > 2 && attenduNet.length > 2) {
            const confusionParticipeInfinitif = saisiNet.endsWith('é')
                && attenduNet.endsWith('er')
                && saisiNet.slice(0, -1) === attenduNet.slice(0, -2);
            const confusionInfinitifParticipe = saisiNet.endsWith('er')
                && attenduNet.endsWith('é')
                && saisiNet.slice(0, -2) === attenduNet.slice(0, -1);

            if (confusionParticipeInfinitif || confusionInfinitifParticipe) {
                candidats.push({
                    explication: 'Attention à la confusion entre -é et -er. Utilise le test du verbe du 3e groupe : si tu peux remplacer par « vendre », écris -er ; si tu peux remplacer par « vendu », écris -é.',
                    titreAide: 'Homophone (participe passé / infinitif)',
                    memo: 'Après un verbe comme « pour », « il faut », « je vais », on attend souvent l\'infinitif en -er.',
                    categorie: 'er_e_fallback',
                    priorite: 20
                });
            }
        }
    }

    // --- Fallback intelligent basé sur la nature du mot ---
    const entreeCorpusFallback = this.obtenirEntreeCorpusDetailleReference();
    let tokenCorpusFallback = null;
    if (entreeCorpusFallback && Array.isArray(entreeCorpusFallback.tokensLexicaux) && index >= 0 && index < entreeCorpusFallback.tokensLexicaux.length) {
        tokenCorpusFallback = entreeCorpusFallback.tokensLexicaux[index] || null;
    }
    const donneesAttendu = this.analyseur ? this.analyseur.getWordData(motAttendu) : null;
    const typeAttendu = tokenCorpusFallback && tokenCorpusFallback.nature
        ? String(tokenCorpusFallback.nature).toLowerCase()
        : String((donneesAttendu && donneesAttendu.type) || '').toLowerCase();
    const lemmeAttendu = tokenCorpusFallback && tokenCorpusFallback.lemme
        ? String(tokenCorpusFallback.lemme).toLowerCase()
        : String((donneesAttendu && (donneesAttendu.lemme || donneesAttendu.infinitif)) || '').toLowerCase();
    let fallbackEstAccord = false;
    {
        const a = motSaisi.toLowerCase().trim();
        const b = motAttendu.toLowerCase().trim();
        if (a.length < b.length && b.startsWith(a)) fallbackEstAccord = true;
        else if (b.length < a.length && a.startsWith(b)) fallbackEstAccord = true;
        else {
            let prefixLen = 0;
            while (prefixLen < a.length && prefixLen < b.length && a[prefixLen] === b[prefixLen]) prefixLen++;
            const sufA = a.slice(prefixLen);
            const sufB = b.slice(prefixLen);
            if (prefixLen >= 3) {
                const pairesAccord = new Set([
                    '|s','s|','|x','x|','|es','es|',
                    '|e','e|','e|es','es|e','s|es','es|s',
                    'e|ent','ent|e','e|ons','ons|e','e|ez','ez|e',
                    'e|s','s|e','e|t','t|e','e|d','d|e',
                    's|ent','ent|s',
                    'l|ux','al|aux','eau|eaux','ou|oux',
                    'f|ve','f|ves','c|ce','c|ces','g|ge','g|ges',
                    'er|ère','er|ères','et|ette','et|ettes',
                    'on|onne','en|enne','eur|euse','teur|trice',
                    'if|ive','el|elle','il|ille'
                ]);
                fallbackEstAccord = pairesAccord.has(`${sufA}|${sufB}`);
            }
        }
    }

    if (typeAttendu === 'verbe' && lemmeAttendu) {
        candidats.push({
            explication: `Le mot attendu est un verbe (infinitif : ${lemmeAttendu}). Tu as écrit « ${motSaisi} ». Vérifie le sujet et la terminaison.`,
            titreAide: 'Conjugaison verbe',
            memo: `Pour un verbe, identifie le sujet puis choisis la bonne terminaison.`,
            categorie: 'nature_fallback',
            priorite: 10
        });
    }
    if (typeAttendu === 'verbe') {
        candidats.push({
            explication: `Le mot attendu est un verbe. Tu as écrit « ${motSaisi} ». Vérifie la conjugaison.`,
            titreAide: 'Conjugaison verbe',
            memo: `Pour un verbe, identifie le sujet puis choisis la bonne terminaison.`,
            categorie: 'nature_fallback',
            priorite: 10
        });
    }
    if (typeAttendu === 'adverbe') {
        candidats.push({
            explication: `Le mot attendu est un adverbe. Tu as écrit « ${motSaisi} ». Vérifie l'orthographe du mot.`,
            titreAide: 'Orthographe adverbe',
            memo: `Un adverbe est un mot invariable : il ne change pas de forme. Vérifie chaque lettre.`,
            categorie: 'nature_fallback',
            priorite: 10
        });
    }
    if (typeAttendu.includes('nom')) {
        if (fallbackEstAccord) {
            candidats.push({
                explication: `Le mot attendu est un nom. Tu as écrit « ${motSaisi} ». Vérifie le genre et le nombre.`,
                titreAide: 'Accord nom',
                memo: `Un nom s'accorde en genre et en nombre avec son déterminant.`,
                categorie: 'nature_fallback',
                priorite: 10
            });
        }
        candidats.push({
            explication: `Le mot attendu est un nom. Tu as écrit « ${motSaisi} ». Vérifie l'orthographe du mot.`,
            titreAide: 'Orthographe nom',
            memo: `Pour un nom, vérifie son genre (masculin/féminin), son nombre (singulier/pluriel) et ses lettres particulières.`,
            categorie: 'nature_fallback',
            priorite: 10
        });
    }
    if (typeAttendu.includes('adjectif')) {
        if (fallbackEstAccord) {
            candidats.push({
                explication: `Le mot attendu est un adjectif. Tu as écrit « ${motSaisi} ». Vérifie l'accord avec le nom qu'il qualifie.`,
                titreAide: 'Accord adjectif',
                memo: `Un adjectif s'accorde en genre et en nombre avec le nom qu'il qualifie.`,
                categorie: 'nature_fallback',
                priorite: 10
            });
        }
        candidats.push({
            explication: `Le mot attendu est un adjectif. Tu as écrit « ${motSaisi} ». Vérifie l'orthographe du mot.`,
            titreAide: 'Orthographe adjectif',
            memo: `Vérifie chaque lettre de l'adjectif. S'il s'agit d'un accord, revois le genre et le nombre du nom qu'il qualifie.`,
            categorie: 'nature_fallback',
            priorite: 10
        });
    }
    if (typeAttendu.includes('déterminant') || typeAttendu.includes('determinant')) {
        if (fallbackEstAccord) {
            candidats.push({
                explication: `Le mot attendu est un déterminant. Tu as écrit « ${motSaisi} ». Vérifie l'accord avec le nom qui suit.`,
                titreAide: 'Accord déterminant',
                memo: `Un déterminant s'accorde en genre et en nombre avec le nom qu'il accompagne.`,
                categorie: 'nature_fallback',
                priorite: 10
            });
        }
        candidats.push({
            explication: `Le mot attendu est un déterminant. Tu as écrit « ${motSaisi} ». Vérifie l'orthographe du mot.`,
            titreAide: 'Orthographe déterminant',
            memo: `Vérifie chaque lettre du déterminant. S'il s'agit d'un accord, revois le genre et le nombre du nom qui suit.`,
            categorie: 'nature_fallback',
            priorite: 10
        });
    }

    // --- Fallback ultime ---
    candidats.push({
        explication: `Le mot que tu as écrit ne correspond pas au mot attendu. Relis la phrase entière et corrige ce mot en vérifiant sa forme.`,
        titreAide: 'Comparaison avec la phrase dictée',
        memo: `Compare ta saisie avec la dictée et corrige le mot qui diffère.`,
        categorie: 'fallback_ultime',
        priorite: 0
    });

    // ── Sélection du meilleur candidat ──
    // On choisit celui avec la priorité la plus élevée.
    // En cas d'égalité, le premier collecté l'emporte (ordre stable).
    let meilleur = null;
    for (const c of candidats) {
        if (!meilleur || c.priorite > meilleur.priorite) {
            meilleur = c;
        }
    }

    // Retourner sans les champs internes categorie/priorite
    const { categorie, priorite, ...resultatFinal } = meilleur;
    return resultatFinal;
}

    }

    const proto = AbeMainOralPedagogyClass.prototype;
    const api = {};
    Object.getOwnPropertyNames(proto).forEach((name) => {
        if (name !== 'constructor') api[name] = proto[name];
    });

    global.AbeMainOralPedagogy = api;
})(typeof window !== 'undefined' ? window : globalThis);