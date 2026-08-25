(function (global) {
    const api = {
        construireErreurReferenceOrale(index, tokenSaisi, tokenAttendu, tokensReference = []) {
            const motSaisi = tokenSaisi && typeof tokenSaisi.texte === 'string' ? tokenSaisi.texte : '';
            const motAttendu = tokenAttendu && typeof tokenAttendu.texte === 'string' ? tokenAttendu.texte : '';
            const estPonctuation = /^[.,;:!?]$/.test(motAttendu || motSaisi);
            const aideDetaillee = this.obtenirAideDetailleeTokenReference(index, tokenAttendu);

            let explication;
            let titreAide;
            let memo;
            let parcoursType;
            let contexteAccord;

            if (estPonctuation) {
                explication = 'Une phrase se termine toujours par une ponctuation (un point ., un point d\'interrogation ? ou un point d\'exclamation !). Ajoute la ponctuation manquante.';
                titreAide = 'Ponctuation finale';
                memo = 'Toute phrase se termine par un point, un point d\'interrogation ou un point d\'exclamation.';
            } else {
                const enrichi = this.enrichirExplicationOrale(motSaisi, motAttendu, index, tokensReference);
                const titreEnrichi = String((enrichi && enrichi.titreAide) || '');
                const estHomophone = /homophone/i.test(titreEnrichi)
                    || (enrichi && enrichi.parcoursType && enrichi.parcoursType.startsWith('homophone_'))
                    || /homophone/i.test(String((enrichi && enrichi.explication) || ''));
                const estEnrichiSpecifique = estHomophone
                    || /accent|cédille|conjugaison|lettre manquante|lettre en trop|leur|orthographe|accord|nature du mot/i.test(titreEnrichi);

                if (enrichi && estEnrichiSpecifique) {
                    explication = enrichi.explication;
                    titreAide = enrichi.titreAide;
                    memo = enrichi.memo;
                    parcoursType = enrichi.parcoursType || null;
                    contexteAccord = enrichi.contexteAccord || null;
                } else {
                    const blocsOrdonnes = (aideDetaillee && Array.isArray(aideDetaillee.blocsOrdonnes)) ? aideDetaillee.blocsOrdonnes : [];
                    const blocAstuce = (enrichi && enrichi.explication)
                        ? `${estHomophone ? 'Astuce homophone' : 'Astuce'} : ${enrichi.explication}`
                        : '';

                    explication = [...blocsOrdonnes, blocAstuce].filter(Boolean).join(' ').trim() || (enrichi && enrichi.explication);
                    titreAide = (aideDetaillee && aideDetaillee.titreAide) || (enrichi && enrichi.titreAide);
                    memo = (aideDetaillee && aideDetaillee.memo) || (enrichi && enrichi.memo);
                }

                const estParcoursHomophone = parcoursType && parcoursType.startsWith('homophone_');
                if (!estParcoursHomophone && !parcoursType && aideDetaillee && aideDetaillee.parcoursType) {
                    parcoursType = aideDetaillee.parcoursType;
                    contexteAccord = aideDetaillee.contexteAccord || contexteAccord || null;
                }
            }

            const catOral = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
                || (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories)
                || null;
            const estParcoursHomophoneFinal = parcoursType && parcoursType.startsWith('homophone_');
            const regle = (parcoursType && !estParcoursHomophoneFinal)
                ? ''
                : (catOral && typeof catOral.obtenirReglePourTitreAide === 'function')
                    ? catOral.obtenirReglePourTitreAide(titreAide)
                    : 'La phrase attendue doit être reproduite exactement, mot par mot et ponctuation comprise.';

            return {
                type: estPonctuation ? 'ponctuation_finale' : 'reference_orale_attendue',
                position: index,
                indexDebut: index,
                indexFin: index,
                mot: motSaisi,
                correction: motAttendu,
                explication,
                regle,
                titreAide,
                memo,
                parcoursType: parcoursType || null,
                contexteAccord: contexteAccord || null
            };
        },

        construireErreurMotManquantReference(indexReference, tokenAttendu) {
            const motAttendu = tokenAttendu && typeof tokenAttendu.texte === 'string' ? tokenAttendu.texte : '';
            const aideDetaillee = this.obtenirAideDetailleeTokenReference(indexReference, tokenAttendu);
            const explicationBase = 'Il manque un mot (ou plusieurs mots) dans la phrase attendue,<br>merci de la réécouter et de saisir le (ou les) mot(s) manquant(s) ci-dessous.';
            const explication = aideDetaillee && aideDetaillee.explication
                ? `${explicationBase} ${aideDetaillee.explication}`
                : explicationBase;
            const memo = (aideDetaillee && aideDetaillee.memo)
                ? aideDetaillee.memo
                : 'Tu dois bien écouter la phrase qui est lue avant de valider. Tu dois relire ce que tu as écrit pour vérifier que tu n\'as rien oublié et que ta phrase a un sens logique.';

            return {
                type: 'reference_orale_mot_manquant',
                position: indexReference,
                indexDebut: indexReference,
                indexFin: indexReference,
                mot: '',
                correction: motAttendu,
                explication,
                regle: 'En mode dictée orale, il faut reproduire tous les mots de la phrase attendue.',
                titreAide: 'Mot manquant',
                memo
            };
        },

        ajouterErreursReferenceOraleManquantes(resultatAnalyse, tokensSaisis, tokensReference, positionsDivergentes, omissions = []) {
            const divergences = new Set(Array.from(positionsDivergentes || []));
            const erreursOriginales = [...(resultatAnalyse.erreurs || [])];
            const tokenSaisiParIndexMot = (index) => this.obtenirTokenLexicalParIndexMot(tokensSaisis, index);
            const tokenRefParIndexMot = (index) => this.obtenirTokenLexicalParIndexMot(tokensReference, index);
            const omissionsParIndex = new Map();
            (omissions || []).forEach((o) => {
                if (o && typeof o.indexMotOmis === 'number') omissionsParIndex.set(o.indexMotOmis, o);
            });

            const erreurToucheDivergence = (erreur) => {
                const indexes = this.extraireIndexErreur(erreur);
                return indexes.some((index) => divergences.has(index));
            };

            const erreurs = erreursOriginales.filter((erreur) => {
                if (!erreurToucheDivergence(erreur)) return true;
                if (erreur.type === 'reference_orale_mot_manquant') return true;
                if (erreur.type === 'majuscule_phrase') return true;
                if (erreur.type === 'ponctuation_finale') return true;
                return false;
            });

            const mots = Array.isArray(resultatAnalyse.mots)
                ? resultatAnalyse.mots.map((mot) => {
                    if (!mot || !Array.isArray(mot.erreurs)) return mot;
                    return {
                        ...mot,
                        erreurs: mot.erreurs.filter((erreur) => {
                            if (!erreurToucheDivergence(erreur)) return true;
                            if (erreur.type === 'majuscule_phrase') return true;
                            if (erreur.type === 'ponctuation_finale') return true;
                            return false;
                        })
                    };
                })
                : [];

            positionsDivergentes.forEach((index) => {
                const omission = omissionsParIndex.get(index);
                if (omission) {
                    const tokenAttenduOmis = omission.tokenAttendu || tokenRefParIndexMot(index) || null;
                    if (!tokenAttenduOmis || !tokenAttenduOmis.texte) return;

                    const erreurMotManquant = this.construireErreurMotManquantReference(index, tokenAttenduOmis);
                    erreurs.push(erreurMotManquant);
                    // Ne pas attacher l'omission au mot suivant : l'erreur est portée
                    // uniquement par la tuile vide insérée à l'index de référence.
                    return;
                }

                const tokenSaisi = tokenSaisiParIndexMot(index) || null;
                const tokenAttendu = tokenRefParIndexMot(index) || null;
                if (!tokenAttendu || !tokenAttendu.texte) return;

                const erreur = this.construireErreurReferenceOrale(index, tokenSaisi, tokenAttendu, tokensReference);
                erreurs.push(erreur);

                if (mots[index]) {
                    const erreursMot = Array.isArray(mots[index].erreurs) ? [...mots[index].erreurs, erreur] : [erreur];
                    mots[index] = { ...mots[index], erreurs: erreursMot };
                }
            });

            return {
                ...resultatAnalyse,
                mots,
                erreurs
            };
        },

        appliquerFiltreReferenceOrale(phraseSaisie, resultatAnalyse) {
            if (!resultatAnalyse || !Array.isArray(resultatAnalyse.mots) || !Array.isArray(resultatAnalyse.erreurs)) {
                return resultatAnalyse;
            }

            const phraseReference = this.obtenirPhraseReferenceOrale();
            if (!phraseReference) {
                this.statutFiltrageOral = {
                    actif: false,
                    correspondanceExacte: false,
                    fauxPositifsAnnules: 0,
                    divergences: 0
                };
                return resultatAnalyse;
            }

            const tokensSaisis = this.analyseur.tokeniser(phraseSaisie || '');
            const tokensReferenceTokenises = this.analyseur.tokeniser(phraseReference);
            const entreeCorpus = this.obtenirEntreeCorpusDetailleReference();
            const tokensReference = (entreeCorpus && Array.isArray(entreeCorpus.tokensLexicaux) && entreeCorpus.tokensLexicaux.length > 0)
                ? entreeCorpus.tokensLexicaux
                : tokensReferenceTokenises;

            const alignement = this.calculerAlignementLexical(tokensSaisis, tokensReference);
            const omissions = Array.isArray(alignement && alignement.omissions) ? alignement.omissions : [];
            const positionsDivergentes = (alignement && alignement.divergentes instanceof Set)
                ? alignement.divergentes
                : new Set();

            const erreursOriginales = Array.isArray(resultatAnalyse.erreurs) ? resultatAnalyse.erreurs : [];
            const erreursFiltrees = erreursOriginales.filter((erreur) => {
                if (!erreur) return false;
                if (erreur.type === 'majuscule_phrase' || erreur.type === 'ponctuation_finale') {
                    return true;
                }
                const indexes = this.extraireIndexErreur(erreur);
                if (!indexes.length) return true;
                const uniquementPositionsIdentiques = indexes.every((index) => !positionsDivergentes.has(index));
                return !uniquementPositionsIdentiques;
            });

            const fauxPositifsAnnules = erreursOriginales.length - erreursFiltrees.length;
            const motsFiltres = (Array.isArray(resultatAnalyse.mots) ? resultatAnalyse.mots : []).map((mot) => {
                if (!mot || !Array.isArray(mot.erreurs)) return mot;
                const erreursMotFiltrees = mot.erreurs.filter((erreur) => {
                    if (!erreur) return false;
                    if (erreur.type === 'majuscule_phrase' || erreur.type === 'ponctuation_finale') return true;
                    return erreursFiltrees.includes(erreur);
                });
                return { ...mot, erreurs: erreursMotFiltrees };
            });

            const resultatFiltre = {
                ...resultatAnalyse,
                mots: motsFiltres,
                erreurs: erreursFiltrees
            };

            let resultatFinal = resultatFiltre;
            if (positionsDivergentes.size > 0) {
                resultatFinal = this.ajouterErreursReferenceOraleManquantes(
                    resultatFiltre,
                    tokensSaisis,
                    tokensReference,
                    positionsDivergentes,
                    omissions
                );
            }

            if (typeof this.ajouterErreurMajusculeReference === 'function') {
                resultatFinal = this.ajouterErreurMajusculeReference(resultatFinal, phraseSaisie, phraseReference);
            }

            if (typeof this.ajouterErreurPonctuationFinaleReference === 'function') {
                resultatFinal = this.ajouterErreurPonctuationFinaleReference(resultatFinal, phraseSaisie, phraseReference);
            }

            if (typeof this.dedupliquerErreursPonctuationFinale === 'function') {
                resultatFinal = this.dedupliquerErreursPonctuationFinale(resultatFinal);
            }

            const aErreurs = Array.isArray(resultatFinal.erreurs) && resultatFinal.erreurs.length > 0;

            this.statutFiltrageOral = {
                actif: true,
                correspondanceExacte: !aErreurs && positionsDivergentes.size === 0,
                fauxPositifsAnnules,
                divergences: positionsDivergentes.size,
                omissionsDetectees: omissions.length
            };
            return resultatFinal;
        }
    };

    global.AbeMainOralReferenceFilter = api;
})(typeof window !== 'undefined' ? window : globalThis);
