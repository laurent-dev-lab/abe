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
    'main.js',
    'src/main/prof-workflow.js'
];

for (const file of files) {
    await import(`../${file}`);
}

const dictionnaireData = JSON.parse(fs.readFileSync('refs/dictionnaire.json', 'utf8'));

describe('40 Tests Headless - Diversité et robustesse du cœur applicatif', () => {
    // 40 cas variés couvrant:
    // - majuscule initiale
    // - ponctuation finale manquante ou substituée (? . !)
    // - accords déterminant-nom (singulier/pluriel, omission du s)
    // - accords sujet-verbe (1re, 2e, 3e p. singulier/pluriel, sujet inversé)
    // - accords adjectif-nom (épithète, attribut)
    // - homophones fréquents (a/à, et/est, son/sont, on/ont, ce/se, ces/ses, ou/où, leur/leurs)
    // - oublis de lettre interne (sis -> suis, liu -> lieu, etc.)
    // - mots invariables (toujours, beaucoup, jamais...)
    // - élisions et apostrophes (j', l', d')
    // - participes passés et infinitifs
    // - mots manquants / mots collés
    const corpus40 = [
        {
            id: 1,
            titre: 'Majuscule, accord sujet-verbe et ponctuation',
            ref: 'Les enfants jouent dans la cour.',
            saisie: 'les enfants joue dans la cour',
            attenduFautes: ['les', 'joue', '.']
        },
        {
            id: 2,
            titre: 'Homophone a/à et oubli de lettre interne (sis)',
            ref: 'Je suis à Paris avec mon frère.',
            saisie: 'je sis a Paris avec mon frère.',
            attenduFautes: ['je', 'sis', 'a']
        },
        {
            id: 3,
            titre: 'Accord dét-nom pluriel manquant et homophone son/sont',
            ref: 'Ils sont fiers de leurs victoires.',
            saisie: 'Ils son fiers de leurs victoire.',
            attenduFautes: ['son', 'victoire']
        },
        {
            id: 4,
            titre: 'Homophone et/est et adjectif accord',
            ref: 'La robe est belle et propre.',
            saisie: 'La robe et beau et propre.',
            attenduFautes: ['et', 'beau']
        },
        {
            id: 5,
            titre: 'Oubli de lettre interne sur nom (liu -> lieu) et ponctuation d interrogation',
            ref: 'Quel est ce bel endroit ?',
            saisie: 'Quel est ce bel endroit.',
            attenduFautes: ['?']
        },
        {
            id: 6,
            titre: 'Homophone on/ont et accord pluriel',
            ref: 'On a vu trois grands oiseaux.',
            saisie: 'ont a vu trois grand oiseaux.',
            attenduFautes: ['ont', 'grand']
        },
        {
            id: 7,
            titre: 'Accord attribut du sujet pluriel',
            ref: 'Ces filles sont très gentilles.',
            saisie: 'Ces filles sont très gentil.',
            attenduFautes: ['gentil']
        },
        {
            id: 8,
            titre: 'Homophone ou/où et mot invariable',
            ref: 'Où vas-tu toujours aussi vite ?',
            saisie: 'ou vas-tu toujour aussi vite ?',
            attenduFautes: ['ou', 'toujour']
        },
        {
            id: 9,
            titre: 'Homophone ce/se devant verbe pronominal',
            ref: 'Il se lave les mains avant de manger.',
            saisie: 'Il ce lave les main avant de manger.',
            attenduFautes: ['ce', 'main']
        },
        {
            id: 10,
            titre: 'Homophone ces/ses et oubli de lettre interne',
            ref: 'Elle range ses affaires dans son sac.',
            saisie: 'Elle range ces afaires dans son sac.',
            attenduFautes: ['ces', 'afaires']
        },
        {
            id: 11,
            titre: 'Inversion sujet-verbe et négation',
            ref: "Pourquoi n'as-tu pas pris ton manteau ?",
            saisie: "pourquoi as-tu pas pris ton manteau",
            attenduFautes: ['pourquoi', "n'as-tu", '?']
        },
        {
            id: 12,
            titre: 'Accord au/aux devant nom pluriel',
            ref: 'Nous allons aux courses ce matin.',
            saisie: 'Nous allons au courses ce matin.',
            attenduFautes: ['au']
        },
        {
            id: 13,
            titre: 'Accord leur/leurs devant nom pluriel',
            ref: 'Ils prêtent leurs jouets aux voisins.',
            saisie: 'Ils prêtent leur jouet aux voisins.',
            attenduFautes: ['leur', 'jouet']
        },
        {
            id: 14,
            titre: 'Participe passé avec être accord sujet fém pluriel',
            ref: 'Elles sont arrivées très tard.',
            saisie: 'Elles sont arrivé très tard.',
            attenduFautes: ['arrivé']
        },
        {
            id: 15,
            titre: 'Infinitif requis après préposition pour',
            ref: 'Il faut écouter pour comprendre la leçon.',
            saisie: 'Il faut écouté pour comprend la leçon.',
            attenduFautes: ['écouté', 'comprend']
        },
        {
            id: 16,
            titre: 'Mot invariable beaucoup et oubli de lettre interne',
            ref: 'Il y a beaucoup de bruit ici.',
            saisie: 'Il ya beaucou de bruit ici.',
            attenduFautes: ['ya', 'beaucou']
        },
        {
            id: 17,
            titre: 'Pluriel en x (animaux / chevaux / bateaux)',
            ref: 'Les petits bateaux naviguent sur le lac.',
            saisie: 'Les petit bateaus navigue sur le lac.',
            attenduFautes: ['petit', 'bateaus', 'navigue']
        },
        {
            id: 18,
            titre: 'Apostrophe obligatoire élision j',
            ref: "J'aime lire sous un grand arbre.",
            saisie: "Je aime lire sous un grand arbre.",
            attenduFautes: ["Je"]
        },
        {
            id: 19,
            titre: 'Double faute ponctuation et accord dét-nom (un avions)',
            ref: 'Je suis dans un avion avec toi.',
            saisie: 'je sis dans un avions avec toi',
            attenduFautes: ['je', 'sis', 'avions', '.']
        },
        {
            id: 20,
            titre: 'Accord adjectif fém singulier et accent',
            ref: 'Une belle journée commence enfin.',
            saisie: 'Une bel journée commence enfin.',
            attenduFautes: ['bel']
        },
        {
            id: 21,
            titre: 'Terminaison verbe 2e personne (tu manges)',
            ref: 'Tu manges une pomme rouge.',
            saisie: 'Tu mange une pomme rouge.',
            attenduFautes: ['mange']
        },
        {
            id: 22,
            titre: 'Terminaison verbe 1re personne pluriel (-ons)',
            ref: 'Nous partons demain en vacances.',
            saisie: 'Nous parton demain en vacance.',
            attenduFautes: ['parton', 'vacance']
        },
        {
            id: 23,
            titre: 'Confusion phonographique c / ç',
            ref: 'Le garçon a reçu un cadeau.',
            saisie: 'Le garcon a recu un cadeau.',
            attenduFautes: ['garcon', 'recu']
        },
        {
            id: 24,
            titre: 'Oubli de lettre interne dans un verbe (mager -> manger)',
            ref: 'Comment faire pour manger sans les mains ?',
            saisie: 'comment faire pour mager sans les main ?',
            attenduFautes: ['comment', 'mager', 'main']
        },
        {
            id: 25,
            titre: 'Adjectif attribut masculin singulier (bleus -> bleu)',
            ref: "Le ciel est bleu aujourd'hui.",
            saisie: "Le ciel et bleus aujourd'hui.",
            attenduFautes: ['et', 'bleus']
        },
        {
            id: 26,
            titre: 'Accord sujet inversé et adjectif pluriel',
            ref: 'Sont-ils contents de leurs résultats ?',
            saisie: 'Son-ils content de leur résultats ?',
            attenduFautes: ['Son-ils', 'content', 'leur']
        },
        {
            id: 27,
            titre: 'Point d exclamation et mot invariable soudain',
            ref: 'Soudain, un grand cri retentit !',
            saisie: 'soudin, un grand cri retenti !',
            attenduFautes: ['soudin', 'retenti']
        },
        {
            id: 28,
            titre: 'Accord passé composé auxiliaire avoir sans COD antéposé',
            ref: 'Nous avons mangé toutes les tartes.',
            saisie: 'Nous avons mangés toute les tarte.',
            attenduFautes: ['mangés', 'toute', 'tarte']
        },
        {
            id: 29,
            titre: 'Homophone sa/ça possessif',
            ref: 'Chacun prend sa valise pour partir.',
            saisie: 'Chacun prend ça valise pour partir.',
            attenduFautes: ['ça']
        },
        {
            id: 30,
            titre: 'Homophone mais/mes',
            ref: 'Je cherche mes clés mais je ne les trouve pas.',
            saisie: 'Je cherche mais clés mes je ne les trouve pas.',
            attenduFautes: ['mais', 'mes']
        },
        {
            id: 31,
            titre: 'Accord dét pluriel (des) et nom singulier',
            ref: 'Des chiens aboient toute la nuit.',
            saisie: 'Des chien aboie toute la nuit.',
            attenduFautes: ['chien', 'aboie']
        },
        {
            id: 32,
            titre: 'Oubli lettre interne nom (tabe -> table)',
            ref: 'Pose ton livre sur la grande table.',
            saisie: 'Pose ton livre sur la grand tabe.',
            attenduFautes: ['grand', 'tabe']
        },
        {
            id: 33,
            titre: 'Négation ne ... pas coupée / familière',
            ref: "Il n'est pas méchant avec nous.",
            saisie: "Il est pas méchant avec nous.",
            attenduFautes: ["est"]
        },
        {
            id: 34,
            titre: 'Accord adjectif de couleur pluriel',
            ref: 'Elle porte des chaussures noires.',
            saisie: 'Elle porte des chaussure noir.',
            attenduFautes: ['chaussure', 'noir']
        },
        {
            id: 35,
            titre: 'Pronom relatif qui sujet et accord verbe pluriel',
            ref: 'Ce sont des histoires qui font peur.',
            saisie: 'Ce sont des histoire qui fais peur.',
            attenduFautes: ['histoire', 'fais']
        },
        {
            id: 36,
            titre: 'Mot invariable jamais / toujours avec s muet',
            ref: 'Tu ne dis jamais la vérité.',
            saisie: 'Tu ne dit jamai la vérité.',
            attenduFautes: ['dit', 'jamai']
        },
        {
            id: 37,
            titre: 'Élision d / apostrophe',
            ref: "Un bol d'eau fraîche pour le chat.",
            saisie: "Un bol de eau fraiche pour le chat.",
            attenduFautes: ["de", "fraiche"]
        },
        {
            id: 38,
            titre: 'Terminaison verbe imparfait (-ait vs -aient)',
            ref: 'Les feuilles tombaient doucement par terre.',
            saisie: 'Les feuille tombait doucement par terre.',
            attenduFautes: ['feuille', 'tombait']
        },
        {
            id: 39,
            titre: 'Mot manquant dans la phrase',
            ref: 'Le facteur apporte le courrier chaque matin.',
            saisie: 'Le facteur le courrier chaque matin.',
            attenduFautes: ['apporte']
        },
        {
            id: 40,
            titre: 'Triple faute cumulée: majuscule, ponctuation, homophone et oubli lettre',
            ref: 'Pourquoi as-tu peur du noir, il n\'est pas méchant.',
            saisie: 'pourquoi as-tu peur du noir, il n\'et pas méchants',
            attenduFautes: ['pourquoi', "n'et", 'méchants', '.']
        }
    ];

    it(`exécute les 40 scénarios variés en mode headless et vérifie la détection et la maïeutique`, () => {
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
        app.questionText = { innerHTML: '', classList: { add() {}, remove() {} } };
        app.answerOptions = { innerHTML: '', appendChild() {} };
        app.afficherQuestion = function () {};
        app.afficherJeuMotInvariable = function () {};
        app.jeuInvariable = new globalThis.JeuMotInvariable({
            analyseur,
            onCorrige: () => {},
            onAffiche: () => {},
            onMessage: () => {},
            onTermine: () => {}
        });

        // Génère le JSON de corpus pour les 40 phrases via AbeProfWorkflow
        const wf = globalThis.AbeProfWorkflow;
        const promptGen = wf.genererPreprompt(corpus40.map(c => c.ref));
        assert.ok(promptGen, 'Le prompt prof doit être généré');

        let totalErreursDetectees = 0;
        let totalScenariosValides = 0;

        corpus40.forEach((scenario, index) => {
            const rawTokensRef = analyseur.tokeniser(scenario.ref);
            const tokensLexicauxRef = rawTokensRef.filter(t => !/^[.,;:!?"«»()\[\]{}\-–—]+$/.test(t.texte));

            const entreeRef = {
                phrase_originale: scenario.ref,
                phrase_normalisee: scenario.ref,
                tokens: rawTokensRef.map((t, idx) => ({
                    id: idx + 1,
                    texte: t.texte,
                    nature: /^[.,;:!?]$/.test(t.texte) ? 'ponctuation' : (t.donnees?.type || 'mot'),
                    dependance: { type: 'dep', cible: 1 }
                })),
                tokensLexicaux: tokensLexicauxRef.map((t, idx) => ({
                    id: idx + 1,
                    texte: t.texte,
                    nature: t.donnees?.type || 'mot',
                    genre: t.donnees?.genre || null,
                    nombre: t.donnees?.nombre || null,
                    lemme: t.donnees?.lemme || null,
                    dependance: { type: 'dep', cible: 1 }
                })),
                relations_globales: []
            };

            const indexe = app.construireIndexCorpusDetaille(entreeRef);
            app.corpusDetaille = [indexe];
            app.corpusDetailleCharge = true;
            app.obtenirEntreeCorpusDetailleReference = () => indexe;
            globalThis.window.abeLecteurOral = { phraseCourante: scenario.ref };

            // Analyse
            let res = analyseur.analyserPhrase(scenario.saisie);
            app.motsAnalyse = res.mots;
            res = app.appliquerFiltreReferenceOrale(scenario.saisie, res);
            app.motsAnalyse = res.mots;
            app.erreurs = app.ordonnerErreursPourCorrection(app.filtrerErreursActionnables(res.erreurs));

            assert.ok(app.erreurs.length > 0, `Scénario #${scenario.id} (${scenario.titre}) : doit détecter au moins une erreur`);
            totalErreursDetectees += app.erreurs.length;

            // Tester pour la première erreur que demarrerAide() ne plante jamais
            const premiereErreur = app.erreurs[0];
            app.erreurActuelle = premiereErreur;
            assert.doesNotThrow(() => {
                app.demarrerAide();
            }, `Scénario #${scenario.id} : demarrerAide ne doit pas planter`);

            totalScenariosValides += 1;
        });

        assert.strictEqual(totalScenariosValides, 40, 'Les 40 scénarios doivent être validés avec succès');
        assert.ok(totalErreursDetectees >= 60, `Au moins 60 erreurs cumulées doivent être repérées sur les 40 phrases (trouvé: ${totalErreursDetectees})`);
    });
});
