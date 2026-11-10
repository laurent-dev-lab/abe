/**
 * Jeu de reconstruction de mot invariable : l'élève complète lettre par lettre.
 */
(function (global) {
    'use strict';

    class JeuMotInvariable {
        /**
         * @param {object} options
         * @param {object} options.analyseur  - Instance de l'analyseur (pour estMotInvariable)
         * @param {function} options.onCorrige     - Appelé avec la correction quand le mot est reconstruit
         * @param {function} options.onAffiche     - Appelé pour rafraîchir l'affichage (this.afficherJeuMotInvariable)
         * @param {function} options.onMessage     - Appelé avec (message, type) pour afficher un feedback
         * @param {function} options.onTermine     - Appelé quand le jeu est fini (pour afficher explication, félicitations)
         */
        constructor(options = {}) {
            this.analyseur = options.analyseur || null;
            this.onCorrige = options.onCorrige || (() => {});
            this.onAffiche = options.onAffiche || (() => {});
            this.onMessage = options.onMessage || (() => {});
            this.onTermine = options.onTermine || (() => {});
            this.estSectionVisible = options.estSectionVisible || (() => true);

            this.etat = null;
            this._handleKeydown = (event) => this.gererClavier(event);
        }

        normaliserCaractere(caractere) {
            return String(caractere || '')
                .toLocaleLowerCase('fr-FR')
                .replace(/[’]/g, "'");
        }

        estCaractereAutorise(caractere) {
            return /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]$/.test(String(caractere || ''));
        }

        // --- Déclenchement ---

        estMotAttenduInvariable(motAttendu) {
            const cible = String(motAttendu || '').trim();
            if (!cible || !this.analyseur) return false;
            if (typeof this.analyseur.estMotInvariable === 'function') {
                try { return !!this.analyseur.estMotInvariable(cible); }
                catch { return false; }
            }
            return false;
        }

        doitDeclencher(erreurActuelle) {
            if (!erreurActuelle) return false;
            const motUtilisateur = String(erreurActuelle.mot || '').trim();
            const motAttendu = String(erreurActuelle.correction || '').trim();
            if (!motUtilisateur || !motAttendu) return false;
            if (motUtilisateur.toLocaleLowerCase('fr-FR') === motAttendu.toLocaleLowerCase('fr-FR')) return false;
            if (motUtilisateur.length > motAttendu.length) return false;
            if (
                erreurActuelle.parcoursType === 'oubli_lettre_interne' ||
                erreurActuelle.type === 'oubli_lettre_interne'
            ) {
                return true;
            }
            return this.estMotAttenduInvariable(motAttendu);
        }

        // --- Initialisation ---

        initialiser(erreurActuelle) {
            const motUtilisateur = String(erreurActuelle && erreurActuelle.mot ? erreurActuelle.mot : '').trim();
            const motAttendu = String(erreurActuelle && erreurActuelle.correction ? erreurActuelle.correction : '').trim();
            const lettresAttendu = Array.from(motAttendu);
            const lettresUtilisateur = Array.from(motUtilisateur);
            const n = lettresAttendu.length;
            const m = lettresUtilisateur.length;

            // Alignement intelligent préfixe + suffixe (+ sous-séquence interne)
            // afin que "sis" pour "suis" affiche bien "s _ i s" et "toujou" pour "toujours" affiche "t o u j o u _ _".
            const indicesReveles = new Set();
            let prefixLen = 0;
            while (
                prefixLen < m &&
                prefixLen < n &&
                this.normaliserCaractere(lettresUtilisateur[prefixLen]) === this.normaliserCaractere(lettresAttendu[prefixLen])
            ) {
                indicesReveles.add(prefixLen);
                prefixLen += 1;
            }

            let suffixLen = 0;
            while (
                suffixLen < (m - prefixLen) &&
                suffixLen < (n - prefixLen) &&
                this.normaliserCaractere(lettresUtilisateur[m - 1 - suffixLen]) === this.normaliserCaractere(lettresAttendu[n - 1 - suffixLen])
            ) {
                indicesReveles.add(n - 1 - suffixLen);
                suffixLen += 1;
            }

            // S'il reste des lettres utilisateur entre le préfixe et le suffixe, les aligner dans l'ordre
            let idxUser = prefixLen;
            const limiteUser = m - suffixLen;
            const limiteAttendu = n - suffixLen;
            for (let idxAtt = prefixLen; idxAtt < limiteAttendu && idxUser < limiteUser; idxAtt += 1) {
                if (this.normaliserCaractere(lettresUtilisateur[idxUser]) === this.normaliserCaractere(lettresAttendu[idxAtt])) {
                    indicesReveles.add(idxAtt);
                    idxUser += 1;
                }
            }

            const slots = lettresAttendu.map((lettreAttendue, index) => {
                const correcte = indicesReveles.has(index);
                return {
                    attendu: lettreAttendue,
                    valeur: correcte ? lettreAttendue : '',
                    revele: !!correcte,
                    statut: correcte ? 'correct' : 'pending',
                    essais: 0
                };
            });

            const premierTrou = slots.findIndex((slot) => !slot.revele);
            this.etat = {
                motUtilisateur,
                motAttendu,
                slots,
                indexActif: premierTrou >= 0 ? premierTrou : 0,
                termine: slots.every((slot) => slot.revele)
            };
        }

        // --- Activation / désactivation clavier ---

        activer() {
            this.desactiver();
            if (typeof window !== 'undefined') {
                window.addEventListener('keydown', this._handleKeydown);
            }
        }

        desactiver() {
            if (typeof window !== 'undefined') {
                window.removeEventListener('keydown', this._handleKeydown);
            }
        }

        reinitialiser() {
            this.desactiver();
            this.etat = null;
        }

        // --- Navigation des trous ---

        trouverIndexTrouSuivant(depart = 0) {
            if (!this.etat || !Array.isArray(this.etat.slots)) return -1;
            for (let i = Math.max(0, depart); i < this.etat.slots.length; i += 1) {
                if (!this.etat.slots[i].revele) return i;
            }
            for (let i = 0; i < Math.max(0, depart); i += 1) {
                if (!this.etat.slots[i].revele) return i;
            }
            return -1;
        }

        marquerSlotActif(index) {
            if (!this.etat) return;
            this.etat.indexActif = index;
            this.onAffiche();
        }

        // --- Finalisation ---

        finaliser() {
            if (!this.etat || this.etat.termine) return;
            this.etat.termine = true;
            this.desactiver();

            const correction = this.etat.motAttendu;
            this.onCorrige(correction);
            this.onMessage('Bravo, tu as reconstruit le mot !', 'success');

            setTimeout(() => {
                this.etat = null;
                this.onTermine();
            }, 500);
        }

        traiterPropositionCaractere(touche) {
            if (!this.etat || this.etat.termine) return;
            if (!this.estCaractereAutorise(touche)) return;

            const index = this.etat.indexActif;
            const slot = this.etat.slots[index];
            if (!slot || slot.revele) return;

            const proposition = this.normaliserCaractere(touche);
            const attendu = this.normaliserCaractere(slot.attendu);

            if (proposition === attendu) {
                slot.valeur = slot.attendu;
                slot.revele = true;
                slot.statut = 'correct';

                const suivant = this.trouverIndexTrouSuivant(index + 1);
                if (suivant < 0) {
                    this.onAffiche();
                    this.finaliser();
                    return;
                }
                this.etat.indexActif = suivant;
                this.onAffiche();
                return;
            }

            slot.essais += 1;
            slot.valeur = touche;
            slot.statut = 'wrong';
            this.onAffiche();

            if (slot.essais >= 3) {
                slot.valeur = slot.attendu;
                slot.revele = true;
                slot.statut = 'hint';

                const suivant = this.trouverIndexTrouSuivant(index + 1);
                if (suivant < 0) {
                    this.onAffiche();
                    this.finaliser();
                    return;
                }
                this.etat.indexActif = suivant;
                this.onAffiche();
                return;
            }

            setTimeout(() => {
                if (!this.etat || this.etat.termine) return;
                const slotCourant = this.etat.slots[index];
                if (!slotCourant || slotCourant.revele) return;
                slotCourant.valeur = '';
                slotCourant.statut = 'pending';
                this.onAffiche();
            }, 260);
        }

        // --- Gestion clavier ---

        gererClavier(event) {
            if (!this.etat || this.etat.termine) return;
            if (!this.estSectionVisible()) return;

            const touche = String(event.key || '');
            if (!this.estCaractereAutorise(touche)) return;
            event.preventDefault();
            this.traiterPropositionCaractere(touche);
        }

        // --- Rendu DOM ---

        rendre(answerOptions, questionText, erreurActuelle) {
            if (!this.etat || !answerOptions) return;

            questionText.classList.add('hidden');
            questionText.innerHTML = '';
            answerOptions.innerHTML = '';

            const cadre = document.createElement('div');
            cadre.className = 'invariable-game';

            const estMotManquant = Boolean(erreurActuelle && erreurActuelle.type === 'reference_orale_mot_manquant');
            const estOubliLettreInterne = Boolean(
                erreurActuelle &&
                (erreurActuelle.parcoursType === 'oubli_lettre_interne' || erreurActuelle.type === 'oubli_lettre_interne')
            );

            const titre = document.createElement('h4');
            titre.className = 'invariable-game-title';
            titre.textContent = estMotManquant
                ? 'Il manque un mot'
                : estOubliLettreInterne
                    ? 'Lettre manquante dans ce mot'
                    : 'Tu y es presque...';
            cadre.appendChild(titre);

            const intro = document.createElement('p');
            intro.className = 'invariable-game-intro';
            if (estMotManquant) {
                intro.innerHTML = 'Il manque un mot (ou plusieurs mots) dans la phrase attendue,<br>merci de la réécouter et de saisir le (ou les) mot(s) manquant(s) ci-dessous.';
            } else if (estOubliLettreInterne) {
                intro.textContent = 'Il manque une lettre dans ce mot, écoute à nouveau la dictée et corrige ton oubli :';
            } else {
                intro.textContent = 'Complète le mot invariable lettre par lettre (au clavier ou en cliquant sur les lettres) :';
            }
            cadre.appendChild(intro);

            const slots = document.createElement('div');
            slots.className = 'invariable-slots';

            this.etat.slots.forEach((slot, index) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'invariable-slot';
                if (slot.statut) btn.classList.add(`is-${slot.statut}`);
                if (index === this.etat.indexActif && !slot.revele) {
                    btn.classList.add('is-active');
                }

                btn.textContent = slot.valeur || '_';
                btn.disabled = !!slot.revele;
                btn.setAttribute('aria-label', `Lettre ${index + 1}: ${slot.valeur || 'à deviner'}`);
                btn.addEventListener('click', () => {
                    if (!slot.revele) this.marquerSlotActif(index);
                });

                slots.appendChild(btn);
            });
            cadre.appendChild(slots);

            const indexActif = this.etat.indexActif;
            const slotActif = this.etat.slots[indexActif] || null;
            if (slotActif && !slotActif.revele) {
                const essaisRestants = Math.max(0, 3 - slotActif.essais);
                const indicateur = document.createElement('div');
                indicateur.className = 'invariable-attempts';

                for (let i = 0; i < 3; i += 1) {
                    const point = document.createElement('span');
                    point.className = 'invariable-attempt-dot';
                    if (i >= essaisRestants) point.classList.add('off');
                    indicateur.appendChild(point);
                }

                cadre.appendChild(indicateur);
            }

            // Clavier virtuel accessible
            const rangeesClavier = [
                ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
                ['w', 'x', 'c', 'v', 'b', 'n', "'", 'é', 'è', 'à', 'ç']
            ];

            const conteneurClavier = document.createElement('div');
            conteneurClavier.className = 'invariable-virtual-keyboard';

            rangeesClavier.forEach((rangee) => {
                const ligneEl = document.createElement('div');
                ligneEl.className = 'virtual-keyboard-row';
                rangee.forEach((lettre) => {
                    const btnLettre = document.createElement('button');
                    btnLettre.type = 'button';
                    btnLettre.className = 'virtual-key-btn';
                    btnLettre.textContent = lettre;
                    btnLettre.setAttribute('aria-label', `Lettre ${lettre}`);
                    btnLettre.addEventListener('click', () => {
                        this.traiterPropositionCaractere(lettre);
                    });
                    ligneEl.appendChild(btnLettre);
                });
                conteneurClavier.appendChild(ligneEl);
            });

            cadre.appendChild(conteneurClavier);

            answerOptions.appendChild(cadre);
            this.activer();
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { JeuMotInvariable };
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.JeuMotInvariable = JeuMotInvariable;
    }
    if (typeof window !== 'undefined') {
        window.JeuMotInvariable = JeuMotInvariable;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

