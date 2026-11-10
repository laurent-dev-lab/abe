import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

describe('Corpus Loader & Endpoint PHP save_dictee.php', () => {
    it('vérifie que corpus-oral.js charge depuis corpus/dictees/ selon le paramètre URL', () => {
        const content = fs.readFileSync('corpus/corpus-oral.js', 'utf8');
        assert.ok(content.includes('corpus/dictees/'), 'corpus/corpus-oral.js doit charger depuis corpus/dictees/');
        assert.ok(!content.includes('Corpus1.json'), 'corpus/corpus-oral.js ne doit plus référencer Corpus1.json');
    });

    it('vérifie que oral-pedagogy.js charge depuis corpus/dictees/ selon le paramètre URL', () => {
        const content = fs.readFileSync('src/main/oral-pedagogy.js', 'utf8');
        assert.ok(content.includes('corpus/dictees/'), 'src/main/oral-pedagogy.js doit charger depuis corpus/dictees/');
        assert.ok(!content.includes('Corpus1.json'), 'src/main/oral-pedagogy.js ne doit plus référencer Corpus1.json');
    });

    it('vérifie que save_dictee.php enregistre un JSON valide dans corpus/dictees/ et retourne un identifiant', () => {
        assert.ok(fs.existsSync('corpus/save_dictee.php'), 'corpus/save_dictee.php doit exister');
        assert.ok(fs.existsSync('corpus/dictees/index.php'), 'corpus/dictees/index.php doit exister pour bloquer le listing');

        const phpExe = fs.existsSync('C:\\xampp\\php\\php.exe') ? 'C:\\xampp\\php\\php.exe' : 'php';
        const payload = JSON.stringify([
            {
                phrase_originale: 'Les élèves écrivent la dictée.',
                phrase_normalisee: 'Les élèves écrivent la dictée.',
                langue: 'fr',
                tokens: [
                    { id: 1, texte: 'Les', lemme: 'le', nature: 'déterminant', genre: 'm', nombre: 'p', dependance: { type: 'det', cible: 2 } },
                    { id: 2, texte: 'élèves', lemme: 'élève', nature: 'nom', genre: 'm', nombre: 'p', dependance: { type: 'nsubj', cible: 3 } },
                    { id: 3, texte: 'écrivent', lemme: 'écrire', nature: 'verbe', nombre: 'p', personne: '3', mode: 'indicatif', temps: 'présent', dependance: { type: 'root', cible: 0 } },
                    { id: 4, texte: 'la', lemme: 'le', nature: 'déterminant', genre: 'f', nombre: 's', dependance: { type: 'det', cible: 5 } },
                    { id: 5, texte: 'dictée', lemme: 'dictée', nature: 'nom', genre: 'f', nombre: 's', dependance: { type: 'obj', cible: 3 } },
                    { id: 6, texte: '.', lemme: '.', nature: 'ponctuation', dependance: { type: 'punct', cible: 3 } }
                ],
                relations_globales: []
            }
        ]);

        const phpRunner = `$_SERVER["REQUEST_METHOD"] = "POST"; include "corpus/save_dictee.php";`;
        const proc = spawnSync(phpExe, ['-r', phpRunner], {
            input: payload,
            encoding: 'utf8'
        });

        assert.strictEqual(proc.status, 0, `PHP doit se terminer avec le code 0 (stderr: ${proc.stderr})`);
        const res = JSON.parse(proc.stdout.trim());
        assert.strictEqual(res.success, true);
        assert.ok(/^d_[a-f0-9]{8}$/.test(res.id), `ID généré valide attendu, reçu: ${res.id}`);

        const savedFile = path.resolve('corpus', 'dictees', `${res.id}.json`);
        assert.ok(fs.existsSync(savedFile), 'Le fichier JSON généré doit exister dans corpus/dictees/');

        const savedContent = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
        assert.strictEqual(savedContent.length, 1);
        assert.strictEqual(savedContent[0].phrase_originale, 'Les élèves écrivent la dictée.');

        // Nettoyage du fichier de test
        fs.unlinkSync(savedFile);
    });
});
