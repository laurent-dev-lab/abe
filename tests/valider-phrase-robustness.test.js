import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

globalThis.window = globalThis;

const files = [
    'src/analyseur/categories/coherence.js',
    'src/analyseur/categories/lexique.js',
    'src/analyseur/categories/determinant-chaque.js',
    'src/analyseur/categories/pluriels-x.js',
    'src/analyseur/categories/structure.js',
    'src/analyseur/categories/accords.js',
    'src/analyseur/categories/verbes.js',
    'src/homophones/rules-pass-1.js',
    'src/homophones/rules-pass-2.js',
    'src/homophones/rules-pass-3.js',
    'src/homophones/rules-pass-4.js',
    'src/homophones/rules-pass-5.js',
    'src/analyseur/categories/homophones.js',
    'src/analyseur/categories/pedagogie.js',
    'src/analyseur/categories/oral-accent.js',
    'src/analyseur/categories/oral-homophones.js',
    'src/analyseur/categories/oral-conjugaison.js',
    'src/analyseur/categories/oral-lettres.js',
    'src/analyseur/categories/oral-leur-leurs.js',
    'src/analyseur/categories/oral-nature.js',
    'src/analyseur/categories/oral-regles.js',
    'src/analyseur/categories/oral-jeu-invariable.js',
    'src/analyseur/categories/oral-definitions.js',
    'src/analyseur/normalization-utils.js',
    'src/analyseur/context-utils.js',
    'src/analyseur/lexical-corrections.js',
    'src/analyseur/analyseur-core-methods-part-1.js',
    'src/analyseur/analyseur-core-methods-part-2.js',
    'src/analyseur/analyseur-core-methods-part-3.js',
    'src/analyseur/analyseur-core-methods-part-4.js',
    'analyseur.js',
    'src/main/oral-alignment.js',
    'src/main/oral-reference-filter.js',
    'src/main/oral-pedagogy.js',
    'src/main/oral-guided-content.js',
    'src/main/interaction-guidance.js',
    'src/main/app-state.js',
    'src/main/tiles-renderer.js',
    'src/main/correction-workflow.js',
    'src/main/ui-modals.js',
    'src/main/feedback-reset.js',
    'main.js'
];

for (const file of files) {
    await import(`../${file}`);
}

describe('Validation Phrase Robustness & Anti-Freeze', () => {
    it('gère enCoursDAnalyse et déverrouille l’interface en cas d’erreur', async () => {
        const appState = globalThis.AbeMainAppState;
        assert.ok(appState, 'AbeMainAppState doit exister');

        let modalMasquee = false;
        let errorDisplayed = null;

        const dummyApp = {
            ...appState,
            enCoursDAnalyse: false,
            dictionnaireCharge: true,
            validateBtn: { disabled: false },
            sentenceInput: { value: 'Les chats mangent.', disabled: false },
            erreursCorrigees: new Set(),
            essaisGuidesParErreur: new Map(),
            essaisDirectsParErreur: new Map(),
            inputSection: { classList: { add() {} } },
            tilesSection: { classList: { remove() {} } },
            obtenirPhraseReferenceOrale() { return ''; },
            reconnaitrePhraseOrale() { return { reconnue: true, exacte: true }; },
            montrerModalAnalyse() {},
            mettreAJourModalAnalyse() {},
            masquerModalAnalyse() { modalMasquee = true; },
            attendreRendu() { return Promise.resolve(); },
            attendre() { return Promise.resolve(); },
            afficherMessage(msg, type) { if (type === 'error') errorDisplayed = msg; },
            ajouterErreursTrouveesSession() {},
            afficherTuiles() {},
            mettreAJourProgression() {},
            appliquerFiltreReferenceOrale(p, res) { return res; },
            analyseur: {
                analyserPhraseProgressive() {
                    throw new Error('Simulated internal analyzer crash');
                }
            }
        };

        await globalThis.AbeApplication.prototype.validerPhrase.call(dummyApp);

        assert.strictEqual(dummyApp.enCoursDAnalyse, false, 'enCoursDAnalyse doit revenir à false');
        assert.strictEqual(dummyApp.validateBtn.disabled, false, 'le bouton valider doit être réactivé');
        assert.strictEqual(dummyApp.sentenceInput.disabled, false, 'le champ de saisie doit être réactivé');
        assert.strictEqual(modalMasquee, true, 'la modale doit être masquée dans la clause finally');
        assert.ok(errorDisplayed, 'Un message d’erreur doit être affiché au lieu d’un freeze');
    });

    it('enrichirExplicationAccord gère correctement la dépendance inverse déterminant-nom sans ReferenceError', () => {
        const oralPedagogy = globalThis.AbeMainOralPedagogy;
        assert.ok(oralPedagogy, 'AbeMainOralPedagogy doit exister');

        const entreeCorpus = {
            phraseOriginale: 'Les chats mangent.',
            tokensLexicaux: [
                { id: 1, texte: 'Les', nature: 'déterminant', genre: 'm', nombre: 'p', dependance: { type: 'det', cible: 2 } },
                { id: 2, texte: 'chats', nature: 'nom', genre: 'm', nombre: 'p', dependance: { type: 'nsubj', cible: 3 } },
                { id: 3, texte: 'mangent', nature: 'verbe', dependance: { type: 'root', cible: 0 } }
            ],
            tokensParId: new Map([
                [1, { id: 1, texte: 'Les', nature: 'déterminant', genre: 'm', nombre: 'p', dependance: { type: 'det', cible: 2 } }],
                [2, { id: 2, texte: 'chats', nature: 'nom', genre: 'm', nombre: 'p', dependance: { type: 'nsubj', cible: 3 } }],
                [3, { id: 3, texte: 'mangent', nature: 'verbe', dependance: { type: 'root', cible: 0 } }]
            ])
        };

        const dummyApp = {
            ...oralPedagogy,
            motsAnalyse: [{ texte: 'Les' }, { texte: 'chat' }, { texte: 'mangent' }],
            obtenirEntreeCorpusDetailleReference() { return entreeCorpus; }
        };

        // On teste le token 2 (le nom 'chat' saisi au lieu de 'chats')
        const tokenDetail = entreeCorpus.tokensLexicaux[1];
        const res = oralPedagogy.enrichirExplicationAccord.call(dummyApp, 'chat', 'chats', 1, entreeCorpus.tokensLexicaux, tokenDetail);

        assert.ok(res, 'Une explication d’accord doit être renvoyée');
        assert.strictEqual(res.parcoursType, 'accord_determinant_nom');
        assert.strictEqual(res.contexteAccord.nom.texte, 'chat');
        assert.strictEqual(res.contexteAccord.determinant.texte, 'Les');
    });

    it('restaure l’interdépendance des mots (un avions, les main, ciel bleus, as-tu / méchants) sur le corpus de dictée', () => {
        // Fixture autonome (les dictées de corpus/dictees/ sont éphémères : purge à 30 jours)
        const T = (id, texte, nature, genre, nombre, type, cible, extra = {}) => ({
            id, texte, lemme: texte.toLowerCase(), nature, genre, nombre,
            personne: null, mode: null, temps: null, fonction: null,
            dependance: { type, cible }, homophone_de: null, priorite_corpus: null, ...extra
        });
        const P = (id, texte, cible) => T(id, texte, 'ponctuation', null, null, 'punct', cible);
        const dicteeData = [
            {
                phrase_originale: 'Je suis dans un avion avec toi.',
                phrase_normalisee: 'Je suis dans un avion avec toi.',
                langue: 'fr',
                tokens: [
                    T(1, 'Je', 'pronom', null, 's', 'nsubj', 2, { personne: '1', fonction: 'sujet' }),
                    T(2, 'suis', 'verbe', null, 's', 'root', 0, { personne: '1', mode: 'indicatif', temps: 'présent', lemme: 'être', fonction: 'verbe principal' }),
                    T(3, 'dans', 'préposition', null, null, 'case', 5),
                    T(4, 'un', 'déterminant', 'm', 's', 'det', 5),
                    T(5, 'avion', 'nom', 'm', 's', 'obl', 2),
                    T(6, 'avec', 'préposition', null, null, 'case', 7),
                    T(7, 'toi', 'pronom', null, 's', 'obl', 2),
                    P(8, '.', 2)
                ],
                relations_globales: [
                    { type: 'accord_determinant_nom', det: 4, nom: 5, correct: true },
                    { type: 'accord_sujet_verbe', sujet: 1, verbe: 2, correct: true }
                ],
                erreurs: [], corrections: []
            },
            {
                phrase_originale: 'Comment faire pour manger sans les mains ?',
                phrase_normalisee: 'Comment faire pour manger sans les mains ?',
                langue: 'fr',
                tokens: [
                    T(1, 'Comment', 'adverbe', null, null, 'advmod', 2),
                    T(2, 'faire', 'verbe', null, null, 'root', 0, { mode: 'infinitif', fonction: 'verbe principal' }),
                    T(3, 'pour', 'préposition', null, null, 'mark', 4),
                    T(4, 'manger', 'verbe', null, null, 'advcl', 2, { mode: 'infinitif' }),
                    T(5, 'sans', 'préposition', null, null, 'case', 7),
                    T(6, 'les', 'déterminant', 'f', 'p', 'det', 7),
                    T(7, 'mains', 'nom', 'f', 'p', 'obj', 4, { fonction: 'COD' }),
                    P(8, '?', 2)
                ],
                relations_globales: [
                    { type: 'accord_determinant_nom', det: 6, nom: 7, correct: true }
                ],
                erreurs: [], corrections: []
            },
            {
                phrase_originale: "Le ciel est bleu aujourd'hui.",
                phrase_normalisee: "Le ciel est bleu aujourd'hui.",
                langue: 'fr',
                tokens: [
                    T(1, 'Le', 'déterminant', 'm', 's', 'det', 2),
                    T(2, 'ciel', 'nom', 'm', 's', 'nsubj', 3, { fonction: 'sujet' }),
                    T(3, 'est', 'verbe', null, 's', 'root', 0, { personne: '3', mode: 'indicatif', temps: 'présent', lemme: 'être', fonction: 'verbe principal' }),
                    T(4, 'bleu', 'adjectif', 'm', 's', 'xcomp', 3, { fonction: 'attribut du sujet' }),
                    T(5, "aujourd'hui", 'adverbe', null, null, 'advmod', 3),
                    P(6, '.', 3)
                ],
                relations_globales: [
                    { type: 'accord_determinant_nom', det: 1, nom: 2, correct: true },
                    { type: 'accord_sujet_verbe', sujet: 2, verbe: 3, correct: true },
                    { type: 'accord_sujet_attribut', sujet: 2, attribut: 4, correct: true }
                ],
                erreurs: [], corrections: []
            },
            {
                phrase_originale: "Pourquoi as-tu peur du noir, il n'est pas méchant.",
                phrase_normalisee: "Pourquoi as-tu peur du noir, il n'est pas méchant.",
                langue: 'fr',
                tokens: [
                    T(1, 'Pourquoi', 'adverbe', null, null, 'advmod', 2),
                    T(2, 'as', 'verbe', null, 's', 'root', 0, { personne: '2', mode: 'indicatif', temps: 'présent', lemme: 'avoir', fonction: 'verbe principal' }),
                    T(3, 'tu', 'pronom', null, 's', 'nsubj', 2, { personne: '2', fonction: 'sujet' }),
                    T(4, 'peur', 'nom', 'f', 's', 'obj', 2, { fonction: 'COD' }),
                    T(5, 'du', 'déterminant', 'm', 's', 'det', 6),
                    T(6, 'noir', 'nom', 'm', 's', 'nmod', 4),
                    P(7, ',', 2),
                    T(8, 'il', 'pronom', 'm', 's', 'nsubj', 10, { personne: '3', fonction: 'sujet' }),
                    T(9, "n'", 'adverbe', null, null, 'advmod', 10),
                    T(10, 'est', 'verbe', null, 's', 'parataxis', 2, { personne: '3', mode: 'indicatif', temps: 'présent', lemme: 'être' }),
                    T(11, 'pas', 'adverbe', null, null, 'advmod', 10),
                    T(12, 'méchant', 'adjectif', 'm', 's', 'xcomp', 10, { fonction: 'attribut du sujet' }),
                    P(13, '.', 2)
                ],
                relations_globales: [
                    { type: 'accord_sujet_verbe', sujet: 3, verbe: 2, correct: true },
                    { type: 'accord_determinant_nom', det: 5, nom: 6, correct: true },
                    { type: 'accord_sujet_verbe', sujet: 8, verbe: 10, correct: true },
                    { type: 'accord_sujet_attribut', sujet: 8, attribut: 12, correct: true }
                ],
                erreurs: [], corrections: []
            }
        ];
        const dictionnaireData = JSON.parse(fs.readFileSync('refs/dictionnaire.json', 'utf8'));

        const analyseur = new globalThis.AnalyseurGrammatical();
        analyseur.dictionnaire = dictionnaireData;
        if (typeof analyseur.definirDictionnaire === 'function') {
            analyseur.definirDictionnaire(dictionnaireData);
        }

        const app = Object.create(globalThis.AbeApplication.prototype);
        app.analyseur = analyseur;
        app.dictionnaire = dictionnaireData;
        app.dictionnaireCharge = true;
        app.erreursCorrigees = new Set();
        app.essaisGuidesParErreur = new Map();
        app.essaisDirectsParErreur = new Map();
        app.wordInteraction = { classList: { add() {}, remove() {}, toggle() {} } };
        app.questionSection = { classList: { add() {}, remove() {}, toggle() {} } };
        app.questionHeader = { classList: { add() {}, remove() {}, toggle() {} } };
        app.jeuInvariable = { doitDeclencher() { return false; }, reinitialiser() {} };
        app.afficherQuestion = function () {};
        app.indexerEntreesCorpusDetaille(dicteeData);

        assert.strictEqual(app.corpusDetailleCharge, true, 'Le corpus détaillé de la dictée doit être chargé');
        assert.strictEqual(app.corpusDetaille.length, 4, 'Les 4 phrases doivent être indexées');

        const testerPhrase = (phraseRef, phraseEleve) => {
            globalThis.window.abeLecteurOral = { phraseCourante: phraseRef };
            let res = analyseur.analyserPhrase(phraseEleve);
            app.motsAnalyse = res.mots;
            res = app.appliquerFiltreReferenceOrale(phraseEleve, res);
            app.motsAnalyse = res.mots;
            app.erreurs = app.ordonnerErreursPourCorrection(app.filtrerErreursActionnables(res.erreurs));
            return app.erreurs;
        };

        // 1) "je sis dans un avions avec toi." ->
        //    - faute sur "sis" : oubli de lettre interne ("s_is") -> parcours type mot invariable
        //    - faute sur "avions" : accord déterminant-nom avec "un"
        const errs1 = testerPhrase('Je suis dans un avion avec toi.', 'je sis dans un avions avec toi.');
        const errSis = errs1.find((e) => e.mot === 'sis');
        assert.ok(errSis, 'L’erreur sur "sis" doit être détectée');
        assert.strictEqual(errSis.parcoursType, 'oubli_lettre_interne', '"sis" pour "suis" doit déclencher oubli_lettre_interne');
        assert.ok(errSis.explication.includes('s_is'), 'L’explication doit afficher le masque s_is');
        assert.ok(errSis.explication.includes('Il manque une lettre dans ce mot'), 'L’explication doit indiquer qu’il manque une lettre dans ce mot');

        const errAvions = errs1.find((e) => e.mot === 'avions');
        assert.ok(errAvions, 'L’erreur sur "avions" doit être détectée');
        assert.strictEqual(errAvions.titreAide, 'Accord déterminant-nom', 'Ne doit jamais tomber sur Comparaison avec la phrase dictée');
        assert.strictEqual(errAvions.parcoursType, 'accord_determinant_nom');
        assert.strictEqual(errAvions.cibleErreur, 'nom');

        app.erreurActuelle = errAvions;
        app.demarrerAide();
        assert.strictEqual(app.questionsAide.length, 3);
        assert.strictEqual(app.questionsAide[0].cible, 'déterminant', 'Q1 doit demander de sélectionner le déterminant "un"');
        assert.strictEqual(app.questionsAide[2].cible, 'nom', 'Q3 doit demander la correction du nom');
        const idxUn = app.motsAnalyse.findIndex((m) => m.texte === 'un');
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[0], 'un', { ...app.contexteAide, selectionIndex: idxUn }), true);
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[1], 'Singulier', app.contexteAide), true);
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[1], 'Pluriel', app.contexteAide), false);

        // 2) "Comment faire pour manger sans les main ?" -> faute sur "main" (accord déterminant-nom avec "les")
        const errs2 = testerPhrase('Comment faire pour manger sans les mains ?', 'Comment faire pour manger sans les main ?');
        const errMain = errs2.find((e) => e.mot === 'main');
        assert.ok(errMain, 'L’erreur sur "main" doit être détectée');
        assert.strictEqual(errMain.titreAide, 'Accord déterminant-nom');
        assert.strictEqual(errMain.parcoursType, 'accord_determinant_nom');
        assert.strictEqual(errMain.cibleErreur, 'nom');

        app.erreurActuelle = errMain;
        app.demarrerAide();
        const idxLes = app.motsAnalyse.findIndex((m) => m.texte === 'les');
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[0], 'les', { ...app.contexteAide, selectionIndex: idxLes }), true);
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[1], 'Pluriel', app.contexteAide), true);
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[1], 'Singulier', app.contexteAide), false);

        // 3) "Le ciel est bleus aujourd'hui." -> accord sujet-attribut ("ciel" <-> "bleus")
        const errs3 = testerPhrase("Le ciel est bleu aujourd'hui.", "Le ciel est bleus aujourd'hui.");
        const errBleus = errs3.find((e) => e.mot === 'bleus');
        assert.ok(errBleus, 'L’erreur sur "bleus" doit être détectée');
        assert.strictEqual(errBleus.parcoursType, 'accord_adjectif_nom');
        app.erreurActuelle = errBleus;
        app.demarrerAide();
        assert.strictEqual(app.contexteAide.genreSujet, 'masculin');
        assert.strictEqual(app.contexteAide.nombreSujet, 'singulier');
        const idxCiel = app.motsAnalyse.findIndex((m) => m.texte === 'ciel');
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[1], 'ciel', { ...app.contexteAide, selectionIndex: idxCiel }), true);
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[2], 'Masculin', app.contexteAide), true);
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[3], 'Singulier', app.contexteAide), true);

        // 4) "Pourquoi as-tu peur du noir, il n'est pas méchants." -> alignement avec "-" et "," sans décalage
        const errs4 = testerPhrase("Pourquoi as-tu peur du noir, il n'est pas méchant.", "Pourquoi as-tu peur du noir, il n'est pas méchants.");
        const errMechants = errs4.find((e) => e.mot === 'méchants');
        assert.ok(errMechants, 'L’erreur sur "méchants" doit être détectée malgré le trait d’union de as-tu et la virgule');
        const idxMechants = app.motsAnalyse.findIndex((m) => m.texte === 'méchants');
        assert.strictEqual(errMechants.position, idxMechants, 'L’erreur doit être attachée à la bonne tuile dans motsAnalyse');
        assert.ok(app.motsAnalyse[idxMechants].erreurs.includes(errMechants), 'La tuile "méchants" doit porter l’erreur');
        assert.strictEqual(errMechants.parcoursType, 'accord_adjectif_nom');

        // 5) Vérification anti-effets de bord de detecterOubliLettreInterne :
        const detecterInterne = globalThis.AbeAnalyseurCategories.detecterOubliLettreInterne;
        assert.ok(detecterInterne, 'detecterOubliLettreInterne doit exister');

        // Cas positifs (oubli au milieu du mot / radical)
        assert.strictEqual(detecterInterne('sis', 'suis', { nature: 'verbe', lemme: 'être' }, analyseur)?.motMasque, 's_is');
        assert.strictEqual(detecterInterne('liu', 'lieu', { nature: 'nom', lemme: 'lieu' }, analyseur)?.motMasque, 'li_u');
        assert.strictEqual(detecterInterne('mager', 'manger', { nature: 'verbe', lemme: 'manger' }, analyseur)?.motMasque, 'ma_ger');
        assert.strictEqual(detecterInterne('magent', 'mangent', { nature: 'verbe', lemme: 'manger' }, analyseur)?.motMasque, 'ma_gent');

        // Cas négatifs (1re lettre, pluriel s/x, féminin -es, terminaisons complexes -ent, -ons, -ions, -aient)
        assert.strictEqual(detecterInterne('uis', 'suis', { nature: 'verbe', lemme: 'être' }, analyseur), null, 'Pas sur la 1re lettre');
        assert.strictEqual(detecterInterne('main', 'mains', { nature: 'nom', lemme: 'main' }, analyseur), null, 'Pas sur le -s du pluriel');
        assert.strictEqual(detecterInterne('chevax', 'chevaux', { nature: 'nom', lemme: 'cheval' }, analyseur), null, 'Pas sur le pluriel en -aux');
        assert.strictEqual(detecterInterne('petits', 'petites', { nature: 'adjectif', lemme: 'petit' }, analyseur), null, 'Pas sur l’accord féminin pluriel -es');
        assert.strictEqual(detecterInterne('chiens', 'chiennes', { nature: 'nom', lemme: 'chien' }, analyseur), null, 'Pas sur l’accord féminin pluriel -nes');
        assert.strictEqual(detecterInterne('manget', 'mangent', { nature: 'verbe', lemme: 'manger' }, analyseur), null, 'Pas sur la terminaison verbale -ent');
        assert.strictEqual(detecterInterne('mangnt', 'mangent', { nature: 'verbe', lemme: 'manger' }, analyseur), null, 'Pas sur la terminaison verbale -ent');
        assert.strictEqual(detecterInterne('mangons', 'mangeons', { nature: 'verbe', lemme: 'manger' }, analyseur), null, 'Pas sur la terminaison verbale -eons');
        assert.strictEqual(detecterInterne('chantons', 'chantions', { nature: 'verbe', lemme: 'chanter' }, analyseur), null, 'Pas sur la terminaison verbale -ions');
        assert.strictEqual(detecterInterne('était', 'étaient', { nature: 'verbe', lemme: 'être' }, analyseur), null, 'Pas sur la terminaison verbale -aient');

        // 6) Audit pré-prompt : "qui" relatif, "-t-" euphonique ("a-t-il"), "aux" contracté, sujets coordonnés ("Paul et Marie")
        const corpusAudit = [
            {
                phrase_originale: 'Où a-t-il caché les fleurs qui poussent aux jardins ?',
                phrase_normalisee: 'Où a-t-il caché les fleurs qui poussent aux jardins ?',
                tokens: [
                    { id: 1, texte: 'Où', lemme: 'où', nature: 'adverbe', genre: null, nombre: null, dependance: { type: 'advmod', cible: 4 } },
                    { id: 2, texte: 'a', lemme: 'avoir', nature: 'verbe', genre: null, nombre: 's', personne: '3', mode: 'indicatif', temps: 'présent', fonction: 'auxiliaire', dependance: { type: 'aux', cible: 4 } },
                    { id: 3, texte: 'il', lemme: 'il', nature: 'pronom', genre: 'm', nombre: 's', personne: '3', fonction: 'sujet', dependance: { type: 'nsubj', cible: 4 } },
                    { id: 4, texte: 'caché', lemme: 'cacher', nature: 'verbe', genre: 'm', nombre: 's', mode: 'participe', temps: 'passé', fonction: 'verbe principal', dependance: { type: 'root', cible: 0 } },
                    { id: 5, texte: 'les', lemme: 'le', nature: 'déterminant', genre: 'f', nombre: 'p', dependance: { type: 'det', cible: 6 } },
                    { id: 6, texte: 'fleurs', lemme: 'fleur', nature: 'nom', genre: 'f', nombre: 'p', fonction: 'COD', dependance: { type: 'obj', cible: 4 } },
                    // "qui" sans genre/nombre au départ : doit hériter "f" et "p" de "fleurs"
                    { id: 7, texte: 'qui', lemme: 'qui', nature: 'pronom', genre: null, nombre: null, personne: '3', fonction: 'sujet', dependance: { type: 'nsubj', cible: 8 } },
                    { id: 8, texte: 'poussent', lemme: 'pousser', nature: 'verbe', genre: null, nombre: 'p', personne: '3', mode: 'indicatif', temps: 'présent', dependance: { type: 'acl', cible: 6 } },
                    // "aux" étiqueté préposition par erreur par l'IA : doit être reclassé déterminant pluriel lié à "jardins"
                    { id: 9, texte: 'aux', lemme: 'au', nature: 'préposition', genre: null, nombre: null, dependance: { type: 'case', cible: 10 } },
                    { id: 10, texte: 'jardins', lemme: 'jardin', nature: 'nom', genre: 'm', nombre: 'p', dependance: { type: 'obl', cible: 8 } },
                    { id: 11, texte: '?', lemme: '?', nature: 'ponctuation', dependance: { type: 'punct', cible: 4 } }
                ],
                relations_globales: []
            },
            {
                phrase_originale: 'Le chien et le chat dorment.',
                phrase_normalisee: 'Le chien et le chat dorment.',
                tokens: [
                    { id: 1, texte: 'Le', lemme: 'le', nature: 'déterminant', genre: 'm', nombre: 's', dependance: { type: 'det', cible: 2 } },
                    { id: 2, texte: 'chien', lemme: 'chien', nature: 'nom', genre: 'm', nombre: 's', fonction: 'sujet', dependance: { type: 'nsubj', cible: 6 } },
                    { id: 3, texte: 'et', lemme: 'et', nature: 'conjonction', dependance: { type: 'cc', cible: 5 } },
                    { id: 4, texte: 'le', lemme: 'le', nature: 'déterminant', genre: 'm', nombre: 's', dependance: { type: 'det', cible: 5 } },
                    { id: 5, texte: 'chat', lemme: 'chat', nature: 'nom', genre: 'm', nombre: 's', fonction: 'sujet', dependance: { type: 'conj', cible: 2 } },
                    { id: 6, texte: 'dorment', lemme: 'dormir', nature: 'verbe', genre: null, nombre: 'p', personne: '3', mode: 'indicatif', temps: 'présent', fonction: 'verbe principal', dependance: { type: 'root', cible: 0 } },
                    { id: 7, texte: '.', lemme: '.', nature: 'ponctuation', dependance: { type: 'punct', cible: 6 } }
                ],
                relations_globales: []
            }
        ];
        app.indexerEntreesCorpusDetaille(corpusAudit);

        // Test 6a : "a-t-il", "qui" relatif -> "pousse" au lieu de "poussent" et "jardin" au lieu de "jardins" après "aux"
        const errs6a = testerPhrase(
            'Où a-t-il caché les fleurs qui poussent aux jardins ?',
            'Où a-t-il caché les fleurs qui pousse aux jardin ?'
        );
        const errPousse = errs6a.find((e) => e.mot === 'pousse');
        const errJardin = errs6a.find((e) => e.mot === 'jardin');
        assert.ok(errPousse, 'L’erreur sur "pousse" doit être détectée sans décalage malgré "a-t-il"');
        assert.strictEqual(errPousse.parcoursType, 'accord_sujet_verbe');
        app.erreurActuelle = errPousse;
        app.demarrerAide();
        assert.strictEqual(app.contexteAide.nombreSujet, 'pluriel', 'Le pronom "qui" a hérité du pluriel de son antécédent "fleurs"');

        assert.ok(errJardin, 'L’erreur sur "jardin" après "aux" doit être détectée');
        assert.strictEqual(errJardin.parcoursType, 'accord_determinant_nom', '"aux" doit déclencher accord_determinant_nom sur "jardin"');
        app.erreurActuelle = errJardin;
        app.demarrerAide();
        assert.strictEqual(app.contexteAide.nombreSujet, 'pluriel');

        // Test 6b : Sujets coordonnés "Le chien et le chat dort."
        const errs6b = testerPhrase('Le chien et le chat dorment.', 'Le chien et le chat dort.');
        const errDort = errs6b.find((e) => e.mot === 'dort');
        assert.ok(errDort, 'L’erreur sur "dort" doit être détectée');
        assert.strictEqual(errDort.parcoursType, 'accord_sujet_verbe');
        app.erreurActuelle = errDort;
        app.demarrerAide();
        assert.strictEqual(app.contexteAide.nombreSujet, 'pluriel', 'Le sujet coordonné "chien et chat" doit imposer le pluriel');
        const idxChien = app.motsAnalyse.findIndex((m) => m.texte === 'chien');
        const idxChat = app.motsAnalyse.findIndex((m) => m.texte === 'chat');
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[1], 'chien', { ...app.contexteAide, selectionIndex: idxChien }), true, 'Cliquer sur "chien" est accepté comme sujet');
        assert.strictEqual(analyseur.verifierReponse(app.questionsAide[1], 'chat', { ...app.contexteAide, selectionIndex: idxChat }), true, 'Cliquer sur "chat" est aussi accepté comme sujet coordonné');
    });

    it('consonne finale muette : "vieu château" -> aide consonne muette, pas accord singulier/pluriel', () => {
        const dicteeData = JSON.parse(fs.readFileSync('corpus/dictees/d_89680319.json', 'utf8'));
        const dictionnaireData = JSON.parse(fs.readFileSync('refs/dictionnaire.json', 'utf8'));

        const analyseur = new globalThis.AnalyseurGrammatical();
        analyseur.dictionnaire = dictionnaireData;
        if (typeof analyseur.definirDictionnaire === 'function') {
            analyseur.definirDictionnaire(dictionnaireData);
        }

        const app = Object.create(globalThis.AbeApplication.prototype);
        app.analyseur = analyseur;
        app.dictionnaire = dictionnaireData;
        app.dictionnaireCharge = true;
        app.erreursCorrigees = new Set();
        app.essaisGuidesParErreur = new Map();
        app.essaisDirectsParErreur = new Map();
        app.wordInteraction = { classList: { add() {}, remove() {}, toggle() {} } };
        app.questionSection = { classList: { add() {}, remove() {}, toggle() {} } };
        app.questionHeader = { classList: { add() {}, remove() {}, toggle() {} } };
        app.jeuInvariable = { doitDeclencher() { return false; }, reinitialiser() {} };
        app.afficherQuestion = function () {};
        app.indexerEntreesCorpusDetaille(dicteeData);

        const phraseRef = dicteeData[0].phrase_originale;
        globalThis.window.abeLecteurOral = { phraseCourante: phraseRef };
        const phraseEleve = phraseRef.replace('vieux', 'vieu');
        let res = analyseur.analyserPhrase(phraseEleve);
        app.motsAnalyse = res.mots;
        res = app.appliquerFiltreReferenceOrale(phraseEleve, res);
        app.motsAnalyse = res.mots;
        const erreurs = app.ordonnerErreursPourCorrection(app.filtrerErreursActionnables(res.erreurs));

        const errVieu = erreurs.find((e) => e.mot === 'vieu');
        assert.ok(errVieu, 'L’erreur sur "vieu" doit être détectée');
        assert.strictEqual(errVieu.parcoursType, 'consonne_muette_finale', '"vieu" -> "vieux" (nom singulier) ne doit PAS déclencher accord_adjectif_nom');
        assert.strictEqual(errVieu.titreAide, 'Consonne finale muette');

        app.erreurActuelle = errVieu;
        app.demarrerAide();
        assert.strictEqual(app.questionsAide[0].type, 'info');
        assert.strictEqual(app.questionsAide[1].type, 'proposition');

        // Contre-exemple : un vrai problème de pluriel garde le parcours d'accord
        const detecter = globalThis.AbeAnalyseurCategories.detecterConsonneMuetteFinale;
        assert.ok(detecter('vieu', 'vieux', { nature: 'adjectif', nombre: 's' }));
        assert.ok(detecter('cha', 'chat', { nature: 'nom', nombre: 's' }));
        assert.strictEqual(detecter('chevau', 'chevaux', { nature: 'nom', nombre: 'p' }), null, 'pluriel attendu : parcours d’accord conservé');
        assert.strictEqual(detecter('mange', 'manger', { nature: 'verbe', nombre: 's' }), null, 'verbe : non concerné');
    });
});
