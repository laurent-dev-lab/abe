import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

describe('Télécommande Dictée & Modales Enseignant', () => {
    it('inclut la liste déroulante de sélection des phrases ("Phrase 1", "Phrase 2"...) au-dessus du bouton lecture dans oral-player.js', () => {
        const oralPlayerCode = fs.readFileSync('oral/oral-player.js', 'utf8');
        assert.ok(
            oralPlayerCode.includes('abe-oral-select-phrase'),
            'oral-player.js doit créer le select .abe-oral-select-phrase'
        );
        assert.ok(
            oralPlayerCode.includes('`Phrase ${index + 1}`'),
            'oral-player.js doit nommer les options "Phrase 1", "Phrase 2", etc.'
        );
        const posSelect = oralPlayerCode.indexOf('panel.appendChild(selectPhrase)');
        const posPlay = oralPlayerCode.indexOf('panel.appendChild(btnLecture)');
        assert.ok(posSelect > -1 && posPlay > -1 && posSelect < posPlay, 'La liste déroulante doit être placée au-dessus du bouton lecture');
    });

    it('inclut les modales d\'entrée ("Je suis prof" / "Je suis élève") et du workflow prof dans index.html', () => {
        const html = fs.readFileSync('index.html', 'utf8');
        assert.ok(html.includes('id="modal-entree"'), 'index.html doit contenir #modal-entree');
        assert.ok(html.includes('id="btn-role-prof"'), 'index.html doit contenir le bouton "Je suis prof"');
        assert.ok(html.includes('id="btn-role-eleve"'), 'index.html doit contenir le bouton "Je suis élève"');
        assert.ok(html.includes('id="modal-prof"'), 'index.html doit contenir #modal-prof');
        assert.ok(html.includes('id="prof-copy-prompt-btn"'), 'index.html doit contenir le bouton de copie du préprompt');
        assert.ok(html.includes('id="prof-json-textarea"'), 'index.html doit contenir la zone de collage du JSON');
        assert.ok(html.includes('id="prof-generated-link"'), 'index.html doit contenir le champ du lien généré');
    });
});
