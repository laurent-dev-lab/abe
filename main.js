/**
 * Moteur principal de l'application Abe
 * Gestion des états, des interactions et de l'interface utilisateur
 */

class AbeApplication {
    constructor() {
        this.enCoursDAnalyse = false;
        this.analyseur = new AnalyseurGrammatical();
        this.dictionnaireCharge = false;
        this.phraseActuelle = '';
        this.motsAnalyse = [];
        this.erreurs = [];
        this.erreurActuelle = null;
        this.questionActuelle = 0;
        this.questionsAide = [];
        this.contexteAide = {};
        this.correctionEnCoursCle = null;
        this.erreursCorrigees = new Set();
        this.essaisGuidesParErreur = new Map();
        this.essaisDirectsParErreur = new Map();
        this.maxEssaisParPropositionGuidee = 3;
        this.maxEssaisCorrectionDirecte = 3;
        this.syntheseVocale = typeof window !== 'undefined' && 'speechSynthesis' in window
            ? window.speechSynthesis
            : null;
        this.statutFiltrageOral = {
            actif: false,
            correspondanceExacte: false,
            fauxPositifsAnnules: 0,
            divergences: 0
        };
        this.corpusDetaille = [];
        this.corpusDetailleParPhrase = new Map();
        this.corpusDetailleCharge = false;
        this.statutCorpusDetaille = {
            charge: false,
            totalEntrees: 0,
            phrasesAjouteesAuModeOral: 0
        };
        // Configuration: forcer l'utilisation de la phrase du corpus comme seule référence
        this.config = this.config || {};
        this.config.forceCorpusAsOnlyReference = true;

        // If corpus-only mode requested, neutralise analyser fallbacks that consult
        // dictionary / bescherelle / heuristics so they cannot influence oral flow.
        if (this.config.forceCorpusAsOnlyReference && this.analyseur) {
            try {
                // keep originals if needed
                this.analyseur._originalGetWordData = this.analyseur.getWordData;
            } catch (e) {}

            this.analyseur.getWordData = function () { return null; };
            this.analyseur.getWordDataOfType = function () { return null; };
            this.analyseur.doitTolérerMotInconnuAtteste = function () { return false; };
            this.analyseur.estMotAttesteParCorpusBescherelle = function () { return false; };
            this.analyseur.scoreContexteMotCorpusBescherelle = function () { return 0; };
        }
        this.felicitationsEnAttente = false;
        this.jeuInvariable = new (typeof JeuMotInvariable !== 'undefined' ? JeuMotInvariable : class {
            constructor() {}
            doitDeclencher() { return false; }
            initialiser() {}
            rendre() {}
            reinitialiser() {}
            desactiver() {}
        })({
            analyseur: this.analyseur,
            onCorrige: (correction) => {
                this.reinitialiserEssaisGuideErreurActuelle();
                this.reinitialiserEssaisDirectErreurActuelle();
                this.appliquerCorrectionErreurCourante(correction);
                this.mettreAJourProgression();
            },
            onAffiche: () => this.afficherJeuMotInvariable(),
            onMessage: (msg, type) => this.afficherMessage(msg, type),
            estSectionVisible: () => this.questionSection && !this.questionSection.classList.contains('hidden'),
            onTermine: () => {
                const toutCorrige = this.erreursCorrigees.size >= this.erreurs.length && this.erreurs.length > 0;
                this.afficherExplicationComplete();
                if (toutCorrige) this.felicitationsEnAttente = true;
            }
        });

        // Statistiques de session
        this.sessionTotalErreursTrouvees = this.lireSessionNumber('abe_total_erreurs_trouvees', 0);
        this.sessionTotalErreursCorrigees = this.lireSessionNumber('abe_total_erreurs_corrigees', 0);
        // Pour éviter de compter deux fois la même correction dans la session
        this.sessionCorrectionsUniques = new Set();
        
        this.initialiserElements();
        this.attacherEvenements();
        this.verrouillerSaisie();
        this.chargerDictionnaire();
        this.chargerCorpusDetaille();

        // Déverrouiller la saisie quand une dictée orale commence
        if (typeof window !== 'undefined') {
            window.addEventListener('abe-dictee-orale-demarree', () => {
                this.deverrouillerSaisie();
            });
        }
    }

    verrouillerSaisie() {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.verrouillerSaisie === 'function') {
            window.AbeMainAppState.verrouillerSaisie.call(this);
        }
    }

    deverrouillerSaisie() {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.deverrouillerSaisie === 'function') {
            window.AbeMainAppState.deverrouillerSaisie.call(this);
        }
    }

    lireSessionNumber(key, defaut) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.lireSessionNumber === 'function') {
            return window.AbeMainAppState.lireSessionNumber.call(this, key, defaut);
        }
        return defaut;
    }

    ecrireSessionNumber(key, value) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.ecrireSessionNumber === 'function') {
            window.AbeMainAppState.ecrireSessionNumber.call(this, key, value);
        }
    }

    ajouterErreursTrouveesSession(nombre) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.ajouterErreursTrouveesSession === 'function') {
            window.AbeMainAppState.ajouterErreursTrouveesSession.call(this, nombre);
        }
    }

    ajouterErreurCorrigeeSession(uniqueKey) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.ajouterErreurCorrigeeSession === 'function') {
            window.AbeMainAppState.ajouterErreurCorrigeeSession.call(this, uniqueKey);
        }
    }

    obtenirCleErreur(erreur = this.erreurActuelle) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.obtenirCleErreur === 'function') {
            return window.AbeMainAppState.obtenirCleErreur.call(this, erreur);
        }
        return null;
    }

    estErreurCorrigee(erreur) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.estErreurCorrigee === 'function') {
            return window.AbeMainAppState.estErreurCorrigee.call(this, erreur);
        }
        return false;
    }

    obtenirPrioriteErreur(erreur) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.obtenirPrioriteErreur === 'function') {
            return window.AbeMainAppState.obtenirPrioriteErreur.call(this, erreur);
        }
        return 50;
    }

    comparerErreurs(a, b) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.comparerErreurs === 'function') {
            return window.AbeMainAppState.comparerErreurs.call(this, a, b);
        }
        return 0;
    }

    ordonnerErreursPourCorrection(liste) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.ordonnerErreursPourCorrection === 'function') {
            return window.AbeMainAppState.ordonnerErreursPourCorrection.call(this, liste);
        }
        return [];
    }

    estErreurActionnable(erreur) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.estErreurActionnable === 'function') {
            return window.AbeMainAppState.estErreurActionnable.call(this, erreur);
        }
        return false;
    }

    filtrerErreursActionnables(liste) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.filtrerErreursActionnables === 'function') {
            return window.AbeMainAppState.filtrerErreursActionnables.call(this, liste);
        }
        return [];
    }

    obtenirErreursNonCorrigees() {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.obtenirErreursNonCorrigees === 'function') {
            return window.AbeMainAppState.obtenirErreursNonCorrigees.call(this);
        }
        return [];
    }

    doitConfirmerReinitialisation() {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.doitConfirmerReinitialisation === 'function') {
            return window.AbeMainAppState.doitConfirmerReinitialisation.call(this);
        }
        return false;
    }

    incrementerEssaisGuideErreurActuelle() {
        if (window.AbeMainCorrectionWorkflow && typeof window.AbeMainCorrectionWorkflow.incrementerEssaisGuideErreurActuelle === 'function') {
            return window.AbeMainCorrectionWorkflow.incrementerEssaisGuideErreurActuelle.call(this);
        }
        return 0;
    }

    reinitialiserEssaisGuideErreurActuelle() {
        if (window.AbeMainCorrectionWorkflow && typeof window.AbeMainCorrectionWorkflow.reinitialiserEssaisGuideErreurActuelle === 'function') {
            window.AbeMainCorrectionWorkflow.reinitialiserEssaisGuideErreurActuelle.call(this);
        }
    }

    incrementerEssaisDirectErreurActuelle() {
        if (window.AbeMainCorrectionWorkflow && typeof window.AbeMainCorrectionWorkflow.incrementerEssaisDirectErreurActuelle === 'function') {
            return window.AbeMainCorrectionWorkflow.incrementerEssaisDirectErreurActuelle.call(this);
        }
        return 0;
    }

    reinitialiserEssaisDirectErreurActuelle() {
        if (window.AbeMainCorrectionWorkflow && typeof window.AbeMainCorrectionWorkflow.reinitialiserEssaisDirectErreurActuelle === 'function') {
            window.AbeMainCorrectionWorkflow.reinitialiserEssaisDirectErreurActuelle.call(this);
        }
    }

    obtenirSpanErreur(erreur = this.erreurActuelle) {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.obtenirSpanErreur === 'function') {
            return window.AbeMainAppState.obtenirSpanErreur.call(this, erreur);
        }
        return null;
    }

    appliquerCorrectionErreurCourante(correction) {
        if (window.AbeMainCorrectionWorkflow && typeof window.AbeMainCorrectionWorkflow.appliquerCorrectionErreurCourante === 'function') {
            return window.AbeMainCorrectionWorkflow.appliquerCorrectionErreurCourante.call(this, correction);
        }
        return null;
    }

    revelerCorrectionApresTroisEssais() {
        if (!this.erreurActuelle) return;

        this.reinitialiserEssaisGuideErreurActuelle();
        this.afficherMessage('Tu as utilise tes 3 essais. On te donne la regle, puis tu pourras recommencer pour trouver la correction toi-meme.', 'info');

        this.afficherExplicationComplete();
    }

    /**
     * Charge le dictionnaire de manière asynchrone
     */
    async chargerDictionnaire() {
        try {
            if (!this.analyseur) {
                this.analyseur = new AnalyseurGrammatical();
            }
            const [dictionnaireResponse, erreursResponse, erreursCorpusTestsResponse, bescherelleResponse, fichesBescherelleResponse, chunksBescherelleResponse] = await Promise.all([
                fetch('refs/dictionnaire.json'),
                fetch('refs/erreurs_frequentes_6e.json'),
                fetch('refs/erreurs_frequentes_corpus_tests.json'),
                fetch('refs/regles_bescherelle.json'),
                fetch('refs/bescherelle_fiches_auto.json'),
                fetch('refs/bescherelle_chunks_full.json')
            ]);

            if (!dictionnaireResponse.ok) {
                throw new Error('Impossible de charger le dictionnaire');
            }

            const data = await dictionnaireResponse.json();
            const erreursFrequentes = erreursResponse.ok ? await erreursResponse.json() : null;
            const erreursCorpusTests = erreursCorpusTestsResponse.ok ? await erreursCorpusTestsResponse.json() : null;
            const reglesBescherelle = bescherelleResponse.ok ? await bescherelleResponse.json() : null;
            const chunksBescherelle = chunksBescherelleResponse.ok ? await chunksBescherelleResponse.json() : null;
            const erreursFusionnees = {
                fautesLexicales: [
                    ...((erreursFrequentes && Array.isArray(erreursFrequentes.fautesLexicales)) ? erreursFrequentes.fautesLexicales : []),
                    ...((erreursCorpusTests && Array.isArray(erreursCorpusTests.fautesLexicales)) ? erreursCorpusTests.fautesLexicales : [])
                ],
                motifs: [
                    ...((erreursFrequentes && Array.isArray(erreursFrequentes.motifs)) ? erreursFrequentes.motifs : []),
                    ...((erreursCorpusTests && Array.isArray(erreursCorpusTests.motifs)) ? erreursCorpusTests.motifs : [])
                ]
            };
            if (reglesBescherelle && fichesBescherelleResponse.ok) {
                const fiches = await fichesBescherelleResponse.json();
                if (fiches && typeof fiches === 'object') {
                    reglesBescherelle.fichesParType = fiches.fichesParType || {};
                }
            }
            this.analyseur.initialiser(data, erreursFusionnees, reglesBescherelle, chunksBescherelle);
            this.dictionnaireCharge = true;
            console.log('Dictionnaire chargé avec succès');
        } catch (error) {
            console.error('Erreur lors du chargement du dictionnaire:', error);
            this.afficherMessage('Erreur : le dictionnaire n\'a pas pu être chargé.', 'error');
        }
    }

    /**
     * Initialise les références aux éléments DOM
     */
    initialiserElements() {
        // Sections
        this.inputSection = document.getElementById('input-section');
        this.tilesSection = document.getElementById('tiles-section');
        this.questionSection = document.getElementById('question-section');
        this.feedbackSection = document.getElementById('feedback-section');
        
        // Éléments de saisie
        this.sentenceInput = document.getElementById('sentence-input');
        this.validateBtn = document.getElementById('validate-btn');
        
        // Conteneurs
        this.wordsContainer = document.getElementById('words-container');
        this.wordInteraction = document.getElementById('word-interaction');
        this.quickActions = document.getElementById('quick-actions');
        this.correctionInput = document.getElementById('correction-input');
        this.correctionField = document.getElementById('correction-field');
        
        // Boutons d'interaction
        this.foundBtn = document.getElementById('found-btn');
        this.helpBtn = document.getElementById('help-btn');
        this.submitCorrection = document.getElementById('submit-correction');
        this.cancelCorrection = document.getElementById('cancel-correction');
        this.continueBtn = document.getElementById('continue-btn');
        this.listenTilesBtn = document.getElementById('listen-tiles-btn');
        
        // Zone de questionnement
        this.questionText = document.getElementById('question-text');
        this.answerOptions = document.getElementById('answer-options');
        this.questionHeader = document.getElementById('question-header');
        
        // Feedback
        this.feedbackMessage = document.getElementById('feedback-message');
        
        // Progression
        this.errorsFound = document.getElementById('errors-found');
        this.totalErrors = document.getElementById('total-errors');
        this.progressFill = document.getElementById('progress-fill');

        // Modale d'analyse
        this.modalAnalyse = document.getElementById('modal-analyse');
        this.modalAnalyseTexte = document.getElementById('modal-analyse-texte');
        this.analyseProgressFill = document.getElementById('analyse-progress-fill');

        // Modale de confirmation de réinitialisation
        this.modalReinitialisation = document.getElementById('modal-reinitialisation');
        this.modalReinitialisationTexte = document.getElementById('modal-reinitialisation-texte');
        this.messageParDefautModaleReinitialisation = this.modalReinitialisationTexte
            ? this.modalReinitialisationTexte.textContent
            : 'Il reste des erreurs non corrigées. Veux-tu vraiment recommencer ?';
        this.modaleReinitialisationOuverte = false;
        this.reinitialisationErreursRestantes = 0;

        // Modale de verrouillage du mode oral
        this.modalPhraseOrale = document.getElementById('modal-phrase-orale');
        this.modalPhraseOraleTexte = document.getElementById('modal-phrase-orale-texte');
    }

    /**
     * Attache les écouteurs d'événements
     */
    attacherEvenements() {
        this.validateBtn.addEventListener('click', () => this.validerPhrase());
        this.sentenceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || !e.shiftKey)) {
                e.preventDefault();
                this.validerPhrase();
            }
        });

        this.foundBtn.addEventListener('click', () => this.montrerChampCorrection());
        this.helpBtn.addEventListener('click', () => this.demarrerAide());
        this.submitCorrection.addEventListener('click', () => this.soumettreCorrection());
        this.cancelCorrection.addEventListener('click', () => this.annulerCorrection());
        this.continueBtn.addEventListener('click', () => this.continuer());
        if (this.listenTilesBtn) this.listenTilesBtn.addEventListener('click', () => this.lirePhrase(this.phraseActuelle || this.reconstruirePhraseDepuisTuiles()));

        // Modale félicitations
        this.modalFelicitations = document.getElementById('modal-felicitations');
        const modalBtn = document.getElementById('modal-felicitations-btn');
        if (modalBtn) modalBtn.addEventListener('click', () => this.fermerModaleFelicitations());

        // Modale de confirmation avant recommencer
        const modalReinitAnnulerBtn = document.getElementById('modal-reinitialisation-annuler-btn');
        const modalReinitConfirmerBtn = document.getElementById('modal-reinitialisation-confirmer-btn');
        if (modalReinitAnnulerBtn) {
            modalReinitAnnulerBtn.addEventListener('click', () => this.fermerModaleReinitialisation());
        }
        if (modalReinitConfirmerBtn) {
            modalReinitConfirmerBtn.addEventListener('click', () => this.confirmerReinitialisationDepuisModale());
        }
        if (this.modalReinitialisation) {
            this.modalReinitialisation.addEventListener('click', (event) => {
                if (event.target === this.modalReinitialisation) {
                    this.fermerModaleReinitialisation();
                }
            });
        }

        const modalPhraseOraleFermerBtn = document.getElementById('modal-phrase-orale-fermer-btn');
        if (modalPhraseOraleFermerBtn) {
            modalPhraseOraleFermerBtn.addEventListener('click', () => this.fermerModalePhraseOrale());
        }
        if (this.modalPhraseOrale) {
            this.modalPhraseOrale.addEventListener('click', (event) => {
                if (event.target === this.modalPhraseOrale) {
                    this.fermerModalePhraseOrale();
                }
            });
        }

        this.correctionField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.soumettreCorrection();
            }
        });
    }

    /**
     * Valide la phrase saisie et lance l'analyse
     */
    async validerPhrase() {
        if (this.enCoursDAnalyse) {
            return;
        }

        const phrase = this.sentenceInput.value.trim();
        if (!phrase) {
            this.afficherMessage('Veuillez écrire une phrase avant de valider.', 'info');
            return;
        }

        const phraseReferenceOrale = this.obtenirPhraseReferenceOrale();
        const reconnaissanceOrale = this.reconnaitrePhraseOrale(phrase, phraseReferenceOrale);
        if (phraseReferenceOrale && !reconnaissanceOrale.reconnue) {
            this.montrerModalePhraseOrale('La phrase entrée ne correspond pas à la phrase dictée. Réécoute la dictée puis réessaie.');
            return;
        }

        this.enCoursDAnalyse = true;
        if (this.validateBtn) this.validateBtn.disabled = true;
        if (this.sentenceInput) this.sentenceInput.disabled = true;

        try {
            if (phraseReferenceOrale && reconnaissanceOrale.reconnue && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('abe-dictee-orale-phrase-validee', {
                    detail: { phrase: phraseReferenceOrale }
                }));
            }

            this.phraseActuelle = phrase;
            this.felicitationsEnAttente = false;
            // Nouvelle phrase: on réinitialise l'état de correction pour la phrase courante
            this.erreursCorrigees.clear();
            this.essaisGuidesParErreur.clear();
            this.essaisDirectsParErreur.clear();
            
            // Vérification que le dictionnaire est chargé
            if (!this.dictionnaireCharge) {
                console.error('Dictionnaire non chargé');
                this.afficherMessage('Veuillez patienter, le dictionnaire est en cours de chargement...', 'info');
                return;
            }

            this.montrerModalAnalyse('Préparation de l’analyse…', 12);
            await this.attendreRendu();
            await this.attendreRendu();
            this.mettreAJourModalAnalyse('Repérage des mots et des accords…', 34);
            await new Promise((resolve) => setTimeout(resolve, 80));

            const analyserProgressive = typeof this.analyseur?.analyserPhraseProgressive === 'function';
            let resultat;
            if (analyserProgressive) {
                resultat = await this.analyseur.analyserPhraseProgressive(phrase, {
                    pauseMs: 0,
                    onProgress: ({ etape, totalEtapes }) => {
                        const ratio = totalEtapes > 0 ? etape / totalEtapes : 1;
                        const progression = Math.min(86, Math.max(36, Math.round(36 + (ratio * 50))));
                        this.mettreAJourModalAnalyse('Repérage des mots et des accords…', progression);
                    }
                });
            } else if (typeof this.analyseur?.analyserPhrase === 'function') {
                resultat = this.analyseur.analyserPhrase(phrase);
            } else {
                resultat = { mots: [], erreurs: [] };
            }

            this.mettreAJourModalAnalyse('Application des corrections de dictée…', 92);
            await this.attendreRendu();
            resultat = this.appliquerFiltreReferenceOrale(phrase, resultat);

            const rawMots = (resultat && Array.isArray(resultat.mots)) ? resultat.mots : [];
            const rawErreurs = (resultat && Array.isArray(resultat.erreurs)) ? resultat.erreurs : [];

            this.motsAnalyse = rawMots;
            this.erreurs = this.ordonnerErreursPourCorrection(
                this.filtrerErreursActionnables(rawErreurs)
            );
            this.motsAnalyse.forEach((mot) => {
                if (mot && Array.isArray(mot.erreurs)) {
                    mot.erreurs = this.ordonnerErreursPourCorrection(
                        this.filtrerErreursActionnables(mot.erreurs)
                    );
                }
            });

            this.mettreAJourModalAnalyse('Analyse terminée.', 100);
            await this.attendre(60);

            // Stats session: on cumule les erreurs trouvées sur la session
            this.ajouterErreursTrouveesSession(this.erreurs.length);

            // Affichage des tuiles
            this.afficherTuiles();
            this.mettreAJourProgression();

            // Transition vers la section des tuiles
            this.inputSection.classList.add('hidden');
            this.tilesSection.classList.remove('hidden');

            if (this.erreurs.length === 0) {
                this.afficherMessage('🎉 Bravo ! Ta phrase est parfaite !', 'success');
            } else {
                this.afficherMessage(`J'ai trouvé ${this.erreurs.length} erreur(s) à corriger. Clique sur les mots orange pour commencer !`, 'info');
            }
        } catch (err) {
            console.error('Erreur lors de l’analyse de la phrase :', err);
            this.afficherMessage('Une erreur est survenue pendant l’analyse. Peux-tu réessayer ?', 'error');
        } finally {
            this.masquerModalAnalyse();
            this.enCoursDAnalyse = false;
            if (this.validateBtn) this.validateBtn.disabled = false;
            if (this.sentenceInput) this.sentenceInput.disabled = false;
        }
    }

    /**
     * Affiche les mots sous forme de tuiles cliquables
     */
    attendre(ms = 0) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    attendreRendu() {
        return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    obtenirPhraseReferenceOrale() {
        const lecteur = (typeof window !== 'undefined') ? window.abeLecteurOral : null;
        const phrase = lecteur && typeof lecteur.phraseCourante === 'string' ? lecteur.phraseCourante.trim() : '';
        return phrase || '';
    }

    normaliserPhraseCorpus(phrase) {
        return String(phrase || '')
            .replace(/\s+/g, ' ')
            .replace(/\s+([.,;:!?])/g, '$1')
            .trim()
            .toLowerCase();
    }

    estTokenPonctuationDetail(token) {
        if (!token) return true;
        const nature = String(token.nature || '').toLowerCase();
        const texte = String(token.texte || '').trim();
        if (nature === 'ponctuation') return true;
        return /^[.,;:!?]$/.test(texte);
    }

    construireIndexCorpusDetaille(phraseObj = {}) {
        const tokens = Array.isArray(phraseObj.tokens) ? phraseObj.tokens : [];
        const tokensParId = new Map();
        const tokenIndexParId = new Map();
        const tokensLexicaux = [];

        let lexicalIndex = 0;
        tokens.forEach((token) => {
            if (!token) return;
            const id = Number(token.id);
            if (Number.isInteger(id)) {
                tokensParId.set(id, token);
                // Map id -> lexical index (index among tokensLexicaux, i.e. sans ponctuation)
                if (!this.estTokenPonctuationDetail(token)) {
                    tokenIndexParId.set(id, lexicalIndex);
                } else {
                    // ponctuation : map to -1 to indicate no lexical index
                    tokenIndexParId.set(id, -1);
                }
            }
            if (!this.estTokenPonctuationDetail(token)) {
                tokensLexicaux.push(token);
                lexicalIndex += 1;
            }
        });

        const relationsGlobales = Array.isArray(phraseObj.relations_globales)
            ? phraseObj.relations_globales
            : [];

        return {
            ...phraseObj,
            tokens,
            tokensParId,
            tokenIndexParId,
            tokensLexicaux,
            relationsGlobales
        };
    }

    extraireIdsRelationGlobale(relation = {}) {
        const ids = new Set();
        Object.values(relation || {}).forEach((valeur) => {
            if (typeof valeur === 'number' && Number.isInteger(valeur)) {
                ids.add(valeur);
            }
            if (Array.isArray(valeur)) {
                valeur.forEach((v) => {
                    if (typeof v === 'number' && Number.isInteger(v)) ids.add(v);
                });
            }
        });
        return ids;
    }

    obtenirEntreeCorpusDetailleReference() {
        if (!this.corpusDetailleCharge || !(this.corpusDetailleParPhrase instanceof Map)) return null;
        const reference = this.obtenirPhraseReferenceOrale();
        if (!reference) return null;
        const cle = this.normaliserPhraseCorpus(reference);
        return this.corpusDetailleParPhrase.get(cle) || null;
    }

    obtenirDefinitionNaturePedagogique(nature = '') {
        const cat = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            || (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories) || null;
        if (cat && typeof cat.obtenirDefinitionNaturePedagogique === 'function') {
            return cat.obtenirDefinitionNaturePedagogique(nature);
        }
        return '';
    }

    obtenirDefinitionDependancePedagogique(dep = '') {
        const cat = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            || (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories) || null;
        if (cat && typeof cat.obtenirDefinitionDependancePedagogique === 'function') {
            return cat.obtenirDefinitionDependancePedagogique(dep);
        }
        return '';
    }

    obtenirDefinitionRelationGlobalePedagogique(type = '') {
        const cat = (typeof window !== 'undefined' && window.AbeAnalyseurCategories)
            || (typeof globalThis !== 'undefined' && globalThis.AbeAnalyseurCategories) || null;
        if (cat && typeof cat.obtenirDefinitionRelationGlobalePedagogique === 'function') {
            return cat.obtenirDefinitionRelationGlobalePedagogique(type);
        }
        return '';
    }

    construireExplicationParNatureToken(tokenDetail = null) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.construireExplicationParNatureToken === 'function') {
            return window.AbeMainOralPedagogy.construireExplicationParNatureToken.call(this, tokenDetail);
        }
        return null;
    }

    obtenirAideDetailleeTokenReference(indexMot, tokenAttendu) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.obtenirAideDetailleeTokenReference === 'function') {
            return window.AbeMainOralPedagogy.obtenirAideDetailleeTokenReference.call(this, indexMot, tokenAttendu);
        }
        return null;
    }

    async chargerCorpusDetaille() {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.chargerCorpusDetaille === 'function') {
            return window.AbeMainOralPedagogy.chargerCorpusDetaille.call(this);
        }
        this.corpusDetailleCharge = false;
        this.statutCorpusDetaille = {
            charge: false,
            totalEntrees: 0,
            phrasesAjouteesAuModeOral: 0
        };
    }

    normaliserTokenComparaison(token) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.normaliserTokenComparaison === 'function') {
            return window.AbeMainOralPedagogy.normaliserTokenComparaison.call(this, token);
        }
        return String(token || '').toLowerCase().trim();
    }

    calculerPositionsDivergentes(tokensSaisis, tokensReference) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.calculerPositionsDivergentes === 'function') {
            return window.AbeMainOralPedagogy.calculerPositionsDivergentes.call(this, tokensSaisis, tokensReference);
        }
        return new Set();
    }

    extraireTokensLexicauxAvecMeta(tokens = []) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.extraireTokensLexicauxAvecMeta === 'function') {
            return window.AbeMainOralPedagogy.extraireTokensLexicauxAvecMeta.call(this, tokens);
        }
        return [];
    }

    obtenirTokenLexicalParIndexMot(tokens = [], indexMot = -1) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.obtenirTokenLexicalParIndexMot === 'function') {
            return window.AbeMainOralPedagogy.obtenirTokenLexicalParIndexMot.call(this, tokens, indexMot);
        }
        return null;
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
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.extraireTokensReconnaissancePhrase === 'function') {
            return window.AbeMainOralPedagogy.extraireTokensReconnaissancePhrase.call(this, tokens);
        }
        return [];
    }

    calculerLongueurLCS(tokensA = [], tokensB = []) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.calculerLongueurLCS === 'function') {
            return window.AbeMainOralPedagogy.calculerLongueurLCS.call(this, tokensA, tokensB);
        }
        return 0;
    }

    calculerDistanceLevenshtein(texteA = '', texteB = '') {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.calculerDistanceLevenshtein === 'function') {
            return window.AbeMainOralPedagogy.calculerDistanceLevenshtein.call(this, texteA, texteB);
        }
        return 0;
    }

    calculerSimilariteTokens(texteA = '', texteB = '') {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.calculerSimilariteTokens === 'function') {
            return window.AbeMainOralPedagogy.calculerSimilariteTokens.call(this, texteA, texteB);
        }
        return 0;
    }

    calculerScoreAlignementTokens(tokensA = [], tokensB = []) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.calculerScoreAlignementTokens === 'function') {
            return window.AbeMainOralPedagogy.calculerScoreAlignementTokens.call(this, tokensA, tokensB);
        }
        return 0;
    }

    reconnaitrePhraseOrale(phraseSaisie, phraseReference) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.reconnaitrePhraseOrale === 'function') {
            return window.AbeMainOralPedagogy.reconnaitrePhraseOrale.call(this, phraseSaisie, phraseReference);
        }
        return { reconnue: true, exacte: false, score: 1 };
    }

    extraireIndexErreur(erreur) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.extraireIndexErreur === 'function') {
            return window.AbeMainOralPedagogy.extraireIndexErreur.call(this, erreur);
        }
        return [];
    }

    extrairePonctuationFinale(phrase) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.extrairePonctuationFinale === 'function') {
            return window.AbeMainOralPedagogy.extrairePonctuationFinale.call(this, phrase);
        }
        return '';
    }

    ajouterErreurPonctuationFinaleReference(resultatAnalyse, phraseSaisie, phraseReference) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.ajouterErreurPonctuationFinaleReference === 'function') {
            return window.AbeMainOralPedagogy.ajouterErreurPonctuationFinaleReference.call(this, resultatAnalyse, phraseSaisie, phraseReference);
        }
        return resultatAnalyse;
    }

    ajouterErreurMajusculeReference(resultatAnalyse, phraseSaisie, phraseReference) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.ajouterErreurMajusculeReference === 'function') {
            return window.AbeMainOralPedagogy.ajouterErreurMajusculeReference.call(this, resultatAnalyse, phraseSaisie, phraseReference);
        }
        return resultatAnalyse;
    }

    enrichirExplicationAccord(motSaisi, motAttendu, index = -1, tokensReference = []) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.enrichirExplicationAccord === 'function') {
            return window.AbeMainOralPedagogy.enrichirExplicationAccord.call(this, motSaisi, motAttendu, index, tokensReference);
        }
        return null;
    }

    enrichirExplicationOrale(motSaisi, motAttendu, index = -1, tokensReference = []) {
        if (window.AbeMainOralPedagogy && typeof window.AbeMainOralPedagogy.enrichirExplicationOrale === 'function') {
            return window.AbeMainOralPedagogy.enrichirExplicationOrale.call(this, motSaisi, motAttendu, index, tokensReference);
        }
        return {
            explication: 'Le mot que tu as écrit ne correspond pas à la dictée.',
            titreAide: 'Comparaison avec la phrase dictée',
            memo: 'Compare ta saisie avec la dictée.'
        };
    }

    construireErreurReferenceOrale(index, tokenSaisi, tokenAttendu, tokensReference = []) {
        if (window.AbeMainOralReferenceFilter && typeof window.AbeMainOralReferenceFilter.construireErreurReferenceOrale === 'function') {
            return window.AbeMainOralReferenceFilter.construireErreurReferenceOrale.call(this, index, tokenSaisi, tokenAttendu, tokensReference);
        }
        return null;
    }

    construireErreurMotManquantReference(indexReference, tokenAttendu) {
        if (window.AbeMainOralReferenceFilter && typeof window.AbeMainOralReferenceFilter.construireErreurMotManquantReference === 'function') {
            return window.AbeMainOralReferenceFilter.construireErreurMotManquantReference.call(this, indexReference, tokenAttendu);
        }
        return null;
    }

    ajouterErreursReferenceOraleManquantes(resultatAnalyse, tokensSaisis, tokensReference, positionsDivergentes, omissions = []) {
        if (window.AbeMainOralReferenceFilter && typeof window.AbeMainOralReferenceFilter.ajouterErreursReferenceOraleManquantes === 'function') {
            return window.AbeMainOralReferenceFilter.ajouterErreursReferenceOraleManquantes.call(this, resultatAnalyse, tokensSaisis, tokensReference, positionsDivergentes, omissions);
        }
        return resultatAnalyse;
    }

    appliquerFiltreReferenceOrale(phraseSaisie, resultatAnalyse) {
        if (window.AbeMainOralReferenceFilter && typeof window.AbeMainOralReferenceFilter.appliquerFiltreReferenceOrale === 'function') {
            return window.AbeMainOralReferenceFilter.appliquerFiltreReferenceOrale.call(this, phraseSaisie, resultatAnalyse);
        }
        return resultatAnalyse;
    }

    dedupliquerErreursPonctuationFinale(resultatAnalyse) {
        if (!resultatAnalyse || !Array.isArray(resultatAnalyse.erreurs)) {
            return resultatAnalyse;
        }
        const erreursPonctuation = resultatAnalyse.erreurs.filter((erreur) => erreur && erreur.type === 'ponctuation_finale');
        if (erreursPonctuation.length <= 1) {
            return resultatAnalyse;
        }

        const scorePonctuation = (erreur) => {
            const correction = String(erreur && erreur.correction ? erreur.correction : '').trim();
            const ponctSimple = /^[.?!]$/.test(correction) ? 2 : 0;
            const position = typeof (erreur && erreur.position) === 'number' ? erreur.position : -1;
            return (ponctSimple * 10000) + position;
        };

        const ponctuationPrioritaire = erreursPonctuation.reduce((meilleure, courante) => {
            if (!meilleure) return courante;
            return scorePonctuation(courante) >= scorePonctuation(meilleure) ? courante : meilleure;
        }, null);

        const erreurs = resultatAnalyse.erreurs.filter((erreur) => {
            if (!erreur || erreur.type !== 'ponctuation_finale') return true;
            return erreur === ponctuationPrioritaire;
        });

        const mots = Array.isArray(resultatAnalyse.mots)
            ? resultatAnalyse.mots.map((mot) => {
                if (!mot || !Array.isArray(mot.erreurs)) return mot;
                return {
                    ...mot,
                    erreurs: mot.erreurs.filter((erreur) => {
                        if (!erreur || erreur.type !== 'ponctuation_finale') return true;
                        return erreur === ponctuationPrioritaire;
                    })
                };
            })
            : resultatAnalyse.mots;

        return {
            ...resultatAnalyse,
            mots,
            erreurs
        };
    }

    reconstruirePhraseDepuisTuiles() {
        return (this.motsAnalyse || [])
            .map((mot) => mot && mot.texte ? mot.texte : '')
            .filter(Boolean)
            .join(' ')
            .replace(/\s+([.,;:!?])/g, '$1')
            .trim();
    }

    lirePhrase(texte) {
        const phrase = String(texte || '').trim();
        if (!phrase) {
            this.afficherMessage('Aucune phrase à lire pour le moment.', 'info');
            return;
        }
        if (!this.syntheseVocale || typeof SpeechSynthesisUtterance === 'undefined') {
            this.afficherMessage('La synthèse vocale n’est pas disponible sur ce navigateur.', 'info');
            return;
        }

        this.syntheseVocale.cancel();
        const texteSynthese = (typeof window !== 'undefined'
            && window.AbeSpeechUtils
            && typeof window.AbeSpeechUtils.preparerTexteSynthese === 'function')
            ? window.AbeSpeechUtils.preparerTexteSynthese(phrase)
            : phrase;
        const utterance = new SpeechSynthesisUtterance(texteSynthese);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.83;
        utterance.pitch = 1;
        this.syntheseVocale.speak(utterance);
    }

    detecterRepereVisuelErreur(erreur = this.erreurActuelle) {
        if (!erreur) return null;
        if (erreur.type === 'confusion_phonographique') {
            const source = (erreur.mot || '').toLowerCase();
            const correction = (erreur.correction || '').toLowerCase();
            if (/[bdpq]/.test(source) || /[bdpq]/.test(correction)) {
                return 'Repère visuel : pense au sens de la boucle pour b, d, p ou q.';
            }
            if (/s|z/.test(source) || /s|z/.test(correction)) {
                return 'Repère sonore : serpent pour le son s, abeille pour le son z.';
            }
        }
        if (erreur.type === 'metathese' && erreur.metathese) {
            return `Les lettres "${erreur.metathese.lettresSource}" se sont croisées : remets-les dans le bon ordre.`;
        }
        return null;
    }

    rendreActionsRapides() {
        if (!this.quickActions) return;
        this.quickActions.innerHTML = '';

        if (!this.erreurActuelle) {
            this.quickActions.classList.add('hidden');
            return;
        }

        const actions = [];
        const type = this.erreurActuelle.type;
        if (['segmentation_mot_colle', 'locution_mal_segmentee'].includes(type)) {
            actions.push({ id: 'ciseaux', label: '✂️ Séparer', action: 'ciseaux' });
        }
        if (type === 'oralite_familiere') {
            actions.push({ id: 'reformuler', label: '🗣️ Reformuler', action: 'reformuler' });
        }

        const repere = this.detecterRepereVisuelErreur();
        if (repere) {
            const note = document.createElement('div');
            note.className = 'quick-note';
            note.textContent = repere;
            this.quickActions.appendChild(note);
        }

        actions.forEach((actionConfig) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-secondary quick-action-btn';
            btn.textContent = actionConfig.label;
            btn.addEventListener('click', () => this.appliquerActionRapide(actionConfig.action));
            this.quickActions.appendChild(btn);
        });

        this.quickActions.classList.toggle('hidden', actions.length === 0 && !repere);
    }

    appliquerActionRapide(action) {
        if (!this.erreurActuelle) return;

        if (['ciseaux', 'reformuler'].includes(action) && this.erreurActuelle.correction) {
            this.reinitialiserEssaisDirectErreurActuelle();
            this.reinitialiserEssaisGuideErreurActuelle();
            this.appliquerCorrection(this.erreurActuelle.correction);
        }
    }

    reinitialiserFluxCorrection() {
        this.jeuInvariable.reinitialiser();
        this.erreurActuelle = null;
        this.correctionEnCoursCle = null;
        this.questionActuelle = 0;
        this.questionsAide = [];
        this.contexteAide = {};

        if (this.wordInteraction) this.wordInteraction.classList.add('hidden');
        if (this.quickActions) {
            this.quickActions.classList.add('hidden');
            this.quickActions.innerHTML = '';
        }
        if (this.correctionInput) this.correctionInput.classList.add('hidden');
        if (this.questionSection) this.questionSection.classList.add('hidden');
        if (this.correctionField) this.correctionField.value = '';
        if (this.questionText) this.questionText.innerHTML = '';
        if (this.answerOptions) this.answerOptions.innerHTML = '';
        document.querySelectorAll('.word-tile').forEach((t) => t.classList.remove('selected', 'mirror-confusion', 'metathese-focus'));
    }

    montrerModaleReinitialisation() {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.montrerModaleReinitialisation === 'function') {
            window.AbeMainUiModals.montrerModaleReinitialisation.call(this);
        }
    }

    nettoyerEtatModaleReinitialisation() {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.nettoyerEtatModaleReinitialisation === 'function') {
            window.AbeMainAppState.nettoyerEtatModaleReinitialisation.call(this);
        }
    }

    fermerModaleReinitialisation() {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.fermerModaleReinitialisation === 'function') {
            window.AbeMainUiModals.fermerModaleReinitialisation.call(this);
        }
    }

    confirmerReinitialisationDepuisModale() {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.confirmerReinitialisationDepuisModale === 'function') {
            window.AbeMainAppState.confirmerReinitialisationDepuisModale.call(this);
        }
    }

    montrerModalePhraseOrale(message) {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.montrerModalePhraseOrale === 'function') {
            window.AbeMainUiModals.montrerModalePhraseOrale.call(this, message);
        }
    }

    montrerModalAnalyse(message, progression = 0) {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.montrerModalAnalyse === 'function') {
            window.AbeMainUiModals.montrerModalAnalyse.call(this, message, progression);
        }
    }

    mettreAJourModalAnalyse(message, progression) {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.mettreAJourModalAnalyse === 'function') {
            window.AbeMainUiModals.mettreAJourModalAnalyse.call(this, message, progression);
        }
    }

    masquerModalAnalyse() {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.masquerModalAnalyse === 'function') {
            window.AbeMainUiModals.masquerModalAnalyse.call(this);
        }
    }

    fermerModalePhraseOrale() {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.fermerModalePhraseOrale === 'function') {
            window.AbeMainUiModals.fermerModalePhraseOrale.call(this);
        }
    }

    verifierResolutionMobile() {
        const modalMobileBlock = document.getElementById('modal-mobile-block');
        if (!modalMobileBlock) return;
        if (window.innerWidth <= 768) {
            modalMobileBlock.classList.remove('hidden');
        } else {
            modalMobileBlock.classList.add('hidden');
        }
    }

    gererClicRecommencer() {
        if (window.AbeMainAppState && typeof window.AbeMainAppState.gererClicRecommencer === 'function') {
            window.AbeMainAppState.gererClicRecommencer.call(this);
        }
    }

    afficherTuiles() {
        if (window.AbeMainTilesRenderer && typeof window.AbeMainTilesRenderer.afficherTuiles === 'function') {
            return window.AbeMainTilesRenderer.afficherTuiles.call(this);
        }
    }

    selectionnerErreurDirecte(erreur, tuileElement = null) {
        if (window.AbeMainCorrectionWorkflow && typeof window.AbeMainCorrectionWorkflow.selectionnerErreurDirecte === 'function') {
            window.AbeMainCorrectionWorkflow.selectionnerErreurDirecte.call(this, erreur, tuileElement);
        }
    }

    /**
     * Gère la sélection d'un mot avec erreur
     */
    selectionnerMot(index) {
        const mot = this.motsAnalyse[index];
        if (!mot.erreurs || mot.erreurs.length === 0) return;

        const erreursActives = mot.erreurs
            .filter((erreur) => erreur && !this.estErreurCorrigee(erreur))
            .sort((a, b) => this.comparerErreurs(a, b));
        const nouvelleErreur = erreursActives[0] || null;
        if (!nouvelleErreur) {
            this.afficherMessage('Cette erreur a déjà été corrigée !', 'info');
            return;
        }

        const tuile = document.querySelector(`[data-index="${index}"]`);
        this.selectionnerErreurDirecte(nouvelleErreur, tuile);
    }

    /**
     * Affiche le champ de correction
     */
    montrerChampCorrection() {
        this.correctionInput.classList.remove('hidden');
        this.correctionField.value = '';
        if (this.erreurActuelle && this.erreurActuelle.type === 'segmentation_mot_colle') {
            this.correctionField.placeholder = 'Sépare le mot correctement';
        } else if (this.erreurActuelle && this.erreurActuelle.type === 'metathese') {
            this.correctionField.placeholder = 'Remets les lettres dans l’ordre';
        } else if (this.erreurActuelle && this.erreurActuelle.type === 'lettre_fantome_finale') {
            this.correctionField.placeholder = 'Réécris le mot complet';
        } else if (this.erreurActuelle && this.erreurActuelle.type === 'reference_orale_mot_manquant') {
            this.correctionField.placeholder = 'Saisis le mot manquant';
        } else {
            this.correctionField.placeholder = 'Écris ta correction ici';
        }
        this.correctionField.focus();
    }

    /**
     * Annule la correction en cours
     */
    annulerCorrection() {
        this.reinitialiserFluxCorrection();
        this.afficherMessage('Correction en cours annulée.', 'info');
    }

    /**
     * Soumet la correction proposée par l'élève
     */
    soumettreCorrection() {
        const correction = this.correctionField.value.trim();
        if (!correction) {
            this.afficherMessage('Veuillez proposer une correction.', 'info');
            return;
        }

        if (this.verifierCorrection(correction)) {
            this.reinitialiserEssaisDirectErreurActuelle();
            this.reinitialiserEssaisGuideErreurActuelle();
            this.appliquerCorrection(correction);
        } else {
            const essais = this.incrementerEssaisDirectErreurActuelle();
            const essaisRestants = Math.max(0, this.maxEssaisCorrectionDirecte - essais);
            if (essaisRestants <= 0) {
                this.reinitialiserEssaisDirectErreurActuelle();
                this.afficherMessage('Tu as fait 3 essais. On passe maintenant en mode guidé.', 'info');
                this.demarrerAide();
                return;
            }
            this.afficherMessage(`Ce n'est pas tout à fait ça. Il te reste ${essaisRestants} essai(s).`, 'error');
        }
    }

    /**
     * Vérifie si la correction est valide
     */
    verifierCorrection(correction) {
        if (!this.erreurActuelle) return false;

        const correctionSaisie = String(correction || '').trim();
        const correctionLowerInput = (correction || '').toLowerCase().trim();
        const exigerDoubleValidationPremierMot = this.doitExigerCasseExactePourErreurCourante();

        const correctionAttendue = this.erreurActuelle.correction;
        if (this.erreurActuelle.type === 'ponctuation_finale') {
            const attendu = String(correctionAttendue || '').toLowerCase().trim();
            const signeAttendu = /^[.?!]$/.test(attendu.slice(-1)) ? attendu.slice(-1) : '.';
            return correctionLowerInput === attendu || correctionLowerInput === signeAttendu;
        }

        if (this.erreurActuelle.type === 'reference_orale_mot_manquant') {
            const attendu = String(correctionAttendue || '').toLowerCase().trim();
            if (!attendu) return false;
            if (exigerDoubleValidationPremierMot) {
                // Si le premier mot porte aussi une erreur de majuscule non corrigée,
                // n'accepter la proposition que si elle contient la majuscule initiale.
                const attenduTrim = String(correctionAttendue || '').trim();
                return correctionSaisie === attenduTrim && /^[A-ZÀÂÉÈÊËÎÏÔÛÙÜŸŒÆ]/.test(correctionSaisie);
            }
            return correctionLowerInput === attendu;
        }

        if (typeof correctionAttendue === 'string' && correctionAttendue.trim()) {
            const correctionAttendueTrim = correctionAttendue.trim();

            if (exigerDoubleValidationPremierMot) {
                // Exiger la casse exacte pour la correction du premier mot lorsqu'une
                // majuscule non corrigée coexiste avec l'erreur actuelle.
                // Pour le cas spécifique où l'erreur actuelle est la majuscule,
                // le flux normal s'applique (la condition ne doit pas se déclencher).
                const needsCapital = this.erreurActuelle && this.erreurActuelle.type !== 'majuscule_phrase';
                if (needsCapital) {
                    return correctionSaisie === correctionAttendueTrim && /^[A-ZÀÂÉÈÊËÎÏÔÛÙÜŸŒÆ]/.test(correctionSaisie);
                }
                return correctionSaisie === correctionAttendueTrim;
            }

            if (correctionLowerInput === correctionAttendue.toLowerCase()) {
                return true;
            }
            if (this.estCorrectionVerbaleCompatible(correctionLowerInput)) {
                return true;
            }
            return false;
        }

        // Fallback robuste pour les mots inconnus sans correction explicite
        if (this.erreurActuelle.type === 'mot_inconnu') {
            const proposition = correction.toLowerCase();
            const motSource = (this.erreurActuelle.mot || '').toLowerCase();
            const dict = this.analyseur && this.analyseur.dictionnaire;
            const existeDansDict = dict && dict.mots && Object.prototype.hasOwnProperty.call(dict.mots, proposition);
            if (!existeDansDict || proposition === motSource) return false;
            if (exigerDoubleValidationPremierMot) {
                return /^[A-ZÀÂÉÈÊËÎÏÔÛÙÜŸŒÆ]/.test(correctionSaisie);
            }
            return true;
        }

        return false;
    }

    doitExigerCasseExactePourErreurCourante() {
        if (!this.erreurActuelle) return false;

        const span = this.obtenirSpanErreur(this.erreurActuelle);
        if (!span || span.debut !== 0) return false;

        if (this.erreurActuelle.type === 'majuscule_phrase') return false;

        const premierMot = Array.isArray(this.motsAnalyse) ? this.motsAnalyse[0] : null;
        if (!premierMot || !Array.isArray(premierMot.erreurs)) return false;

        return premierMot.erreurs.some((erreur) => {
            if (!erreur || erreur === this.erreurActuelle) return false;
            if (erreur.type !== 'majuscule_phrase') return false;
            return !this.estErreurCorrigee(erreur);
        });
    }

    estCorrectionVerbaleCompatible(propositionLower) {
        if (!this.erreurActuelle || !this.analyseur) return false;
        if (!['accord_sujet_verbe', 'conjugaison_verbe'].includes(this.erreurActuelle.type)) return false;

        const donnees = this.analyseur.getWordData(propositionLower);
        if (!donnees || this.analyseur.normaliserType(donnees.type) !== 'verbe') return false;

        const attendu = this.erreurActuelle.nombreSujet || (this.contexteAide && this.contexteAide.nombreSujet) || null;
        if (!attendu) return false;

        // Garder un lien avec le verbe cible pour éviter d'accepter un verbe sans rapport.
        const ref = ((this.erreurActuelle.correction || this.erreurActuelle.mot || '') + '').toLowerCase();
        const d1 = this.analyseur.calculerDistance(propositionLower, ref || propositionLower, true);
        if (ref && d1 > 4) return false;

        const nombrePropose = this.analyseur.normaliserNombre(donnees.nombre);
        if (nombrePropose) {
            return nombrePropose === attendu;
        }

        if (attendu === 'pluriel') {
            return propositionLower.endsWith('ent') || propositionLower.endsWith('ont');
        }
        return !propositionLower.endsWith('ent') && !propositionLower.endsWith('ont');
    }

    /**
     * Applique la correction et met à jour l'affichage
     */
    appliquerCorrection(correction) {
        const index = this.appliquerCorrectionErreurCourante(correction);
        if (index === null) {
            this.afficherMessage('La tuile à corriger est introuvable.', 'error');
            return;
        }

        // Cache l'interface d'interaction
        this.wordInteraction.classList.add('hidden');
        this.correctionInput.classList.add('hidden');
        this.questionSection.classList.add('hidden');
        if (this.quickActions) this.quickActions.classList.add('hidden');
        this.questionActuelle = 0;
        this.questionsAide = [];
        this.contexteAide = {};
        this.erreurActuelle = null;
        this.correctionEnCoursCle = null;
        document.querySelectorAll('.word-tile').forEach(t => t.classList.remove('selected', 'mirror-confusion', 'metathese-focus'));

        this.afficherMessage('✅ Excellente correction !', 'success');
        this.mettreAJourProgression();

        // Vérifie si toutes les erreurs sont corrigées
        if (this.erreursCorrigees.size === this.erreurs.length && this.erreurs.length > 0) {
            this.felicitationsEnAttente = true;
            // Afficher directement la modale de félicitations
            // (pas de bouton "Continuer" visible après correction directe)
            setTimeout(() => this.montrerModaleFelicitations(), 800);
        }
    }

    /**
     * Démarre le scénario d'aide maïeutique
     */
    demarrerAide() {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.demarrerAide === 'function') {
            return window.AbeMainInteractionGuidance.demarrerAide.call(this);
        }
    }

    afficherJeuMotInvariable() {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.afficherJeuMotInvariable === 'function') {
            return window.AbeMainInteractionGuidance.afficherJeuMotInvariable.call(this);
        }
    }

    rendreBlocExplicationPedagogique() {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.rendreBlocExplicationPedagogique === 'function') {
            return window.AbeMainInteractionGuidance.rendreBlocExplicationPedagogique.call(this);
        }
        return null;
    }

    _creerBlocInfoPourErreur(erreur) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance._creerBlocInfoPourErreur === 'function') {
            return window.AbeMainInteractionGuidance._creerBlocInfoPourErreur.call(this, erreur);
        }
        return null;
    }

    obtenirMemoAffichable(erreur = this.erreurActuelle) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.obtenirMemoAffichable === 'function') {
            return window.AbeMainInteractionGuidance.obtenirMemoAffichable.call(this, erreur);
        }
        return '';
    }

    creerBlocQuestionGuidee(texteQuestion) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.creerBlocQuestionGuidee === 'function') {
            return window.AbeMainInteractionGuidance.creerBlocQuestionGuidee.call(this, texteQuestion);
        }
        return null;
    }

    creerBlocRappel(rappel) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.creerBlocRappel === 'function') {
            return window.AbeMainInteractionGuidance.creerBlocRappel.call(this, rappel);
        }
        return null;
    }

    /**
     * Affiche la question actuelle
     */
    afficherQuestion() {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.afficherQuestion === 'function') {
            return window.AbeMainInteractionGuidance.afficherQuestion.call(this);
        }
    }

    /**
     * Vérifie la réponse de l'élève
     */
    verifierReponse(reponse, reponseIndex = null) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.verifierReponse === 'function') {
            return window.AbeMainInteractionGuidance.verifierReponse.call(this, reponse, reponseIndex);
        }
    }

    /**
     * Vérifie la proposition de correction de l'enfant
     */
    verifierProposition(proposition, cible) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.verifierProposition === 'function') {
            return window.AbeMainInteractionGuidance.verifierProposition.call(this, proposition, cible);
        }
    }

    /**
     * Affiche l'explication complète
     */
    afficherExplicationComplete() {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.afficherExplicationComplete === 'function') {
            return window.AbeMainInteractionGuidance.afficherExplicationComplete.call(this);
        }
    }

    formulerErreurEleve(erreur) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.formulerErreurEleve === 'function') {
            return window.AbeMainInteractionGuidance.formulerErreurEleve.call(this, erreur);
        }
        return '';
    }

    /**
     * Affiche un texte dans un élément en respectant les sauts de ligne (\n)
     */
    setTexteAvecSauts(element, texte) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.setTexteAvecSauts === 'function') {
            return window.AbeMainInteractionGuidance.setTexteAvecSauts.call(this, element, texte);
        }
    }

    /**
     * Génère une astuce selon le type d'erreur
     */
    genererAstuce(typeErreur) {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.genererAstuce === 'function') {
            return window.AbeMainInteractionGuidance.genererAstuce.call(this, typeErreur);
        }
        return 'Relis attentivement la regle.';
    }

    /**
     * Continue après l'explication
     */
    continuer() {
        if (window.AbeMainInteractionGuidance && typeof window.AbeMainInteractionGuidance.continuer === 'function') {
            return window.AbeMainInteractionGuidance.continuer.call(this);
        }
    }

    /**
     * Met à jour la barre de progression
     */
    mettreAJourProgression() {
        if (window.AbeMainFeedbackReset && typeof window.AbeMainFeedbackReset.mettreAJourProgression === 'function') {
            window.AbeMainFeedbackReset.mettreAJourProgression.call(this);
        }
    }

    /**
     * Affiche un message temporaire
     */
    afficherMessage(message, type) {
        if (window.AbeMainFeedbackReset && typeof window.AbeMainFeedbackReset.afficherMessage === 'function') {
            window.AbeMainFeedbackReset.afficherMessage.call(this, message, type);
        }
    }

    /**
     * Affiche la modale de félicitations quand toutes les erreurs sont corrigées
     */
    montrerModaleFelicitations() {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.montrerModaleFelicitations === 'function') {
            window.AbeMainUiModals.montrerModaleFelicitations.call(this);
        }
    }

    fermerModaleFelicitations() {
        if (window.AbeMainUiModals && typeof window.AbeMainUiModals.fermerModaleFelicitations === 'function') {
            window.AbeMainUiModals.fermerModaleFelicitations.call(this);
        }
    }

    /**
     * Réinitialise l'application
     */
    reinitialiser() {
        if (window.AbeMainFeedbackReset && typeof window.AbeMainFeedbackReset.reinitialiser === 'function') {
            window.AbeMainFeedbackReset.reinitialiser.call(this);
        }
    }
}

if (typeof globalThis !== 'undefined') {
    globalThis.AbeApplication = AbeApplication;
}

if (typeof window !== 'undefined' && window.AbeMainBootstrap && typeof window.AbeMainBootstrap.initialiserApplication === 'function') {
    window.AbeMainBootstrap.initialiserApplication(AbeApplication);
} else if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.abeApp = new AbeApplication();
    });
}
