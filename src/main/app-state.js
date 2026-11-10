(function (global) {
    const api = {
        verrouillerSaisie() {
            if (this.sentenceInput) {
                this.sentenceInput.disabled = true;
                this.sentenceInput.placeholder = 'Clique sur ▶ dans la télécommande pour écouter la phrase...';
            }
            if (this.validateBtn) {
                this.validateBtn.disabled = true;
            }
        },

        deverrouillerSaisie() {
            if (this.sentenceInput) {
                this.sentenceInput.disabled = false;
                this.sentenceInput.placeholder = 'Écris la phrase dictée ici...';
                this.sentenceInput.focus();
            }
            if (this.validateBtn) {
                this.validateBtn.disabled = false;
            }
        },

        lireSessionNumber(key, defaut) {
            try {
                const v = sessionStorage.getItem(key);
                const n = Number.parseInt(v, 10);
                return Number.isFinite(n) ? n : defaut;
            } catch {
                return defaut;
            }
        },

        ecrireSessionNumber(key, value) {
            try {
                sessionStorage.setItem(key, String(value));
            } catch {
                // ignore
            }
        },

        ajouterErreursTrouveesSession(nombre) {
            this.sessionTotalErreursTrouvees += nombre;
            this.ecrireSessionNumber('abe_total_erreurs_trouvees', this.sessionTotalErreursTrouvees);
        },

        ajouterErreurCorrigeeSession(uniqueKey) {
            if (uniqueKey && this.sessionCorrectionsUniques.has(uniqueKey)) {
                return;
            }
            if (uniqueKey) {
                this.sessionCorrectionsUniques.add(uniqueKey);
            }
            this.sessionTotalErreursCorrigees += 1;
            this.ecrireSessionNumber('abe_total_erreurs_corrigees', this.sessionTotalErreursCorrigees);
        },

        obtenirCleErreur(erreur = this.erreurActuelle) {
            if (!erreur) return null;
            const indexMot = typeof erreur.indexDebut === 'number'
                ? erreur.indexDebut
                : (typeof erreur.indexMot === 'number' ? erreur.indexMot : erreur.position);
            if (typeof indexMot !== 'number') return null;
            return `${this.phraseActuelle}|${indexMot}|${erreur.type}`;
        },

        estErreurCorrigee(erreur) {
            const cle = this.obtenirCleErreur(erreur);
            return !!cle && this.erreursCorrigees.has(cle);
        },

        obtenirPrioriteErreur(erreur) {
            if (!erreur) return 50;
            const type = String(erreur.type || '');
            const parcoursType = String(erreur.parcoursType || '');
            const titreAide = String(erreur.titreAide || '').toLowerCase();
            const explication = String(erreur.explication || '').toLowerCase();

            // Les homophones passent en priorité absolue (priorité 0) sur toutes les autres corrections
            const estHomophone = type.startsWith('homophone_')
                || parcoursType.startsWith('homophone_')
                || titreAide.includes('homophone')
                || explication.includes('homophone')
                || type === 'homophone'
                || type === 'homophone_contextuel'
                || parcoursType === 'leur_leurs'
                || type === 'leur_leurs';

            if (estHomophone) {
                return 0;
            }

            const priorites = {
                accord_nom_nombre: 1,
                accord_determinant_nom: 2,
                accord_adjectif_nom: 3,
                accord_sujet_verbe: 4,
                accord_sujet_participe: 4,
                accord_au_aux: 4,
                invariable_s_fantome: 5,
                mot_liaison_lexical: 6,
                locution_mal_segmentee: 7,
                oralite_familiere: 8,
                segmentation_mot_colle: 9,
                metathese: 10,
                lettre_fantome_finale: 11,
                consonne_muette_finale: 3,
                conjugaison_verbe: 12,
                mot_invariable: 13,
                mot_inconnu: 14,
                reference_orale_mot_manquant: 97,
                ponctuation_finale: 98,
                majuscule_phrase: 99
            };

            if (parcoursType && Object.prototype.hasOwnProperty.call(priorites, parcoursType)) {
                return priorites[parcoursType];
            }

            return Object.prototype.hasOwnProperty.call(priorites, type)
                ? priorites[type]
                : 50;
        },

        comparerErreurs(a, b) {
            const pa = this.obtenirPrioriteErreur(a);
            const pb = this.obtenirPrioriteErreur(b);
            if (pa !== pb) return pa - pb;

            const ia = typeof (a && a.position) === 'number' ? a.position : 9999;
            const ib = typeof (b && b.position) === 'number' ? b.position : 9999;
            return ia - ib;
        },

        ordonnerErreursPourCorrection(liste) {
            if (!Array.isArray(liste)) return [];
            return [...liste].filter(Boolean).sort((a, b) => this.comparerErreurs(a, b));
        },

        estErreurActionnable(erreur) {
            if (!erreur || !erreur.type) return false;
            if (erreur.type === 'mot_inconnu') return true;

            const correction = typeof erreur.correction === 'string' ? erreur.correction.trim() : '';
            if (!correction) return false;

            const mot = typeof erreur.mot === 'string' ? erreur.mot.trim() : '';
            const normaliser = (s) => String(s || '').toLowerCase().trim();
            if (
                mot
                && !['ponctuation_finale', 'majuscule_phrase'].includes(erreur.type)
                && normaliser(correction) === normaliser(mot)
            ) {
                return false;
            }

            return true;
        },

        filtrerErreursActionnables(liste) {
            if (!Array.isArray(liste)) return [];
            return liste.filter((erreur) => this.estErreurActionnable(erreur));
        },

        obtenirSpanErreur(erreur = this.erreurActuelle) {
            if (!erreur) return null;
            const debut = typeof erreur.indexDebut === 'number'
                ? erreur.indexDebut
                : (typeof erreur.indexMot === 'number' ? erreur.indexMot : erreur.position);
            const longueur = Number.isInteger(erreur.spanLongueur) && erreur.spanLongueur > 0
                ? erreur.spanLongueur
                : 1;
            if (typeof debut !== 'number') return null;
            return { debut, longueur };
        },

        obtenirErreursNonCorrigees() {
            if (!Array.isArray(this.erreurs) || this.erreurs.length === 0) return [];
            return this.erreurs.filter((erreur) => !this.estErreurCorrigee(erreur));
        },

        doitConfirmerReinitialisation() {
            if (!Array.isArray(this.erreurs) || this.erreurs.length === 0) {
                return false;
            }
            return this.obtenirErreursNonCorrigees().length > 0;
        },

        nettoyerEtatModaleReinitialisation() {
            this.modaleReinitialisationOuverte = false;
            this.reinitialisationErreursRestantes = 0;
            if (this.modalReinitialisationTexte) {
                this.modalReinitialisationTexte.textContent = this.messageParDefautModaleReinitialisation;
            }
        },

        confirmerReinitialisationDepuisModale() {
            this.fermerModaleReinitialisation();
            this.reinitialiser();
        },

        gererClicRecommencer() {
            if (this.doitConfirmerReinitialisation()) {
                this.montrerModaleReinitialisation();
                return;
            }
            this.reinitialiser();
        }
    };

    global.AbeMainAppState = api;
})(typeof window !== 'undefined' ? window : globalThis);
