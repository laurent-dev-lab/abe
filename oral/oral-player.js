(function () {
    'use strict';

    const NORMAL_RATE = 0.79;
    const PHRASES_RECENTES_MAX = 100;
    const STORAGE_VALIDATED_KEY = 'abe_oral_phrases_validees_v1';
    const STORAGE_RECENTS_KEY = 'abe_oral_phrases_recentes_v1';

    function normaliserPhraseSession(phrase) {
        return String(phrase || '')
            .replace(/([ldjnmtsqcLDJNMTSQC]|qu|Qu|QU)['’]\s+/g, "$1'")
            .replace(/\s+/g, ' ')
            .replace(/\s+([.,;:!?])/g, '$1')
            .trim()
            .toLowerCase();
    }

    function getStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('__abe_test__', '1');
                localStorage.removeItem('__abe_test__');
                return localStorage;
            }
        } catch {
            // fallback
        }
        try {
            if (typeof sessionStorage !== 'undefined') return sessionStorage;
        } catch {
            // fallback
        }
        return null;
    }

    class AbeLecteurOral {
        constructor() {
            this.synthese = typeof window !== 'undefined' && 'speechSynthesis' in window
                ? window.speechSynthesis
                : null;

            this.phraseCourante = '';
            this.enLecture = false;
            this.utteranceActive = null;
            this.phrasesRecentes = [];
            this.phrasesValidees = new Set();

            this.panelLecteur = null;
            this.btnLecture = null;
            this.btnRandom = null;
            this.btnReset = null;
        }

        async initialiser() {
            this.chargerPhrasesValidees();
            this.chargerPhrasesRecentes();
            this.creerLecteur();
            await this.preparerPhraseInitiale();

            window.addEventListener('abe-dictee-orale-phrase-validee', (event) => {
                const phrase = event && event.detail ? event.detail.phrase : '';
                this.marquerPhraseValidee(phrase);
            });
            window.addEventListener('abe-reinitialiser', () => {
                this.reinitialiserLecteur();
            });
        }

        chargerPhrasesValidees() {
            try {
                const storage = getStorage();
                if (!storage) return;
                const brut = storage.getItem(STORAGE_VALIDATED_KEY);
                if (!brut) return;
                const liste = JSON.parse(brut);
                if (!Array.isArray(liste)) return;
                this.phrasesValidees = new Set(
                    liste
                        .map((p) => normaliserPhraseSession(p))
                        .filter(Boolean)
                );
            } catch {
                this.phrasesValidees = new Set();
            }
        }

        chargerPhrasesRecentes() {
            try {
                const storage = getStorage();
                if (!storage) return;
                const brut = storage.getItem(STORAGE_RECENTS_KEY);
                if (!brut) return;
                const liste = JSON.parse(brut);
                if (!Array.isArray(liste)) return;
                this.phrasesRecentes = liste
                    .map((p) => normaliserPhraseSession(p))
                    .filter(Boolean)
                    .slice(0, PHRASES_RECENTES_MAX);
            } catch {
                this.phrasesRecentes = [];
            }
        }

        sauvegarderPhrasesValidees() {
            try {
                const storage = getStorage();
                if (!storage) return;
                storage.setItem(STORAGE_VALIDATED_KEY, JSON.stringify(Array.from(this.phrasesValidees)));
            } catch {
                // ignore
            }
        }

        sauvegarderPhrasesRecentes() {
            try {
                const storage = getStorage();
                if (!storage) return;
                storage.setItem(STORAGE_RECENTS_KEY, JSON.stringify(this.phrasesRecentes));
            } catch {
                // ignore
            }
        }

        marquerPhraseValidee(phrase) {
            const normalisee = normaliserPhraseSession(phrase);
            if (!normalisee) return;
            this.phrasesValidees.add(normalisee);

            // Vérifier si toutes les phrases du corpus ont été validées
            const corpus = window.ABE_CORPUS_ORAL;
            const totalPhrases = (corpus && Array.isArray(corpus.phrases) && corpus.phrases.length > 0)
                ? corpus.phrases.length
                : 90;

            if (this.phrasesValidees.size >= totalPhrases) {
                // Grand cycle achevé ! On réinitialise pour recommencer un nouveau tour complet
                this.phrasesValidees.clear();
                this.phrasesRecentes = [];
                this.sauvegarderPhrasesRecentes();
            }

            this.sauvegarderPhrasesValidees();
        }

        creerLecteur() {
            const panel = document.createElement('div');
            panel.className = 'abe-oral-player';
            panel.setAttribute('role', 'toolbar');
            panel.setAttribute('aria-label', 'Télécommande dictée');

            // 1. Bouton Lecture / Pause
            const btnLecture = document.createElement('button');
            btnLecture.type = 'button';
            btnLecture.className = 'abe-oral-icon-btn abe-oral-btn-play';
            btnLecture.title = 'Écouter la phrase';
            btnLecture.setAttribute('aria-label', 'Écouter la phrase');
            btnLecture.innerHTML = '<span class="abe-oral-btn-icon">▶</span><span class="abe-oral-btn-label">Écouter</span>';
            btnLecture.addEventListener('click', () => this.basculerLecture());

            // 2. Bouton Aléatoire / Changer de phrase
            const btnRandom = document.createElement('button');
            btnRandom.type = 'button';
            btnRandom.className = 'abe-oral-icon-btn abe-oral-btn-random';
            btnRandom.title = 'Changer de phrase (aléatoire)';
            btnRandom.setAttribute('aria-label', 'Changer de phrase (aléatoire)');
            btnRandom.innerHTML = '<span class="abe-oral-btn-icon">🔀</span><span class="abe-oral-btn-label">Autre phrase</span>';
            btnRandom.addEventListener('click', () => this.changerPhrase());

            // 3. Bouton RAZ / Recommencer
            const btnReset = document.createElement('button');
            btnReset.type = 'button';
            btnReset.className = 'abe-oral-icon-btn abe-oral-btn-reset';
            btnReset.title = 'Recommencer (RAZ)';
            btnReset.setAttribute('aria-label', 'Recommencer (RAZ)');
            btnReset.innerHTML = '<span class="abe-oral-btn-icon">🔄</span><span class="abe-oral-btn-label">Recommencer</span>';
            btnReset.addEventListener('click', () => this.recommencer());

            panel.appendChild(btnLecture);
            panel.appendChild(btnRandom);
            panel.appendChild(btnReset);

            const footer = document.querySelector('.footer');
            if (footer && footer.parentNode) {
                footer.parentNode.insertBefore(panel, footer);
            } else {
                document.body.appendChild(panel);
            }

            this.panelLecteur = panel;
            this.btnLecture = btnLecture;
            this.btnRandom = btnRandom;
            this.btnReset = btnReset;
        }

        async preparerPhraseInitiale() {
            const corpus = window.ABE_CORPUS_ORAL;
            if (corpus && typeof corpus.ensureLoaded === 'function') {
                await corpus.ensureLoaded();
            }
            let exclusions = this.obtenirExclusionsPhrases();
            let phrase = corpus && typeof corpus.getSecureRandomPhrase === 'function'
                ? corpus.getSecureRandomPhrase(exclusions)
                : '';

            if (!phrase) {
                this.phrasesValidees.clear();
                this.sauvegarderPhrasesValidees();
                exclusions = [this.phraseCourante].filter(Boolean);
                phrase = corpus && typeof corpus.getSecureRandomPhrase === 'function'
                    ? corpus.getSecureRandomPhrase(exclusions)
                    : '';
            }

            if (phrase) {
                this.definirPhraseCourante(phrase);
                // On prépare la phrase sans la lire et sans déverrouiller la saisie
                const app = window.abeApp;
                if (app && typeof app.verrouillerSaisie === 'function') {
                    app.verrouillerSaisie();
                }
            }
        }

        basculerLecture() {
            if (!this.phraseCourante) {
                this.changerPhrase();
                return;
            }

            if (this.enLecture) {
                this.arreterLecture();
            } else {
                // Déverrouille la zone de saisie dès que la lecture est lancée
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('abe-dictee-orale-demarree', {
                        detail: { phrase: this.phraseCourante }
                    }));
                }
                this.lirePhraseCourante();
            }
        }

        async changerPhrase() {
            const corpus = window.ABE_CORPUS_ORAL;
            if (corpus && typeof corpus.ensureLoaded === 'function') {
                await corpus.ensureLoaded();
            }
            let exclusions = this.obtenirExclusionsPhrases();
            let prochaine = corpus && typeof corpus.getSecureRandomPhrase === 'function'
                ? corpus.getSecureRandomPhrase(exclusions)
                : '';

            if (!prochaine) {
                // Toutes les phrases du cycle ont été faites ! On entame un nouveau cycle
                this.phrasesValidees.clear();
                this.sauvegarderPhrasesValidees();
                exclusions = [this.phraseCourante].filter(Boolean);
                prochaine = corpus && typeof corpus.getSecureRandomPhrase === 'function'
                    ? corpus.getSecureRandomPhrase(exclusions)
                    : '';
            }

            if (!prochaine) {
                this.afficherMessage('Aucune phrase disponible dans le corpus.', 'info');
                return;
            }

            this.definirPhraseCourante(prochaine);
            this.arreterLecture();

            const app = window.abeApp;
            if (app && app.sentenceInput) {
                app.sentenceInput.value = '';
            }

            // Déverrouiller la saisie pour la nouvelle phrase
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('abe-dictee-orale-demarree', {
                    detail: { phrase: prochaine }
                }));
            }

            // Lancer immédiatement la lecture audio de la nouvelle phrase
            this.lirePhraseCourante();
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

        obtenirExclusionsPhrases() {
            const exclusions = [];
            if (this.phraseCourante) exclusions.push(this.phraseCourante);
            exclusions.push(...this.phrasesRecentes);
            exclusions.push(...Array.from(this.phrasesValidees));
            return exclusions;
        }

        definirPhraseCourante(phrase) {
            const normalisee = String(phrase || '').trim();
            if (!normalisee) return;

            this.phraseCourante = normalisee;
            this.phrasesRecentes = [normalisee, ...this.phrasesRecentes.filter((p) => p !== normalisee)]
                .slice(0, PHRASES_RECENTES_MAX);
            this.sauvegarderPhrasesRecentes();
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
