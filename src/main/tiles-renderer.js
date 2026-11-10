(function (global) {
    const api = {
        afficherTuiles() {
            this.wordsContainer.innerHTML = '';

            const erreursMotManquant = (this.erreurs || []).filter((erreur) => erreur && erreur.type === 'reference_orale_mot_manquant' && !this.estErreurCorrigee(erreur));
            const erreursManquantesParIndex = new Map();
            erreursMotManquant.forEach((erreur) => {
                const index = typeof erreur.indexDebut === 'number'
                    ? erreur.indexDebut
                    : (typeof erreur.position === 'number' ? erreur.position : -1);
                if (index < 0) return;
                if (!erreursManquantesParIndex.has(index)) {
                    erreursManquantesParIndex.set(index, []);
                }
                erreursManquantesParIndex.get(index).push(erreur);
            });

            const insererTuileMotManquant = (erreur) => {
                const tuile = document.createElement('div');
                tuile.className = 'word-tile missing-word-tile error';
                tuile.innerHTML = '<span class="missing-word-icon" aria-hidden="true">+</span><span class="sr-only">Mot manquant</span>';
                tuile.dataset.extraErrorKey = this.obtenirCleErreur(erreur);
                tuile.setAttribute('aria-label', 'Un mot est manquant, clique pour l’écrire');
                tuile.title = 'Il manque un mot ici. Clique pour le compléter.';
                tuile.addEventListener('click', () => this.selectionnerErreurDirecte(erreur, tuile));
                this.wordsContainer.appendChild(tuile);
            };

            const creerTuileMot = (mot, saisieIdx) => {
                const tuile = document.createElement('div');
                tuile.className = 'word-tile';
                tuile.textContent = mot.texte;
                tuile.dataset.index = saisieIdx;

                const erreursActives = (mot.erreurs || []).filter((erreur) => !this.estErreurCorrigee(erreur) && erreur.type !== 'ponctuation_finale');

                if (erreursActives.length > 0) {
                    tuile.classList.add('error');
                    if (erreursActives.some((erreur) => erreur && erreur.type === 'majuscule_phrase')) {
                        tuile.classList.add('initial-cap-alert');
                    }
                    tuile.addEventListener('click', () => this.selectionnerMot(saisieIdx));
                }

                this.wordsContainer.appendChild(tuile);
            };

            const entreeCorpus = this.obtenirEntreeCorpusDetailleReference();
            const corpusTokens = entreeCorpus && Array.isArray(entreeCorpus.tokensLexicaux) ? entreeCorpus.tokensLexicaux : null;

            if (corpusTokens && corpusTokens.length > 0) {
                const alignement = (typeof this.calculerAlignementLexical === 'function')
                    ? this.calculerAlignementLexical(this.motsAnalyse || [], corpusTokens)
                    : null;
                const operations = Array.isArray(alignement && alignement.operations) ? alignement.operations : [];
                const referenceMeta = Array.isArray(alignement && alignement.reference) ? alignement.reference : [];
                const saisisMeta = Array.isArray(alignement && alignement.saisis) ? alignement.saisis : [];
                const omissionsAlignement = Array.isArray(alignement && alignement.omissions) ? alignement.omissions : [];

                const indicesOmis = new Set(
                    erreursMotManquant
                        .map((e) => {
                            const idx = typeof e.indexDebut === 'number'
                                ? e.indexDebut
                                : (typeof e.position === 'number' ? e.position : -1);
                            return idx;
                        })
                        .filter((idx) => idx >= 0)
                );

                omissionsAlignement.forEach((omission) => {
                    if (omission && Number.isInteger(omission.indexMotOmis) && omission.indexMotOmis >= 0) {
                        indicesOmis.add(omission.indexMotOmis);
                    }
                });

                const corpusVersSaisie = new Map();
                const saisisMappes = new Set();

                operations.forEach((op) => {
                    if (!op) return;
                    if (op.type !== 'match' && op.type !== 'replace') return;

                    const refMeta = referenceMeta[op.referenceIndex] || null;
                    const saisiMeta = saisisMeta[op.saisiIndex] || null;
                    if (!refMeta || !saisiMeta) return;
                    const idxSaisiMots = Number.isInteger(saisiMeta.rawIndex) ? saisiMeta.rawIndex : saisiMeta.indexMot;
                    if (!Number.isInteger(refMeta.indexMot) || !Number.isInteger(idxSaisiMots)) return;

                    corpusVersSaisie.set(refMeta.indexMot, idxSaisiMots);
                });

                let prochainSaisiIdx = 0;

                for (let ci = 0; ci < corpusTokens.length; ci++) {
                    if (indicesOmis.has(ci)) {
                        const erreursIci = erreursManquantesParIndex.get(ci) || [];
                        if (erreursIci.length > 0) {
                            erreursIci.forEach((erreur) => insererTuileMotManquant(erreur));
                        } else {
                            const tokenAttendu = corpusTokens[ci] || null;
                            const errSynth = (typeof this.construireErreurMotManquantReference === 'function')
                                ? this.construireErreurMotManquantReference(ci, tokenAttendu)
                                : {
                                    type: 'reference_orale_mot_manquant',
                                    position: ci,
                                    indexDebut: ci,
                                    indexFin: ci,
                                    mot: '',
                                    correction: tokenAttendu ? tokenAttendu.texte : '',
                                    explication: 'Un mot est manquant ici.',
                                    titreAide: 'Mot manquant'
                                };
                            if (!this.erreurs.some((e) => e && e.type === 'reference_orale_mot_manquant' && (e.indexDebut === ci || e.position === ci))) {
                                this.erreurs.push(errSynth);
                            }
                            insererTuileMotManquant(errSynth);
                        }
                        continue;
                    }

                    const saisieIdx = corpusVersSaisie.get(ci);

                    if (Number.isInteger(saisieIdx) && saisieIdx >= 0) {
                        while (prochainSaisiIdx < saisieIdx) {
                            if (!saisisMappes.has(prochainSaisiIdx)) {
                                const motInter = this.motsAnalyse[prochainSaisiIdx];
                                if (motInter) {
                                    creerTuileMot(motInter, prochainSaisiIdx);
                                    saisisMappes.add(prochainSaisiIdx);
                                }
                            }
                            prochainSaisiIdx += 1;
                        }
                        const mot = this.motsAnalyse[saisieIdx];
                        if (mot) {
                            creerTuileMot(mot, saisieIdx);
                            saisisMappes.add(saisieIdx);
                            prochainSaisiIdx = Math.max(prochainSaisiIdx, saisieIdx + 1);
                        }
                    }
                }

                for (let si = 0; si < this.motsAnalyse.length; si++) {
                    if (saisisMappes.has(si)) continue;
                    const mot = this.motsAnalyse[si];
                    if (mot) creerTuileMot(mot, si);
                }
            } else {
                this.motsAnalyse.forEach((mot, index) => {
                    const erreursAvantMot = erreursManquantesParIndex.get(index) || [];
                    erreursAvantMot.forEach((erreur) => insererTuileMotManquant(erreur));
                    creerTuileMot(mot, index);
                });

                const erreursApresDernierMot = erreursManquantesParIndex.get(this.motsAnalyse.length) || [];
                erreursApresDernierMot.forEach((erreur) => insererTuileMotManquant(erreur));
            }

            const erreursPonctuation = (this.erreurs || []).filter((erreur) => erreur && erreur.type === 'ponctuation_finale' && !this.estErreurCorrigee(erreur));
            erreursPonctuation.forEach((erreur) => {
                const mauvaisePonct = String(erreur.mot || '').trim();
                const estSubstitution = /^[.!?]$/.test(mauvaisePonct);
                const tuile = document.createElement('div');
                tuile.className = `word-tile punctuation-missing-tile error${estSubstitution ? ' punctuation-wrong-tile' : ''}`;
                tuile.innerHTML = estSubstitution
                    ? `<span class="punctuation-tile-text">${mauvaisePonct}</span>`
                    : `<span class="missing-punct-icon">${erreur.correction || '.'}</span>`;
                tuile.dataset.extraErrorKey = this.obtenirCleErreur(erreur);
                if (estSubstitution) {
                    const labelSubst = `Mauvaise ponctuation finale : « ${mauvaisePonct} » doit être remplacée`;
                    tuile.setAttribute('aria-label', labelSubst);
                    tuile.title = labelSubst;
                } else {
                    tuile.setAttribute('aria-label', `Ponctuation finale manquante : ajoute « ${erreur.correction || '.'} »`);
                    tuile.title = `Il manque le point ou la ponctuation finale (« ${erreur.correction || '.'} »). Clique pour corriger.`;
                }
                tuile.addEventListener('click', () => this.selectionnerErreurDirecte(erreur, tuile));
                this.wordsContainer.appendChild(tuile);
            });
        }
    };

    global.AbeMainTilesRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis);
