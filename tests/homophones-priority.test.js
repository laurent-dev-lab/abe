import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

// Setup global environment
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
    'src/main/correction-workflow.js'
];

for (const file of files) {
    await import(`../${file}`);
}

const dictData = JSON.parse(fs.readFileSync('refs/dictionnaire.json', 'utf8'));
const corpus1 = [
    {
        phrase_originale: 'Elle est allée à la bibliothèque ce matin.',
        phrase_normalisee: 'Elle est allée à la bibliothèque ce matin.',
        langue: 'fr',
        tokens: [
            { id: 1, texte: 'Elle', lemme: 'elle', nature: 'pronom', genre: 'f', nombre: 's', personne: '3', fonction: 'sujet', dependance: { type: 'nsubj', cible: 3 }, homophone_de: null },
            { id: 2, texte: 'est', lemme: 'être', nature: 'verbe', genre: null, nombre: 's', personne: '3', mode: 'indicatif', temps: 'présent', fonction: 'auxiliaire', dependance: { type: 'aux', cible: 3 }, homophone_de: ['et'] },
            { id: 3, texte: 'allée', lemme: 'aller', nature: 'verbe', genre: 'f', nombre: 's', personne: null, mode: 'participe', temps: 'passé', fonction: 'verbe principal', dependance: { type: 'root', cible: 0 }, homophone_de: null },
            { id: 4, texte: 'à', lemme: 'à', nature: 'préposition', genre: null, nombre: null, personne: null, fonction: null, dependance: { type: 'case', cible: 6 }, homophone_de: ['a'] },
            { id: 5, texte: 'la', lemme: 'le', nature: 'déterminant', genre: 'f', nombre: 's', personne: null, fonction: null, dependance: { type: 'det', cible: 6 }, homophone_de: ['là'] },
            { id: 6, texte: 'bibliothèque', lemme: 'bibliothèque', nature: 'nom', genre: 'f', nombre: 's', personne: null, fonction: 'complément circonstanciel', dependance: { type: 'obl', cible: 3 }, homophone_de: null },
            { id: 7, texte: 'ce', lemme: 'ce', nature: 'déterminant', genre: 'm', nombre: 's', personne: null, fonction: null, dependance: { type: 'det', cible: 8 }, homophone_de: ['se'] },
            { id: 8, texte: 'matin', lemme: 'matin', nature: 'nom', genre: 'm', nombre: 's', personne: null, fonction: 'complément circonstanciel', dependance: { type: 'obl', cible: 3 }, homophone_de: null },
            { id: 9, texte: '.', lemme: '.', nature: 'ponctuation', genre: null, nombre: null, personne: null, fonction: null, dependance: { type: 'punct', cible: 3 }, homophone_de: null }
        ],
        relations_globales: [
            { type: 'accord_sujet_verbe', sujet: 1, verbe: 2, correct: true },
            { type: 'accord_sujet_participe', sujet: 1, participe: 3, correct: true },
            { type: 'accord_determinant_nom', det: 5, nom: 6, correct: true },
            { type: 'accord_determinant_nom', det: 7, nom: 8, correct: true }
        ]
    },
    {
        phrase_originale: 'Son sac et ses livres sont restés sur le bureau.',
        phrase_normalisee: 'Son sac et ses livres sont restés sur le bureau.',
        langue: 'fr',
        tokens: [
            { id: 1, texte: 'Son', lemme: 'son', nature: 'déterminant', genre: 'm', nombre: 's', dependance: { type: 'det', cible: 2 }, homophone_de: ['sont'] },
            { id: 2, texte: 'sac', lemme: 'sac', nature: 'nom', genre: 'm', nombre: 's', dependance: { type: 'nsubj', cible: 7 }, homophone_de: null },
            { id: 3, texte: 'et', lemme: 'et', nature: 'conjonction', dependance: { type: 'mark', cible: 5 }, homophone_de: ['est'] },
            { id: 4, texte: 'ses', lemme: 'son', nature: 'déterminant', genre: 'm', nombre: 'p', dependance: { type: 'det', cible: 5 }, homophone_de: ['ces', "c'est"] },
            { id: 5, texte: 'livres', lemme: 'livre', nature: 'nom', genre: 'm', nombre: 'p', dependance: { type: 'nsubj', cible: 7 }, homophone_de: null },
            { id: 6, texte: 'sont', lemme: 'être', nature: 'verbe', nombre: 'p', personne: '3', mode: 'indicatif', temps: 'présent', dependance: { type: 'aux', cible: 7 }, homophone_de: ['son'] },
            { id: 7, texte: 'restés', lemme: 'rester', nature: 'verbe', genre: 'm', nombre: 'p', mode: 'participe', temps: 'passé', dependance: { type: 'root', cible: 0 }, homophone_de: null },
            { id: 8, texte: 'sur', lemme: 'sur', nature: 'préposition', dependance: { type: 'case', cible: 10 }, homophone_de: null },
            { id: 9, texte: 'le', lemme: 'le', nature: 'déterminant', genre: 'm', nombre: 's', dependance: { type: 'det', cible: 10 }, homophone_de: null },
            { id: 10, texte: 'bureau', lemme: 'bureau', nature: 'nom', genre: 'm', nombre: 's', dependance: { type: 'obl', cible: 7 }, homophone_de: null },
            { id: 11, texte: '.', lemme: '.', nature: 'ponctuation', dependance: { type: 'punct', cible: 7 }, homophone_de: null }
        ],
        relations_globales: []
    },
    {
        phrase_originale: 'Il faut que tu saches où se cache le trésor.',
        phrase_normalisee: 'Il faut que tu saches où se cache le trésor.',
        langue: 'fr',
        tokens: [
            { id: 1, texte: 'Il', lemme: 'il', nature: 'pronom', genre: 'm', nombre: 's', personne: '3', dependance: { type: 'expl', cible: 2 }, homophone_de: null },
            { id: 2, texte: 'faut', lemme: 'falloir', nature: 'verbe', nombre: 's', personne: '3', mode: 'indicatif', temps: 'présent', dependance: { type: 'root', cible: 0 }, homophone_de: null },
            { id: 3, texte: 'que', lemme: 'que', nature: 'conjonction', dependance: { type: 'mark', cible: 5 }, homophone_de: null },
            { id: 4, texte: 'tu', lemme: 'tu', nature: 'pronom', nombre: 's', personne: '2', dependance: { type: 'nsubj', cible: 5 }, homophone_de: null },
            { id: 5, texte: 'saches', lemme: 'savoir', nature: 'verbe', nombre: 's', personne: '2', mode: 'subjonctif', temps: 'présent', dependance: { type: 'ccomp', cible: 2 }, homophone_de: null },
            { id: 6, texte: 'où', lemme: 'où', nature: 'pronom', dependance: { type: 'obl', cible: 8 }, homophone_de: ['ou'] },
            { id: 7, texte: 'se', lemme: 'se', nature: 'pronom', dependance: { type: 'expl', cible: 8 }, homophone_de: ['ce'] },
            { id: 8, texte: 'cache', lemme: 'cacher', nature: 'verbe', nombre: 's', personne: '3', mode: 'indicatif', temps: 'présent', dependance: { type: 'ccomp', cible: 5 }, homophone_de: null },
            { id: 9, texte: 'le', lemme: 'le', nature: 'déterminant', genre: 'm', nombre: 's', dependance: { type: 'det', cible: 10 }, homophone_de: null },
            { id: 10, texte: 'trésor', lemme: 'trésor', nature: 'nom', genre: 'm', nombre: 's', dependance: { type: 'nsubj', cible: 8 }, homophone_de: null },
            { id: 11, texte: '.', lemme: '.', nature: 'ponctuation', dependance: { type: 'punct', cible: 2 }, homophone_de: null }
        ],
        relations_globales: []
    }
];

describe('Homophones Priority & Detection - Couverture Complète', () => {
    it('prioritise toujours les homophones au rang 0 par rapport aux accords', () => {
        const appState = globalThis.AbeMainAppState;
        assert.ok(appState, 'AbeMainAppState doit être chargé');

        const errHomophoneOral = {
            type: 'reference_orale_attendue',
            parcoursType: 'homophone_se_ce',
            titreAide: 'Homophone (déterminant démonstratif)'
        };
        const errHomophoneDirect = {
            type: 'homophone_ce_se',
            mot: 'ce',
            correction: 'se'
        };
        const errAccordNom = { type: 'accord_nom_nombre' };
        const errAccordDet = { type: 'accord_determinant_nom' };
        const errAccordSujet = { type: 'accord_sujet_verbe' };

        const pOral = appState.obtenirPrioriteErreur(errHomophoneOral);
        const pDirect = appState.obtenirPrioriteErreur(errHomophoneDirect);
        const pNom = appState.obtenirPrioriteErreur(errAccordNom);
        const pDet = appState.obtenirPrioriteErreur(errAccordDet);
        const pSujet = appState.obtenirPrioriteErreur(errAccordSujet);

        assert.strictEqual(pOral, 0, 'L\'homophone en mode oral doit avoir la priorité 0');
        assert.strictEqual(pDirect, 0, 'L\'homophone direct doit avoir la priorité 0');
        assert.ok(pOral < pNom, 'Homophone (0) doit être prioritaire sur accord_nom_nombre');
        assert.ok(pOral < pDet, 'Homophone (0) doit être prioritaire sur accord_determinant_nom');
        assert.ok(pOral < pSujet, 'Homophone (0) doit être prioritaire sur accord_sujet_verbe');
    });

    it('déclenche le parcours homophone sur "Elle est allée à la bibliothèque se matin."', () => {
        const analyseur = new globalThis.AnalyseurGrammatical();
        analyseur.dictionnaire = dictData;

        const entreeCorpus = corpus1.find((e) => e.phrase_normalisee.includes('bibliothèque'));
        assert.ok(entreeCorpus, 'Phrase bibliothèque trouvée dans Corpus1');

        const tokensLexicaux = entreeCorpus.tokens || [];
        const tokenIndexParId = new Map();
        tokensLexicaux.forEach((t, i) => tokenIndexParId.set(Number(t.id), i));
        const tokensParId = new Map();
        tokensLexicaux.forEach((t) => tokensParId.set(Number(t.id), t));
        const entreeDetaillee = {
            tokensLexicaux,
            tokenIndexParId,
            tokensParId,
            relationsGlobales: entreeCorpus.relations_globales || []
        };

        const phraseSaisie = 'Elle est allée à la bibliothèque se matin.';
        const phraseRef = 'Elle est allée à la bibliothèque ce matin.';

        const resStandard = analyseur.analyserPhrase(phraseSaisie);

        const oralFilter = globalThis.AbeMainOralReferenceFilter;
        const oralPedagogy = globalThis.AbeMainOralPedagogy;
        const appState = globalThis.AbeMainAppState;

        const mockApp = Object.assign({}, appState, oralFilter, oralPedagogy, {
            config: {},
            analyseur,
            phraseReferenceOrale: phraseRef,
            estModeOralActif() { return true; },
            obtenirPhraseReferenceOrale() { return phraseRef; },
            obtenirEntreeCorpusDetailleReference() { return entreeDetaillee; },
            dedupliquerErreursPonctuationFinale(r) { return r; },
            normaliserTokenComparaison(t) { return String(t || '').toLowerCase().trim(); },
            extraireIdsRelationGlobale(relation = {}) {
                const ids = new Set();
                if (!relation || typeof relation !== 'object') return ids;
                ['sujet', 'verbe', 'det', 'nom', 'adj', 'participe', 'auxiliaire'].forEach((cle) => {
                    const val = Number(relation[cle]);
                    if (Number.isInteger(val) && val > 0) ids.add(val);
                });
                return ids;
            }
        });

        const resOral = mockApp.appliquerFiltreReferenceOrale(phraseSaisie, resStandard);
        assert.ok(Array.isArray(resOral.erreurs) && resOral.erreurs.length === 1, 'Exactement 1 erreur attendue');

        const erreur = resOral.erreurs[0];
        assert.strictEqual(erreur.mot, 'se');
        assert.strictEqual(erreur.correction, 'ce');
        assert.strictEqual(erreur.parcoursType, 'homophone_se_ce');
        assert.ok(erreur.titreAide.includes('Homophone'), 'Titre d\'aide doit mentionner Homophone');

        const questions = analyseur.genererQuestionAide(erreur, {});
        assert.ok(Array.isArray(questions) && questions.length >= 2, 'Doit générer le parcours de questions guidées pour se/ce');
        assert.ok(questions[0].question.includes('devant un nom'), 'La question 1 teste la présence devant un nom');
    });

    it('déclenche le parcours homophone pour Sont au lieu de Son et ou au lieu de où en mode oral', () => {
        const analyseur = new globalThis.AnalyseurGrammatical();
        analyseur.dictionnaire = dictData;

        const oralFilter = globalThis.AbeMainOralReferenceFilter;
        const oralPedagogy = globalThis.AbeMainOralPedagogy;
        const appState = globalThis.AbeMainAppState;

        const testPipeline = (phraseRef, phraseSaisie) => {
            const entreeCorpus = corpus1.find((e) => e.phrase_normalisee.toLowerCase() === phraseRef.toLowerCase()) || { tokens: [] };
            const tokensLexicaux = entreeCorpus.tokens || [];
            const tokenIndexParId = new Map();
            tokensLexicaux.forEach((t, i) => tokenIndexParId.set(Number(t.id), i));
            const tokensParId = new Map();
            tokensLexicaux.forEach((t) => tokensParId.set(Number(t.id), t));
            const entreeDetaillee = {
                tokensLexicaux,
                tokenIndexParId,
                tokensParId,
                relationsGlobales: entreeCorpus.relations_globales || []
            };
            const resStandard = analyseur.analyserPhrase(phraseSaisie);
            const mockApp = Object.assign({}, appState, oralFilter, oralPedagogy, {
                config: { forceCorpusAsOnlyReference: true }, // tester même avec forceCorpusAsOnlyReference
                analyseur,
                phraseReferenceOrale: phraseRef,
                estModeOralActif() { return true; },
                obtenirPhraseReferenceOrale() { return phraseRef; },
                obtenirEntreeCorpusDetailleReference() { return entreeDetaillee; },
                dedupliquerErreursPonctuationFinale(r) { return r; },
                normaliserTokenComparaison(t) { return String(t || '').toLowerCase().trim(); },
                extraireIdsRelationGlobale(relation = {}) {
                    const ids = new Set();
                    if (!relation || typeof relation !== 'object') return ids;
                    ['sujet', 'verbe', 'det', 'nom', 'adj', 'participe', 'auxiliaire'].forEach((cle) => {
                        const val = Number(relation[cle]);
                        if (Number.isInteger(val) && val > 0) ids.add(val);
                    });
                    return ids;
                }
            });
            return mockApp.appliquerFiltreReferenceOrale(phraseSaisie, resStandard);
        };

        // Test Sont -> Son
        const resSon = testPipeline('Son sac et ses livres sont restés sur le bureau.', 'Sont sac et ses livres sont restés sur le bureau.');
        const errSon = resSon.erreurs.find((e) => e.mot === 'Sont');
        assert.ok(errSon, 'Erreur sur Sont trouvée');
        assert.strictEqual(errSon.correction, 'Son');
        assert.strictEqual(errSon.parcoursType, 'homophone_sont_son');
        assert.ok(errSon.titreAide.includes('Homophone'), 'Titre d\'aide doit mentionner Homophone pour Sont');
        assert.ok(errSon.explication.includes('⚠️ Attention aux homophones'), 'Explication homophone attendue');

        // Test ou -> où
        const resOu = testPipeline('Il faut que tu saches où se cache le trésor.', 'Il faut que tu saches ou se cache le trésor.');
        const errOu = resOu.erreurs.find((e) => e.mot === 'ou');
        assert.ok(errOu, 'Erreur sur ou trouvée');
        assert.strictEqual(errOu.correction, 'où');
        assert.strictEqual(errOu.parcoursType, 'homophone_ou_ou_grave');
        assert.ok(errOu.titreAide.includes('Homophone'), 'Titre d\'aide doit mentionner Homophone pour ou');
    });

    it('détecte ce/se, ou/où et se/ce dans l\'analyseur standard sur différentes structures', () => {
        const analyseur = new globalThis.AnalyseurGrammatical();
        analyseur.dictionnaire = dictData;

        const res1 = analyseur.analyserPhrase('Il viendra se matin.');
        assert.ok(res1.erreurs.some((e) => e.type === 'homophone_se_ce' && e.mot === 'se'), 'se matin -> homophone_se_ce');

        const res2 = analyseur.analyserPhrase('Il viendra se beau matin.');
        assert.ok(res2.erreurs.some((e) => e.type === 'homophone_se_ce' && e.mot === 'se'), 'se beau matin -> homophone_se_ce');

        const res3 = analyseur.analyserPhrase('Il ce promène dans le parc.');
        assert.ok(res3.erreurs.some((e) => e.type === 'homophone_ce_se' && e.mot === 'ce'), 'ce promène -> homophone_ce_se');

        const res4 = analyseur.analyserPhrase('La ville ou je suis né.');
        assert.ok(res4.erreurs.some((e) => e.type === 'homophone_ou_ou_grave' && e.mot === 'ou'), 'la ville ou -> homophone_ou_ou_grave');

        const res5 = analyseur.analyserPhrase('Ou vas-tu ?');
        assert.ok(res5.erreurs.some((e) => e.type === 'homophone_ou_ou_grave' && e.mot === 'Ou'), 'Ou vas-tu -> homophone_ou_ou_grave');
    });

    it('vérifie que tous les homophones répertoriés disposent de questions guidées', () => {
        const ped = globalThis.AbeAnalyseurCategories;
        const oralHomo = ped.HOMOPHONES_ORAUX;
        const analyseur = new globalThis.AnalyseurGrammatical();
        analyseur.dictionnaire = dictData;

        for (const [saisi, targets] of Object.entries(oralHomo)) {
            for (const [attendu] of Object.entries(targets)) {
                const parcoursType = ped.enrichirExplicationHomophone(saisi, attendu)?.parcoursType;
                assert.ok(parcoursType, `parcoursType doit exister pour ${saisi} -> ${attendu}`);
                const q = analyseur.genererQuestionAide({
                    type: 'reference_orale_attendue',
                    parcoursType,
                    mot: saisi,
                    correction: attendu
                });
                assert.ok(Array.isArray(q) && q.length > 0, `Des questions doivent être générées pour ${parcoursType}`);
            }
        }
    });
});

