(function () {
    'use strict';

    const NORMAL_RATE = 0.79;

    class AbeLecteurOral {
        constructor() {
            this.synthese = typeof window !== 'undefined' && 'speechSynthesis' in window
                ? window.speechSynthesis
                : null;

            this.phraseCourante = '';
            this.indexPhraseCourante = 0;
            this.enLecture = false;
            this.utteranceActive = null;

            this.panelLecteur = null;
            this.selectPhrase = null;
            this.btnLecture = null;
            this.btnReset = null;
        }

        async initialiser() {
            this.creerLecteur();
            await this.preparerPhraseInitiale();

            window.addEventListener('abe-corpus-mis-a-jour', () => {
                this.mettreAJourListePhrases();
                this.selectionnerPhraseParIndex(0, { reinitialiserInterface: false });
            });

            window.addEventListener('abe-reinitialiser', () => {
                this.reinitialiserLecteur();
            });
        }

        creerLecteur() {
            const panel = document.createElement('div');
            panel.className = 'abe-oral-player';
            panel.setAttribute('role', 'toolbar');
            panel.setAttribute('aria-label', 'Télécommande dictée');

            // 0. Liste déroulante de sélection de la phrase (au-dessus du bouton lecture)
            const selectPhrase = document.createElement('select');
            selectPhrase.id = 'abe-oral-select-phrase';
            selectPhrase.className = 'abe-oral-select-phrase';
            selectPhrase.title = 'Choisir la phrase de la dictée';
            selectPhrase.setAttribute('aria-label', 'Choisir la phrase de la dictée');
            selectPhrase.addEventListener('change', () => {
                const idx = parseInt(selectPhrase.value, 10);
                if (!Number.isNaN(idx)) {
                    this.selectionnerPhraseParIndex(idx, { reinitialiserInterface: true });
                }
            });

            // 1. Bouton Lecture / Pause
            const btnLecture = document.createElement('button');
            btnLecture.type = 'button';
            btnLecture.className = 'abe-oral-icon-btn abe-oral-btn-play';
            btnLecture.title = 'Écouter la phrase';
            btnLecture.setAttribute('aria-label', 'Écouter la phrase');
            btnLecture.innerHTML = '<span class="abe-oral-btn-icon">▶</span><span class="abe-oral-btn-label">Écouter</span>';
            btnLecture.addEventListener('click', () => this.basculerLecture());

            // 2. Bouton RAZ / Recommencer
            const btnReset = document.createElement('button');
            btnReset.type = 'button';
            btnReset.className = 'abe-oral-icon-btn abe-oral-btn-reset';
            btnReset.title = 'Recommencer (RAZ)';
            btnReset.setAttribute('aria-label', 'Recommencer (RAZ)');
            btnReset.innerHTML = '<span class="abe-oral-btn-icon">🔄</span><span class="abe-oral-btn-label">Recommencer</span>';
            btnReset.addEventListener('click', () => this.recommencer());

            panel.appendChild(selectPhrase);
            panel.appendChild(btnLecture);
            panel.appendChild(btnReset);

            const footer = document.querySelector('.footer');
            if (footer && footer.parentNode) {
                footer.parentNode.insertBefore(panel, footer);
            } else {
                document.body.appendChild(panel);
            }

            this.panelLecteur = panel;
            this.selectPhrase = selectPhrase;
            this.btnLecture = btnLecture;
            this.btnReset = btnReset;

            this.mettreAJourListePhrases();
        }

        obtenirPhrasesDisponibles() {
            const corpus = window.ABE_CORPUS_ORAL;
            return (corpus && Array.isArray(corpus.phrases)) ? corpus.phrases : [];
        }

        mettreAJourListePhrases() {
            if (!this.selectPhrase) return;
            const phrases = this.obtenirPhrasesDisponibles();
            this.selectPhrase.innerHTML = '';

            if (phrases.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'Aucune phrase';
                this.selectPhrase.appendChild(opt);
                this.selectPhrase.disabled = true;
                return;
            }

            this.selectPhrase.disabled = false;
            phrases.forEach((_, index) => {
                const opt = document.createElement('option');
                opt.value = String(index);
                opt.textContent = `Phrase ${index + 1}`;
                this.selectPhrase.appendChild(opt);
            });

            if (this.indexPhraseCourante >= phrases.length || this.indexPhraseCourante < 0) {
                this.indexPhraseCourante = 0;
            }
            this.selectPhrase.value = String(this.indexPhraseCourante);
        }

        selectionnerPhraseParIndex(index, options = {}) {
            const phrases = this.obtenirPhrasesDisponibles();
            if (phrases.length === 0) {
                this.phraseCourante = '';
                return;
            }

            const idx = Math.max(0, Math.min(phrases.length - 1, Number(index) || 0));
            this.arreterLecture();
            this.indexPhraseCourante = idx;

            if (this.selectPhrase && this.selectPhrase.value !== String(idx)) {
                this.selectPhrase.value = String(idx);
            }

            this.definirPhraseCourante(phrases[idx]);

            const app = window.abeApp;
            if (options.reinitialiserInterface && app && typeof app.reinitialiser === 'function') {
                app.reinitialiser();
            } else if (app && typeof app.verrouillerSaisie === 'function') {
                app.verrouillerSaisie();
            }
        }

        async preparerPhraseInitiale() {
            const corpus = window.ABE_CORPUS_ORAL;
            if (corpus && typeof corpus.ensureLoaded === 'function') {
                await corpus.ensureLoaded();
            }
            this.mettreAJourListePhrases();
            this.selectionnerPhraseParIndex(0, { reinitialiserInterface: false });
        }

        basculerLecture() {
            if (!this.phraseCourante) {
                const phrases = this.obtenirPhrasesDisponibles();
                if (phrases.length > 0) {
                    this.selectionnerPhraseParIndex(0, { reinitialiserInterface: false });
                } else {
                    this.afficherMessage('Aucune phrase chargée pour cette dictée.', 'info');
                    return;
                }
            }

            if (this.enLecture) {
                this.arreterLecture();
            } else {
                // Déverrouille la zone de saisie dès que la lecture est lancée
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('abe-dictee-orale-demarree', {
                        detail: { phrase: this.phraseCourante, index: this.indexPhraseCourante }
                    }));
                }
                this.lirePhraseCourante();
            }
        }

        recommencer() {
            this.arreterLecture();
            const app = window.abeApp;
            if (app && typeof app.gererClicRecommencer === 'function') {
                app.gererClicRecommencer();
            } else if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('abe-reinitialiser'));
            }
        }

        definirPhraseCourante(phrase) {
            const normalisee = String(phrase || '').trim();
            if (!normalisee) return;
            this.phraseCourante = normalisee;
        }

        lirePhraseCourante() {
            if (!this.synthese || typeof SpeechSynthesisUtterance === 'undefined') {
                this.afficherMessage('La synthèse vocale n\'est pas disponible sur ce navigateur.', 'info');
                return;
            }

            if (!this.phraseCourante) return;

            this.synthese.cancel();

            const texteSynthese = (typeof window !== 'undefined'
                && window.AbeSpeechUtils
                && typeof window.AbeSpeechUtils.preparerTexteSynthese === 'function')
                ? window.AbeSpeechUtils.preparerTexteSynthese(this.phraseCourante)
                : this.phraseCourante;
            const utterance = new SpeechSynthesisUtterance(texteSynthese);
            utterance.lang = 'fr-FR';
            utterance.rate = NORMAL_RATE;
            utterance.pitch = 1;

            if (window.AbeSpeechUtils && typeof window.AbeSpeechUtils.obtenirMeilleureVoixFrancaise === 'function') {
                const meilleureVoix = window.AbeSpeechUtils.obtenirMeilleureVoixFrancaise(this.synthese);
                if (meilleureVoix) {
                    utterance.voice = meilleureVoix;
                }
            }

            utterance.onstart = () => {
                this.enLecture = true;
                this.utteranceActive = utterance;
                this.mettreAJourBoutonLecture(true);
            };

            utterance.onend = () => {
                this.enLecture = false;
                this.utteranceActive = null;
                this.mettreAJourBoutonLecture(false);
            };

            utterance.onerror = () => {
                this.enLecture = false;
                this.utteranceActive = null;
                this.mettreAJourBoutonLecture(false);
            };

            this.synthese.speak(utterance);
        }

        arreterLecture() {
            if (this.synthese) {
                this.synthese.cancel();
            }
            this.enLecture = false;
            this.utteranceActive = null;
            this.mettreAJourBoutonLecture(false);
        }

        mettreAJourBoutonLecture(enCours) {
            if (!this.btnLecture) return;
            const iconSpan = this.btnLecture.querySelector('.abe-oral-btn-icon');
            const labelSpan = this.btnLecture.querySelector('.abe-oral-btn-label');
            if (enCours) {
                this.btnLecture.classList.add('playing');
                if (iconSpan) iconSpan.textContent = '⏹';
                if (labelSpan) labelSpan.textContent = 'Arrêter';
                this.btnLecture.title = 'Arrêter la lecture';
                this.btnLecture.setAttribute('aria-label', 'Arrêter la lecture');
            } else {
                this.btnLecture.classList.remove('playing');
                if (iconSpan) iconSpan.textContent = '▶';
                if (labelSpan) labelSpan.textContent = 'Écouter';
                this.btnLecture.title = 'Écouter la phrase';
                this.btnLecture.setAttribute('aria-label', 'Écouter la phrase');
            }
        }

        reinitialiserLecteur() {
            this.arreterLecture();
        }

        afficherMessage(message, type) {
            const app = window.abeApp;
            if (app && typeof app.afficherMessage === 'function') {
                app.afficherMessage(message, type || 'info');
                return;
            }
            console.log(message);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const lecteur = new AbeLecteurOral();
        lecteur.initialiser();
        window.abeLecteurOral = lecteur;
    });
})();
