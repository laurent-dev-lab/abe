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
    'oral/speech-utils.js',
    'src/main/oral-alignment.js',
    'src/main/oral-reference-filter.js',
    'src/main/app-state.js',
    'src/main/oral-pedagogy.js'
];

for (const f of files) {
    await import(`../${f}`);
}

const dictData = JSON.parse(fs.readFileSync('refs/dictionnaire.json', 'utf8'));
const dictee = JSON.parse(fs.readFileSync('corpus/dictees/d_13660e19.json', 'utf8'));
const entreeDictee = dictee[0];

const analyseur = new globalThis.AnalyseurGrammatical();
analyseur.initialiser(dictData, { fautesLexicales: [], motifs: [] }, {}, {});

const appState = globalThis.AbeMainAppState;
const oralFilter = globalThis.AbeMainOralReferenceFilter;
const oralPedagogy = globalThis.AbeMainOralPedagogy;

const phraseSaisie = 'je sis dans un avions avec toi.';
const phraseRef = entreeDictee.phrase_originale;

const mockApp = {
    ...appState,
    ...oralFilter,
    ...oralPedagogy,
    analyseur,
    phraseReferenceOrale: phraseRef,
    config: { forceCorpusAsOnlyReference: true },
    estModeOralActif() { return true; },
    obtenirPhraseReferenceOrale() { return phraseRef; },
    dedupliquerErreursPonctuationFinale(r) { return r; },
    normaliserPhraseCorpus(phrase) {
        return String(phrase || '')
            .replace(/\s+/g, ' ')
            .replace(/\s+([.,;:!?])/g, '$1')
            .trim()
            .toLowerCase();
    },
    estTokenPonctuationDetail(token) {
        if (!token) return true;
        const nature = String(token.nature || '').toLowerCase();
        const texte = String(token.texte || '').trim();
        if (nature === 'ponctuation') return true;
        return /^[.,;:!?]$/.test(texte);
    },
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
                if (!this.estTokenPonctuationDetail(token)) {
                    tokenIndexParId.set(id, lexicalIndex);
                } else {
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
    },
    obtenirEntreeCorpusDetailleReference() {
        if (!this.corpusDetailleCharge || !(this.corpusDetailleParPhrase instanceof Map)) return null;
        const reference = this.obtenirPhraseReferenceOrale();
        if (!reference) return null;
        const cle = this.normaliserPhraseCorpus(reference);
        return this.corpusDetailleParPhrase.get(cle) || null;
    },
    extraireIdsRelationGlobale(relation = {}) {
        const ids = new Set();
        if (!relation || typeof relation !== 'object') return ids;
        ['sujet', 'verbe', 'det', 'nom', 'adj', 'participe', 'auxiliaire'].forEach((cle) => {
            const val = Number(relation[cle]);
            if (Number.isInteger(val) && val > 0) ids.add(val);
        });
        return ids;
    }
};

mockApp.indexerEntreesCorpusDetaille(dictee);

console.log('--- RECO ---');
const reco = mockApp.reconnaitrePhraseOrale(phraseSaisie, phraseRef);
console.log('reco:', reco);

console.log('--- ANALYSE STANDARD ---');
const resStd = analyseur.analyserPhrase(phraseSaisie);
mockApp.motsAnalyse = resStd.mots;
console.log('resStd erreurs:', resStd.erreurs);

console.log('--- ORAL FILTER ---');
const resOral = mockApp.appliquerFiltreReferenceOrale(phraseSaisie, resStd);
console.log('resOral erreurs:', JSON.stringify(resOral.erreurs, null, 2));
