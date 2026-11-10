import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const loaded = require('../src/analyseur/categories/oral-jeu-invariable.js');
const JeuMotInvariable = loaded.JeuMotInvariable || globalThis.JeuMotInvariable;

describe('Jeu Mot Invariable - Moteur et Validation des Lettres', () => {
    it('initialise correctement les slots et révèle les lettres déjà correctes', () => {
        let correctionRecue = null;
        let termineAppele = false;

        const jeu = new JeuMotInvariable({
            onCorrige: (corr) => { correctionRecue = corr; },
            onTermine: () => { termineAppele = true; },
            onAffiche: () => {}
        });

        const erreur = {
            mot: 'toujou',
            correction: 'toujours'
        };

        jeu.initialiser(erreur);

        assert.ok(jeu.etat, 'L\'état du jeu doit être initialisé');
        assert.strictEqual(jeu.etat.motAttendu, 'toujours');
        assert.strictEqual(jeu.etat.slots.length, 8); // 'toujours' = 8 lettres

        // Les 6 premières lettres 'toujou' correspondent
        for (let i = 0; i < 6; i++) {
            assert.strictEqual(jeu.etat.slots[i].revele, true);
            assert.strictEqual(jeu.etat.slots[i].statut, 'correct');
        }

        // La 7e 'r' et 8e 's' doivent être à deviner
        assert.strictEqual(jeu.etat.slots[6].revele, false);
        assert.strictEqual(jeu.etat.slots[7].revele, false);
        assert.strictEqual(jeu.etat.indexActif, 6);

        // Proposition fausse 'x'
        jeu.traiterPropositionCaractere('x');
        assert.strictEqual(jeu.etat.slots[6].essais, 1);
        assert.strictEqual(jeu.etat.slots[6].revele, false);

        // Proposition juste 'r'
        jeu.traiterPropositionCaractere('r');
        assert.strictEqual(jeu.etat.slots[6].revele, true);
        assert.strictEqual(jeu.etat.indexActif, 7);

        // Proposition juste 's' pour finaliser
        jeu.traiterPropositionCaractere('s');
        assert.strictEqual(jeu.etat.slots[7].revele, true);
        assert.strictEqual(jeu.etat.termine, true);
        assert.strictEqual(correctionRecue, 'toujours');
    });

    it('révèle automatiquement la lettre comme indice après 3 essais erronés', () => {
        const jeu = new JeuMotInvariable({
            onCorrige: () => {},
            onAffiche: () => {}
        });

        jeu.initialiser({
            mot: '',
            correction: 'parce'
        });

        assert.strictEqual(jeu.etat.indexActif, 0);

        // 3 faux essais sur la 1re lettre ('p')
        jeu.traiterPropositionCaractere('z');
        jeu.traiterPropositionCaractere('y');
        jeu.traiterPropositionCaractere('x');

        assert.strictEqual(jeu.etat.slots[0].revele, true);
        assert.strictEqual(jeu.etat.slots[0].statut, 'hint');
        assert.strictEqual(jeu.etat.slots[0].valeur, 'p');
        assert.strictEqual(jeu.etat.indexActif, 1);
    });

    it('aligne correctement un oubli de lettre au milieu du mot (ex: "sis" -> "s_is" pour "suis" et "liu" -> "li_u" pour "lieu")', () => {
        let correctionRecue = null;
        const jeu = new JeuMotInvariable({
            onCorrige: (corr) => { correctionRecue = corr; },
            onAffiche: () => {},
            onTermine: () => {}
        });

        const erreurSis = {
            mot: 'sis',
            correction: 'suis',
            parcoursType: 'oubli_lettre_interne'
        };

        assert.strictEqual(jeu.doitDeclencher(erreurSis), true, 'doitDeclencher doit être vrai pour oubli_lettre_interne');
        jeu.initialiser(erreurSis);

        assert.strictEqual(jeu.etat.slots.length, 4);
        // 's' révélé, 'u' caché (actif), 'i' révélé, 's' révélé => s_is
        assert.strictEqual(jeu.etat.slots[0].revele, true);
        assert.strictEqual(jeu.etat.slots[0].valeur, 's');
        assert.strictEqual(jeu.etat.slots[1].revele, false);
        assert.strictEqual(jeu.etat.slots[1].valeur, '');
        assert.strictEqual(jeu.etat.slots[2].revele, true);
        assert.strictEqual(jeu.etat.slots[2].valeur, 'i');
        assert.strictEqual(jeu.etat.slots[3].revele, true);
        assert.strictEqual(jeu.etat.slots[3].valeur, 's');
        assert.strictEqual(jeu.etat.indexActif, 1);

        // Saisie de la lettre manquante 'u'
        jeu.traiterPropositionCaractere('u');
        assert.strictEqual(jeu.etat.termine, true);
        assert.strictEqual(correctionRecue, 'suis');
    });
});
