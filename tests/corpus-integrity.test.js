import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import '../src/main/prof-workflow.js';

describe('Workflow Enseignant & Validation du JSON Dictée', () => {
    it('supprime bien les anciens fichiers obsolètes Corpus1.json et Corpus2.json', () => {
        assert.strictEqual(fs.existsSync('corpus/Corpus1.json'), false, 'Corpus1.json ne doit plus exister');
        assert.strictEqual(fs.existsSync('corpus/Corpus2.json'), false, 'Corpus2.json ne doit plus exister');
    });

    it('génère un préprompt optimisé contenant dynamiquement les phrases saisies', () => {
        const wf = globalThis.AbeProfWorkflow;
        assert.ok(wf, 'AbeProfWorkflow doit être défini');

        const phrases = wf.extrairePhrasesSaisies(
            'Les élèves préparent leur dictée.\n\nIl a révisé ses leçons ce soir.\n'
        );
        assert.strictEqual(phrases.length, 2);

        const prompt = wf.genererPreprompt(phrases);
        assert.ok(prompt.includes('1. Les élèves préparent leur dictée.'));
        assert.ok(prompt.includes('2. Il a révisé ses leçons ce soir.'));
        assert.ok(prompt.includes('phrase_originale'));
        assert.ok(prompt.includes('relations_globales'));
        assert.ok(prompt.includes('homophone_de'));
        assert.ok(prompt.includes('dependance'));
    });

    it('valide un JSON conforme généré par une IAG (même entouré de balises markdown)', () => {
        const wf = globalThis.AbeProfWorkflow;
        const rawAiOutput = `\`\`\`json
[
  {
    "phrase_originale": "Le chat dort.",
    "phrase_normalisee": "Le chat dort.",
    "langue": "fr",
    "tokens": [
      { "id": 1, "texte": "Le", "lemme": "le", "nature": "déterminant", "genre": "m", "nombre": "s", "dependance": { "type": "det", "cible": 2 } },
      { "id": 2, "texte": "chat", "lemme": "chat", "nature": "nom", "genre": "m", "nombre": "s", "dependance": { "type": "nsubj", "cible": 3 } },
      { "id": 3, "texte": "dort", "lemme": "dormir", "nature": "verbe", "nombre": "s", "personne": "3", "mode": "indicatif", "temps": "présent", "dependance": { "type": "root", "cible": 0 } },
      { "id": 4, "texte": ".", "lemme": ".", "nature": "ponctuation", "dependance": { "type": "punct", "cible": 3 } }
    ],
    "relations_globales": [
      { "type": "accord_determinant_nom", "det": 1, "nom": 2, "correct": true },
      { "type": "accord_sujet_verbe", "sujet": 2, "verbe": 3, "correct": true }
    ]
  }
]
\`\`\``;

        const res = wf.validerJsonDictee(rawAiOutput);
        assert.strictEqual(res.valide, true);
        assert.strictEqual(res.donnees.length, 1);
        assert.strictEqual(res.donnees[0].phrase_originale, 'Le chat dort.');
        assert.strictEqual(res.donnees[0].tokens.length, 4);
    });

    it('rejette un JSON invalide ou incomplet avec un message clair et génère le prompt de rectification', () => {
        const wf = globalThis.AbeProfWorkflow;
        const resVide = wf.validerJsonDictee('');
        assert.strictEqual(resVide.valide, false);

        const resSyntaxe = wf.validerJsonDictee('pas du json');
        assert.strictEqual(resSyntaxe.valide, false);

        const resIncomplet = wf.validerJsonDictee('[{"phrase_originale": "Test sans tokens"}]');
        assert.strictEqual(resIncomplet.valide, false);

        const promptFix = wf.genererPromptRectification(resIncomplet.erreur);
        assert.ok(promptFix.includes('anomalie'));
        assert.ok(promptFix.includes(resIncomplet.erreur));
        assert.ok(promptFix.includes('RENDS UNIQUEMENT LE CODE JSON VALIDE'));
    });
});
