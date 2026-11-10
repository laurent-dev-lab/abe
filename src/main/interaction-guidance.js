(function (global) {
    const EXEMPLES_PAR_TYPE = global.ABE_EXEMPLES_PAR_TYPE || {};
    const MEMOS_PAR_TYPE = global.ABE_MEMOS_PAR_TYPE || {};

    const api = {
        demarrerAide() {
            if (!this.erreurActuelle) return;

            if (this.erreurActuelle.type === 'reference_orale_mot_manquant') {
                this.reinitialiserEssaisGuideErreurActuelle();
                this.wordInteraction.classList.add('hidden');
                this.questionSection.classList.remove('hidden');
                this.jeuInvariable.initialiser(this.erreurActuelle);
                this.afficherJeuMotInvariable();
                return;
            }

            this.reinitialiserEssaisGuideErreurActuelle();

            const indexMot = typeof this.erreurActuelle.indexMot === 'number'
                ? this.erreurActuelle.indexMot
                : this.erreurActuelle.position;

            // Préparer le contexte avec le verbe si c'est une erreur sujet-verbe
            const contexte = {
                erreur: this.erreurActuelle,
                motCible: typeof indexMot === 'number' ? this.motsAnalyse[indexMot] : null
            };

            // Trouver le verbe pour les erreurs d'accord/conjugaison sujet-verbe
            const estErreurAccordSujetVerbe = this.erreurActuelle.type === 'accord_sujet_verbe'
                || this.erreurActuelle.type === 'conjugaison_verbe'
                || this.erreurActuelle.parcoursType === 'accord_sujet_verbe'
                || this.erreurActuelle.parcoursType === 'conjugaison_verbe';
            const estErreurAccordSujetParticipe = this.erreurActuelle.parcoursType === 'accord_sujet_participe';
            const estErreurAccordDeterminant = this.erreurActuelle.parcoursType === 'accord_determinant_nom'
                || this.erreurActuelle.parcoursType === 'accord_au_aux';
            const estErreurAccordAdjectif = this.erreurActuelle.parcoursType === 'accord_adjectif_nom';
            const estModeOralCorpus = this.erreurActuelle.type === 'reference_orale_attendue';

            if (estErreurAccordSujetVerbe || estErreurAccordSujetParticipe) {
                if (!estModeOralCorpus) {
                    contexte.verbe = typeof indexMot === 'number' ? this.motsAnalyse[indexMot] : null;
                    if (estErreurAccordSujetParticipe) {
                        contexte.participe = contexte.verbe;
                    }

                    // Trouver le sujet dans la phrase (priorité: position juste avant le verbe)
                    if (typeof indexMot === 'number' && indexMot > 0) {
                        const motAvant = this.motsAnalyse[indexMot - 1];
                        if (motAvant && motAvant.donnees && (motAvant.donnees.type === 'nom' || motAvant.donnees.type === 'pronom')) {
                            contexte.sujet = motAvant;
                        }
                    }

                    // Fallback: utiliser le sujet texte stocké dans l'erreur
                    if (!contexte.sujet && this.erreurActuelle.sujet) {
                        const sujetTexte = String(this.erreurActuelle.sujet).toLowerCase();
                        contexte.sujet = this.motsAnalyse.find((m) => m && m.texte && m.texte.toLowerCase() === sujetTexte) || null;
                    }

                    // Dernier fallback: premier nom/pronom trouvé
                    if (!contexte.sujet) {
                        for (const mot of this.motsAnalyse) {
                            if (mot.donnees && (mot.donnees.type === 'nom' || mot.donnees.type === 'pronom')) {
                                contexte.sujet = mot;
                                break;
                            }
                        }
                    }
                }

                // Conserver le nombre attendu si déjà calculé par l'analyseur
                if (this.erreurActuelle.nombreSujet && !contexte.nombreSujet) {
                    contexte.nombreSujet = this.erreurActuelle.nombreSujet;
                }
            }

            // Enrichir le contexte avec les données du corpus (contexteAccord)
            // Le corpus est la vérité de référence : il doit PRIMER sur la saisie utilisateur
            // (qui peut contenir des erreurs faussant les réponses attendues).
            if (this.erreurActuelle.contexteAccord) {
                const ctx = this.erreurActuelle.contexteAccord;
                const entreeCorpus = this.obtenirEntreeCorpusDetailleReference();
                const indexParIdCorpus = entreeCorpus && (entreeCorpus.tokenIndexParId instanceof Map)
                    ? entreeCorpus.tokenIndexParId
                    : null;
                const lexicauxSaisis = (typeof this.extraireTokensLexicauxAvecMeta === 'function' && Array.isArray(this.motsAnalyse))
                    ? this.extraireTokensLexicauxAvecMeta(this.motsAnalyse)
                    : [];
                const convertirLexicalVersRawIndex = (lexIdx) => {
                    if (!Number.isInteger(lexIdx) || lexIdx < 0) return lexIdx;
                    const itemLex = lexicauxSaisis[lexIdx];
                    if (itemLex && Number.isInteger(itemLex.rawIndex)) {
                        return itemLex.rawIndex;
                    }
                    return lexIdx;
                };
                if (indexParIdCorpus) {
                    const indexParIdMots = new Map();
                    indexParIdCorpus.forEach((lexIdx, id) => {
                        indexParIdMots.set(id, convertirLexicalVersRawIndex(lexIdx));
                    });
                    contexte.tokenIndexParId = indexParIdMots;
                }
                const avecIndexMot = (item) => {
                    if (!item) return item;
                    const dejaIndexe = Number.isInteger(item.indexMot)
                        ? item.indexMot
                        : Number.isInteger(item.position)
                            ? item.position
                            : null;
                    if (Number.isInteger(dejaIndexe)) return item;
                    const id = item.donnees ? Number(item.donnees.id) : NaN;
                    if (contexte.tokenIndexParId && Number.isInteger(id) && contexte.tokenIndexParId.has(id)) {
                        return { ...item, indexMot: contexte.tokenIndexParId.get(id) };
                    }
                    return item;
                };

                if (ctx.sujet) contexte.sujet = avecIndexMot(ctx.sujet);
                if (Array.isArray(ctx.sujets) && ctx.sujets.length > 0) {
                    contexte.sujets = ctx.sujets.map((s) => avecIndexMot(s)).filter(Boolean);
                }
                if (ctx.verbe) contexte.verbe = avecIndexMot(ctx.verbe);
                if (ctx.nom) contexte.nom = avecIndexMot(ctx.nom);
                if (ctx.determinat || ctx.determinant) {
                    const detVal = avecIndexMot(ctx.determinant || ctx.determinat);
                    contexte.determinant = detVal;
                    contexte.determinat = detVal;
                }
                if (ctx.adjectif) contexte.adjectif = avecIndexMot(ctx.adjectif);
                if (ctx.participe) contexte.participe = avecIndexMot(ctx.participe);
                // Pré-remplir nombreSujet et genreSujet depuis le corpus
                // pour que la validation singulier/pluriel et masculin/féminin soit TOUJOURS basée
                // sur le corpus (source de vérité), jamais sur la saisie fautive.
                const extraireNombreCorpus = (donnees) => {
                    if (!donnees) return null;
                    const n = String(donnees.nombre || '').toLowerCase();
                    if (n === 'p' || n === 'pluriel' || n === 'pl') return 'pluriel';
                    if (n === 's' || n === 'singulier' || n === 'sg') return 'singulier';
                    return null;
                };
                const extraireGenreCorpus = (donnees) => {
                    if (!donnees) return null;
                    const g = String(donnees.genre || '').toLowerCase();
                    if (g === 'f' || g === 'féminin' || g === 'feminin') return 'féminin';
                    if (g === 'm' || g === 'masculin') return 'masculin';
                    return null;
                };
                const sourcesDonnees = [
                    ctx.sujet && ctx.sujet.donnees,
                    ctx.nom && ctx.nom.donnees,
                    (ctx.determinant && ctx.determinant.donnees) || (ctx.determinat && ctx.determinat.donnees),
                    ctx.adjectif && ctx.adjectif.donnees
                ].filter(Boolean);
                for (const src of sourcesDonnees) {
                    if (!contexte.nombreSujet) {
                        const nb = extraireNombreCorpus(src);
                        if (nb) contexte.nombreSujet = nb;
                    }
                    if (!contexte.genreSujet) {
                        const gr = extraireGenreCorpus(src);
                        if (gr) contexte.genreSujet = gr;
                    }
                }
                // Cas des sujets coordonnés (ex: "Paul et Marie chantent") :
                // si plusieurs sujets gouvernent le verbe ou si le verbe cible est pluriel dans le corpus,
                // le groupe sujet est pluriel.
                if (
                    (Array.isArray(contexte.sujets) && contexte.sujets.length > 1) ||
                    (this.erreurActuelle.parcoursType === 'accord_sujet_verbe' &&
                        ctx.verbe && ctx.verbe.donnees &&
                        extraireNombreCorpus(ctx.verbe.donnees) === 'pluriel')
                ) {
                    contexte.nombreSujet = 'pluriel';
                }
            }

            // Pour les accords déterminant-nom, trouver le nom et le déterminant
            if (estErreurAccordDeterminant && !estModeOralCorpus) {
                if (!contexte.nom && typeof indexMot === 'number') {
                    const motCourant = this.motsAnalyse[indexMot];
                    if (motCourant && motCourant.donnees) {
                        const typeMot = String(motCourant.donnees.type || '').toLowerCase();
                        if (typeMot === 'nom') contexte.nom = motCourant;
                        if (typeMot.includes('déterminant') || typeMot === 'déterminant') {
                            contexte.determinant = motCourant;
                            contexte.determinat = motCourant;
                        }
                    }
                }
                // Chercher le partenaire dans les mots adjacents
                if (contexte.nom && !contexte.determinant && typeof indexMot === 'number' && indexMot > 0) {
                    const motAvant = this.motsAnalyse[indexMot - 1];
                    if (motAvant && motAvant.donnees && String(motAvant.donnees.type || '').toLowerCase().includes('déterminant')) {
                        contexte.determinant = motAvant;
                        contexte.determinat = motAvant;
                    }
                }
                if ((contexte.determinant || contexte.determinat) && !contexte.nom) {
                    for (const mot of this.motsAnalyse) {
                        if (mot.donnees && String(mot.donnees.type || '').toLowerCase() === 'nom') {
                            contexte.nom = mot;
                            break;
                        }
                    }
                }
            }

            // Pour les accords adjectif-nom, trouver le nom et l'adjectif
            if (estErreurAccordAdjectif && !estModeOralCorpus) {
                if (!contexte.nom && typeof indexMot === 'number') {
                    const motCourant = this.motsAnalyse[indexMot];
                    if (motCourant && motCourant.donnees) {
                        const typeMot = String(motCourant.donnees.type || '').toLowerCase();
                        if (typeMot === 'nom') contexte.nom = motCourant;
                        if (typeMot === 'adjectif') contexte.adjectif = motCourant;
                    }
                }
                if (contexte.adjectif && !contexte.nom) {
                    for (const mot of this.motsAnalyse) {
                        if (mot.donnees && String(mot.donnees.type || '').toLowerCase() === 'nom') {
                            contexte.nom = mot;
                            break;
                        }
                    }
                }
                if (contexte.nom && !contexte.adjectif) {
                    for (const mot of this.motsAnalyse) {
                        if (mot.donnees && String(mot.donnees.type || '').toLowerCase() === 'adjectif') {
                            contexte.adjectif = mot;
                            break;
                        }
                    }
                }
            }

            this.questionsAide = this.analyseur.genererQuestionAide(this.erreurActuelle, contexte);
            this.questionActuelle = 0;
            this.contexteAide = contexte;

            this.wordInteraction.classList.add('hidden');
            this.questionSection.classList.remove('hidden');

            if (this.jeuInvariable.doitDeclencher(this.erreurActuelle)) {
                this.jeuInvariable.initialiser(this.erreurActuelle);
                this.afficherJeuMotInvariable();
                return;
            }

            // Masquer le titre générique pour les erreurs de conjugaison/verbe
            // et aussi pour les erreurs orales avec parcours guidé (les questions sont déjà explicites)
            const typesSansHeader = ['conjugaison_verbe', 'accord_sujet_verbe', 'verbe_infinitif_requis'];
            const masquerHeader = typesSansHeader.includes(this.erreurActuelle.type)
                || !!this.erreurActuelle.parcoursType;
            if (this.questionHeader) {
                this.questionHeader.classList.toggle('hidden', masquerHeader);
            }
            this.afficherQuestion();
        },

        afficherJeuMotInvariable() {
            if (!this.answerOptions) return;
            this.jeuInvariable.rendre(
                this.answerOptions,
                this.questionText,
                this.erreurActuelle
            );
        },

        rendreBlocExplicationPedagogique() {
            if (!this.erreurActuelle || (!this.erreurActuelle.explication && !this.erreurActuelle.titreAide)) {
                return null;
            }

            const conteneur = document.createElement('div');

            // Si le mot porte aussi une erreur de majuscule non corrigée (et que
            // l'erreur actuelle n'est pas elle-même la majuscule), afficher les
            // deux cadres superposés pour que l'élève voie les deux problèmes.
            if (this.erreurActuelle.type !== 'majuscule_phrase') {
                const indexMot = typeof this.erreurActuelle.indexDebut === 'number'
                    ? this.erreurActuelle.indexDebut
                    : this.erreurActuelle.position;
                const mot = (indexMot >= 0 && this.motsAnalyse[indexMot]) ? this.motsAnalyse[indexMot] : null;
                if (mot && Array.isArray(mot.erreurs)) {
                    const erreurMajuscule = mot.erreurs.find((e) =>
                        e && e.type === 'majuscule_phrase' && !this.estErreurCorrigee(e) && e !== this.erreurActuelle
                    );
                    if (erreurMajuscule) {
                        const blocMaj = this._creerBlocInfoPourErreur(erreurMajuscule);
                        if (blocMaj) conteneur.appendChild(blocMaj);
                    }
                }
            }

            const bloc = this._creerBlocInfoPourErreur(this.erreurActuelle);
            if (bloc) conteneur.appendChild(bloc);

            return conteneur.childElementCount > 0 ? conteneur : null;
        },

        _creerBlocInfoPourErreur(erreur) {
            if (!erreur || (!erreur.explication && !erreur.titreAide)) return null;

            const bloc = document.createElement('div');
            bloc.className = 'info-box';
            bloc.style.marginBottom = '16px';

            if (erreur.titreAide) {
                const titre = document.createElement('h4');
                titre.textContent = erreur.titreAide;
                bloc.appendChild(titre);
            }

            if (erreur.explication) {
                const lignes = String(erreur.explication)
                    .split(/\n+/)
                    .map((ligne) => ligne.trim())
                    .filter(Boolean);
                lignes.forEach((ligne) => {
                    const p = document.createElement('p');
                    p.textContent = ligne;
                    bloc.appendChild(p);
                });
            }

            const memoAffichable = this.obtenirMemoAffichable(erreur);
            if (memoAffichable) {
                const memoBloc = document.createElement('div');
                memoBloc.className = 'regle-memo';
                const lignesMemo = [`À retenir :`, ...memoAffichable.split('\n')];
                lignesMemo.forEach((ligne) => {
                    const p = document.createElement('p');
                    p.textContent = ligne;
                    p.style.margin = '0';
                    memoBloc.appendChild(p);
                });
                bloc.appendChild(memoBloc);
            }

            return bloc;
        },

        obtenirMemoAffichable(erreur = this.erreurActuelle) {
            if (!erreur) return '';
            if (erreur.type === 'ponctuation_finale') return '';
            const memoBrut = String(erreur.memo || MEMOS_PAR_TYPE[erreur.type] || '').trim();
            if (!memoBrut) return '';

            const memosInutiles = new Set([
                'La correction s’accorde mieux avec le contexte local de la phrase.',
                "La correction s'accorde mieux avec le contexte local de la phrase."
            ]);

            return memosInutiles.has(memoBrut) ? '' : memoBrut;
        },

        creerBlocQuestionGuidee(texteQuestion) {
            if (!texteQuestion) return null;

            const bloc = document.createElement('div');
            bloc.className = 'question-text question-prompt-box';
            this.setTexteAvecSauts(bloc, texteQuestion);
            return bloc;
        },

        creerBlocRappel(rappel) {
            if (!rappel) return null;

            const rappelBox = document.createElement('div');
            rappelBox.className = 'rappel-box';
            const phrases = String(rappel).split(/\n/);
            phrases.forEach((phrase) => {
                if (!phrase.trim()) return;
                const ligne = document.createElement('p');
                ligne.textContent = phrase.trim();
                rappelBox.appendChild(ligne);
            });
            return rappelBox;
        },

        afficherQuestion() {
            if (this.questionActuelle >= this.questionsAide.length) {
                this.afficherExplicationComplete();
                return;
            }

            const question = this.questionsAide[this.questionActuelle];
            
            // Générer le texte de la question si c'est une fonction
            let questionText = question.question;
            if (question.genererQuestion) {
                questionText = question.genererQuestion(this.contexteAide);
            }
            
            // Vider le conteneur de question pour éviter l'affichage double
            this.questionText.innerHTML = '';
            this.questionText.classList.add('hidden');
            this.answerOptions.innerHTML = '';

            const questionFlow = document.createElement('div');
            questionFlow.className = 'question-flow-stack';
            this.answerOptions.appendChild(questionFlow);

            // Ne pas afficher le bloc pédagogique si la première question est de type 'info'
            // car celle-ci contient déjà titreAide + règle + exemples (évite le doublon)
            const premiereQuestion = this.questionsAide[this.questionActuelle];
            const blocExplication = (premiereQuestion && premiereQuestion.type === 'info')
                ? null
                : this.rendreBlocExplicationPedagogique();
            if (blocExplication) {
                questionFlow.appendChild(blocExplication);
            }

            if (question.type === 'selection') {
                const blocQuestion = this.creerBlocQuestionGuidee(questionText);
                if (blocQuestion) {
                    questionFlow.appendChild(blocQuestion);
                }

                const optionsContainer = document.createElement('div');
                optionsContainer.className = 'options-container';
                // Affiche tous les mots lexicaux comme options (en ignorant la ponctuation isolée)
                this.motsAnalyse.forEach((mot, index) => {
                    if (!mot || !mot.texte) return;
                    if (/^[.,;:!?"«»()\[\]{}\-–—]+$/.test(String(mot.texte).trim())) return;
                    const btn = document.createElement('button');
                    btn.className = 'answer-option word-choice-tile';
                    btn.textContent = mot.texte;
                    btn.addEventListener('click', () => this.verifierReponse(mot.texte, index));
                    optionsContainer.appendChild(btn);
                });
                questionFlow.appendChild(optionsContainer);
            } else if (question.type === 'choix') {
                const blocQuestion = this.creerBlocQuestionGuidee(questionText);
                if (blocQuestion) {
                    questionFlow.appendChild(blocQuestion);
                }

                const rappelBox = this.creerBlocRappel(question.rappel);
                if (rappelBox) {
                    questionFlow.appendChild(rappelBox);
                }
                
                // Affiche les options prédéfinies
                const optionsContainer = document.createElement('div');
                optionsContainer.className = 'options-container';
                const optionsBrutes = [...(question.options || [])];
                const optionsMelangees = question.preserveOrder
                    ? optionsBrutes
                    : (this.analyseur
                        ? this.analyseur.melangerTableau(optionsBrutes)
                        : optionsBrutes.sort(() => Math.random() - 0.5));

                optionsMelangees.forEach(option => {
                    const btn = document.createElement('button');
                    btn.className = 'answer-option word-choice-tile';
                    if (question.tileClass) {
                        btn.classList.add(question.tileClass);
                    }
                    btn.textContent = option;
                    btn.addEventListener('click', () => this.verifierReponse(option));
                    optionsContainer.appendChild(btn);
                });
                questionFlow.appendChild(optionsContainer);

                if (question.autrePropositionPlaceholder) {
                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'proposition-container';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'proposition-input';
                    input.placeholder = question.autrePropositionPlaceholder;
                    input.spellcheck = false;
                    input.autocorrect = 'off';
                    input.autocapitalize = 'off';

                    const btn = document.createElement('button');
                    btn.className = 'btn btn-secondary';
                    btn.textContent = 'Valider cette proposition';
                    btn.addEventListener('click', () => this.verifierReponse(input.value));

                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            btn.click();
                        }
                    });

                    inputContainer.appendChild(input);
                    inputContainer.appendChild(btn);
                    questionFlow.appendChild(inputContainer);
                }
            } else if (question.type === 'info_mots_famille') {
                // Affiche les mots de la famille avec l'aide et un bouton Suivant
                const infoBox = document.createElement('div');
                infoBox.className = 'info-box';
                
                if (question.titre) {
                    const titre = document.createElement('h4');
                    titre.textContent = question.titre;
                    infoBox.appendChild(titre);
                }
                
                // Message
                const message = document.createElement('p');
                message.textContent = question.intro || `Le mot "${question.motInconnu}" n'existe pas dans le dictionnaire. Voici des mots de la même famille :`;
                infoBox.appendChild(message);
                
                // Liste des mots de la famille
                const motsList = document.createElement('div');
                motsList.className = 'mots-famille-list';
                question.motsFamille.forEach(mot => {
                    const motSpan = document.createElement('span');
                    motSpan.className = 'mot-famille';
                    motSpan.textContent = mot;
                    motsList.appendChild(motSpan);
                });
                infoBox.appendChild(motsList);
                
                // Aide (1 phrase par ligne)
                if (question.aide) {
                    const aideContainer = document.createElement('div');
                    aideContainer.className = 'info-aide';
                    const phrases = question.aide.split('\n');
                    phrases.forEach(phrase => {
                        if (phrase.trim()) {
                            const ligne = document.createElement('p');
                            ligne.textContent = phrase.trim();
                            aideContainer.appendChild(ligne);
                        }
                    });
                    infoBox.appendChild(aideContainer);
                }
                
                questionFlow.appendChild(infoBox);
                
                // Bouton Suivant (style compact cohérent)
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary';
                btn.textContent = "J'ai observé, je continue";
                btn.addEventListener('click', () => {
                    this.questionActuelle++;
                    this.afficherQuestion();
                });
                questionFlow.appendChild(btn);
            } else if (question.type === 'choix_terminaison') {
                // Affiche une question sur la terminaison avec exemples
                const contenu = question.genererContenu ? question.genererContenu(this.contexteAide) : null;
                
                if (contenu) {
                    // Titre
                    if (question.titre) {
                        const titre = document.createElement('h4');
                        titre.className = 'info-title';
                        titre.textContent = question.titre;
                        questionFlow.appendChild(titre);
                    }
                    
                    // Question
                    const questionBox = document.createElement('div');
                    questionBox.className = 'terminaison-question';
                    questionBox.textContent = contenu.question;
                    questionFlow.appendChild(questionBox);
                    
                    // Exemples
                    if (contenu.exemples && contenu.exemples.length > 0) {
                        const exemplesBox = document.createElement('div');
                        exemplesBox.className = 'terminaison-exemples';
                        const exemplesTitre = document.createElement('p');
                        exemplesTitre.innerHTML = '<strong>Exemples :</strong>';
                        exemplesBox.appendChild(exemplesTitre);
                        
                        contenu.exemples.forEach((exemple, index) => {
                            const exempleP = document.createElement('p');
                            exempleP.textContent = exemple;
                            exemplesBox.appendChild(exempleP);
                        });
                        questionFlow.appendChild(exemplesBox);
                    }
                    
                    // Options de réponse
                    const optionsContainer = document.createElement('div');
                    optionsContainer.className = 'options-container';
                    const optionsMelangees = this.analyseur
                        ? this.analyseur.melangerTableau([...(contenu.options || [])])
                        : [...(contenu.options || [])].sort(() => Math.random() - 0.5);

                    optionsMelangees.forEach(option => {
                        const btn = document.createElement('button');
                        btn.className = 'answer-option word-choice-tile';
                        btn.textContent = option;
                        btn.addEventListener('click', () => {
                            // Vérifier la réponse
                            if (option === contenu.bonneReponse) {
                                this.afficherMessage('Bonne réponse !', 'success');
                                this.questionActuelle++;
                                setTimeout(() => this.afficherQuestion(), 1000);
                            } else {
                                this.afficherMessage('Pas tout à fait. Observe bien les exemples !', 'error');
                            }
                        });
                        optionsContainer.appendChild(btn);
                    });
                    questionFlow.appendChild(optionsContainer);
                }
            } else if (question.type === 'info') {
                // Affiche une information avec exemples pédagogiques et un bouton "J'ai compris"
                const infoBox = document.createElement('div');
                infoBox.className = 'info-box';
                if (this.erreurActuelle && ['mot_invariable', 'invariable_s_fantome', 'mot_liaison_lexical', 'locution_mal_segmentee', 'oralite_familiere'].includes(this.erreurActuelle.type)) {
                    infoBox.classList.add('info-box-memory');
                }

                if (question.titre) {
                    const titre = document.createElement('h4');
                    titre.textContent = question.titre;
                    infoBox.appendChild(titre);
                }

                const contenu = question.genererContenu ? question.genererContenu(this.contexteAide) : question.question;
                const lignes = (contenu || '').split('\n').filter((l) => l.trim());
                lignes.forEach((ligne) => {
                    const p = document.createElement('p');
                    p.textContent = ligne.trim();
                    infoBox.appendChild(p);
                });

                const exemples = question.exemples ||
                    (this.erreurActuelle && EXEMPLES_PAR_TYPE[this.erreurActuelle.type]) || [];
                if (exemples.length > 0) {
                    const exemplesSec = document.createElement('div');
                    exemplesSec.className = 'exemples-regle';
                    const exemplesTitre = document.createElement('p');
                    exemplesTitre.className = 'exemples-titre';
                    exemplesTitre.textContent = 'Exemples :';
                    exemplesSec.appendChild(exemplesTitre);

                    exemples.forEach((ex) => {
                        const item = document.createElement('p');
                        item.className = 'exemple-item';
                        item.textContent = ex;
                        exemplesSec.appendChild(item);
                    });

                    infoBox.appendChild(exemplesSec);
                }

                questionFlow.appendChild(infoBox);

                const btn = document.createElement('button');
                btn.className = 'btn btn-primary info-continue-btn';
                btn.textContent = "J'ai compris, je continue";
                btn.addEventListener('click', () => {
                    this.questionActuelle++;
                    this.afficherQuestion();
                });
                questionFlow.appendChild(btn);
            } else if (question.type === 'proposition') {
                const blocQuestion = this.creerBlocQuestionGuidee(questionText);
                if (blocQuestion) {
                    questionFlow.appendChild(blocQuestion);
                }

                const inputContainer = document.createElement('div');
                inputContainer.className = 'proposition-container';

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'proposition-input';
                input.placeholder = 'Écris ta proposition...';
                input.spellcheck = false;
                input.autocorrect = 'off';
                input.autocapitalize = 'off';

                const btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.textContent = 'Valider ma proposition';
                btn.addEventListener('click', () => {
                    this.verifierProposition(input.value, question.cible);
                });

                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        btn.click();
                    }
                });

                inputContainer.appendChild(input);
                inputContainer.appendChild(btn);
                questionFlow.appendChild(inputContainer);

                setTimeout(() => input.focus(), 100);
            }
        },

        verifierReponse(reponse, reponseIndex = null) {
            const question = this.questionsAide[this.questionActuelle];
            const contexteValidation = {
                ...(this.contexteAide || {}),
                selectionIndex: Number.isInteger(reponseIndex) ? reponseIndex : null
            };
            const estCorrect = this.analyseur.verifierReponse(question, reponse, contexteValidation);

            if (estCorrect) {
                // IMPORTANT : le corpus est la source de vérité.
                // On ne remplace JAMAIS les données corpus déjà présentes dans
                // contexteAide par les données de la saisie utilisateur (motsAnalyse),
                // car l'utilisateur peut avoir fait des erreurs qui fausseraient
                // les validations suivantes (genre, nombre, etc.).
                // On ne remplit que les champs encore manquants.
                if (question && question.type === 'selection' && question.cible && Array.isArray(this.motsAnalyse)) {
                    const motSelectionne = Number.isInteger(reponseIndex)
                        ? (this.motsAnalyse[reponseIndex] || null)
                        : (this.motsAnalyse.find((m) => m && m.texte === reponse) || null);
                    if (question.cible === 'nom' && !this.contexteAide.nom) {
                        this.contexteAide.nom = motSelectionne;
                    }
                    if ((question.cible === 'déterminant' || question.cible === 'determinant') && !this.contexteAide.determinant) {
                        this.contexteAide.determinant = motSelectionne;
                        this.contexteAide.determinat = motSelectionne;
                    }
                    if (question.cible === 'adjectif' && !this.contexteAide.adjectif) {
                        this.contexteAide.adjectif = motSelectionne;
                    }
                    if (question.cible === 'sujet' && !this.contexteAide.sujet) {
                        this.contexteAide.sujet = motSelectionne || reponse;
                    }
                    if (question.cible === 'participe' && !this.contexteAide.participe) {
                        this.contexteAide.participe = motSelectionne;
                    }
                }

                // Stocker les réponses dans le contexte pour les questions dynamiques
                // IMPORTANT : ne PAS écraser nombreSujet s'il vient du corpus
                // (source de vérité). L'utilisateur peut répondre "Singulier"
                // à tort — le corpus dit "Pluriel" et c'est le corpus qui compte.
                if (
                    question.question &&
                    (
                        question.question.includes('seul ou sont-ils plusieurs') ||
                        question.question.includes('singulier ou pluriel')
                    ) &&
                    !this.contexteAide.nombreSujet
                ) {
                    this.contexteAide.nombreSujet = (reponse === 'Pluriel' || reponse === 'Plusieurs')
                        ? 'pluriel'
                        : 'singulier';
                }
                if (question.question && question.question.includes('auxiliaire')) {
                    this.contexteAide.auxiliaire = reponse;
                }
                if (question.question && question.question.includes('mot qui ressemble')) {
                    // Si l'enfant connaît un mot similaire, le stocker
                    if (reponse !== 'Je ne connais pas') {
                        this.contexteAide.choixMotSimilaire = reponse;
                    }
                }
                
                this.afficherMessage('Bonne réponse !', 'success');
                this.questionActuelle++;
                setTimeout(() => this.afficherQuestion(), 1000);
            } else {
                this.afficherMessage('Pas tout à fait. Réfléchis encore !', 'error');
            }
        },

        verifierProposition(proposition, cible) {
            const motErreur = this.erreurActuelle.mot;
            const correction = this.erreurActuelle.correction;
            
            // Vérifier si la proposition correspond à la correction attendue
            const propositionSaisie = String(proposition || '').trim();
            const correctionAttendue = String(correction || '').trim();
            const propositionLower = (proposition || '').toLowerCase().trim();
            const correctionLower = (correction || '').toLowerCase().trim();
            const exigerDoubleValidationPremierMot = this.doitExigerCasseExactePourErreurCourante();

            let estBonneCorrection = false;

            if (this.erreurActuelle.type === 'ponctuation_finale') {
                const signeAttendu = /^[.?!]$/.test(correctionLower.slice(-1)) ? correctionLower.slice(-1) : '.';
                estBonneCorrection = propositionLower === correctionLower || propositionLower === signeAttendu;
            }

            if (!estBonneCorrection && correctionLower) {
                if (exigerDoubleValidationPremierMot) {
                    estBonneCorrection = propositionSaisie === correctionAttendue;
                } else {
                    estBonneCorrection = propositionLower === correctionLower || this.estCorrectionVerbaleCompatible(propositionLower);
                }
            } else if (this.erreurActuelle.type === 'mot_inconnu') {
                // Si aucune correction explicite n'est fournie, on valide si le mot proposé existe dans le dictionnaire.
                // Cela évite un crash et permet à l'enfant de proposer un mot correct.
                const dict = this.analyseur && this.analyseur.dictionnaire;
                const existeDansDict = dict && dict.mots && Object.prototype.hasOwnProperty.call(dict.mots, propositionLower);
                estBonneCorrection = !!existeDansDict && propositionLower !== (motErreur || '').toLowerCase().trim();
                if (estBonneCorrection && exigerDoubleValidationPremierMot) {
                    estBonneCorrection = /^[A-ZÀÂÉÈÊËÎÏÔÛÙÜŸŒÆ]/.test(propositionSaisie);
                }
            }

            if (estBonneCorrection) {
                this.reinitialiserEssaisGuideErreurActuelle();
                this.reinitialiserEssaisDirectErreurActuelle();
                this.afficherMessage('Excellent ! Tu as trouvé la bonne correction !', 'success');
                this.appliquerCorrectionErreurCourante(proposition);

                this.mettreAJourProgression();
                this.questionActuelle++;
                
                // Marquer le mot comme corrigé
                const toutCorrige = this.erreursCorrigees.size >= this.erreurs.length && this.erreurs.length > 0;
                setTimeout(() => {
                    this.afficherExplicationComplete();
                    if (toutCorrige) this.felicitationsEnAttente = true;
                }, 1500);
            } else {
                const essais = this.incrementerEssaisGuideErreurActuelle();
                const essaisRestants = Math.max(0, this.maxEssaisParPropositionGuidee - essais);
                if (essaisRestants <= 0) {
                    this.revelerCorrectionApresTroisEssais();
                    return;
                }

                // Indice si la proposition est proche
                const motErreurData = this.motsAnalyse.find(m => m.texte === motErreur);
                if (motErreurData && motErreurData.donnees && motErreurData.donnees.variations) {
                    const variations = motErreurData.donnees.variations;
                    if (variations.includes(propositionLower)) {
                        this.afficherMessage(`"${proposition}" est une forme du verbe, mais ce n'est pas la bonne forme pour ce sujet. Il te reste ${essaisRestants} essai(s).`, 'info');
                    } else {
                        this.afficherMessage(`Ce n'est pas tout à fait ça. Il te reste ${essaisRestants} essai(s).`, 'error');
                    }
                } else {
                    this.afficherMessage(`Ce n'est pas tout à fait ça. Il te reste ${essaisRestants} essai(s).`, 'error');
                }
            }
        },

        afficherExplicationComplete() {
            this.questionSection.classList.add('hidden');
            this.feedbackSection.classList.remove('hidden');

            const correction = this.erreurActuelle.correction || '';
            let erreurTexte = this.formulerErreurEleve(this.erreurActuelle);

            // Recalcule un libellé basé sur l'état courant de la phrase
            // pour éviter d'afficher un ancien sujet après correction d'un mot précédent.
            if (this.erreurActuelle.type === 'accord_sujet_verbe') {
                const indexMot = typeof this.erreurActuelle.indexMot === 'number'
                    ? this.erreurActuelle.indexMot
                    : this.erreurActuelle.position;
                const verbeActuel = this.motsAnalyse[indexMot] ? this.motsAnalyse[indexMot].texte : this.erreurActuelle.mot;

                let sujetActuel = null;
                if (typeof indexMot === 'number' && indexMot > 0) {
                    for (let i = indexMot - 1; i >= 0; i--) {
                        const m = this.motsAnalyse[i];
                        if (m && m.donnees && (m.donnees.type === 'nom' || m.donnees.type === 'pronom')) {
                            sujetActuel = m.texte;
                            break;
                        }
                    }
                }

                if (sujetActuel && verbeActuel) {
                    erreurTexte = `Tu n'avais pas conjugué le verbe "${verbeActuel}" correctement avec le sujet "${sujetActuel}".`;
                }
            }

            const explication = `
                <h3>📚 Explication</h3>
                <p><strong>Règle :</strong> ${this.erreurActuelle.regle}</p>
                <p><strong>Erreur :</strong> ${erreurTexte}</p>
                <p><strong>Correction :</strong> <span class="mot-barre">${this.erreurActuelle.mot || '...'}</span> <span class="mot-separateur">→</span> <span class="mot-corrige">${correction || '...'}</span></p>
            `;

            this.feedbackMessage.innerHTML = explication;
            this.feedbackMessage.className = 'feedback-message info';
        },

        formulerErreurEleve(erreur) {
            if (!erreur) return '';

            const typeEffectif = erreur.parcoursType || erreur.type;
            switch (typeEffectif) {
                case 'majuscule_phrase':
                    return 'Tu n\'avais pas mis de majuscule au premier mot de la phrase.';
                case 'ponctuation_finale':
                    return 'Tu n\'avais pas mis de ponctuation à la fin de la phrase.';
                case 'accent_lexical':
                    return `Tu n\'avais pas mis le bon accent dans le mot "${erreur.mot}".`;
                case 'apostrophe_obligatoire':
                    return 'Tu n\'avais pas mis l\'apostrophe obligatoire.';
                case 'negation_incomplete':
                    return 'Tu n\'avais pas écrit la négation complète (ne / n\' ...).';
                case 'conjugaison_verbe':
                    return 'Tu n\'avais pas conjugué correctement le verbe.';
                case 'accord_sujet_verbe':
                    return `Tu n\'avais pas accordé correctement le verbe "${erreur.mot}" avec son sujet.`;
                case 'accord_determinant_nom':
                    if (erreur.cibleErreur === 'nom' || (erreur.contexteAccord && erreur.contexteAccord.cibleErreur === 'nom')) {
                        return 'Tu n\'avais pas accordé correctement le nom avec son déterminant.';
                    }
                    return 'Tu n\'avais pas accordé correctement le déterminant avec le nom.';
                case 'accord_adjectif_nom':
                    if (erreur.cibleErreur === 'attribut' || erreur.titreAide === 'Accord sujet-attribut' || (typeof erreur.explication === 'string' && erreur.explication.includes('attribut'))) {
                        return 'Tu n\'avais pas accordé correctement l\'adjectif attribut avec le sujet.';
                    }
                    return 'Tu n\'avais pas accordé correctement l\'adjectif avec le nom.';
                case 'accord_nom_nombre':
                    return `Tu n\'avais pas écrit le nom au bon nombre après le déterminant.`;
                case 'mot_invariable':
                case 'invariable_s_fantome':
                case 'mot_liaison_lexical':
                    return `Tu n\'avais pas écrit correctement ce mot invariable : "${erreur.mot}".`;
                case 'oubli_lettre_interne':
                    return `Il manquait une lettre dans le mot "${erreur.mot}".`;
                case 'consonne_muette_finale':
                    return `Tu avais oublié la consonne finale muette du mot "${erreur.mot}".`;
                case 'locution_mal_segmentee':
                    return `Tu n'avais pas gardé la bonne découpe pour cette expression : "${erreur.mot}".`;
                case 'oralite_familiere':
                    return `Tu avais écrit une forme trop orale : "${erreur.mot}".`;
                case 'segmentation_mot_colle':
                    return `Tu avais collé trop vite ce groupe de mots : "${erreur.mot}".`;
                case 'metathese':
                    return `Tu avais inversé deux lettres dans "${erreur.mot}".`;
                case 'lettre_fantome_finale':
                    return `Il manquait une lettre discrète à la fin de "${erreur.mot}".`;
                case 'mot_inconnu':
                    return 'Tu n\'avais pas écrit correctement ce mot.';
                case 'confusion_phonographique':
                    return `Tu avais choisi une orthographe qui se prononce pareil, mais qui ne s\'écrit pas comme le mot attendu.`;
                default:
                    return erreur.explication || 'Tu n\'avais pas écrit ce mot correctement dans la phrase.';
            }
        },

        setTexteAvecSauts(element, texte) {
            element.innerHTML = '';
            if (!texte) return;
            const lignes = texte.split('\n');
            lignes.forEach((ligne, i) => {
                const p = document.createElement('span');
                p.textContent = ligne;
                element.appendChild(p);
                if (i < lignes.length - 1) {
                    element.appendChild(document.createElement('br'));
                }
            });
        },

        genererAstuce(typeErreur) {
            const astuces = {
                'accord_determinant_nom': 'Repère le déterminant puis vérifie le nom : ils doivent avoir le même genre et le même nombre.',
                'accord_sujet_verbe': 'Le verbe s\'accorde avec le sujet qui fait l\'action.',
                'accord_adjectif_nom': 'Trouve le nom noyau puis ajuste l\'adjectif : masculin/féminin et singulier/pluriel doivent correspondre.',
                'accord_nom_nombre': 'Après le déterminant, vérifie si le nom doit être au singulier ou au pluriel avant de corriger.',
                'mot_inconnu': 'Cherche des mots de la même famille pour trouver l\'orthographe correcte.',
                'mot_invariable': 'Un mot invariable ne change jamais de forme: il faut mémoriser son orthographe exacte.',
                'oubli_lettre_interne': 'Il manque une lettre dans ce mot : écoute à nouveau la dictée et corrige ton oubli.',
                'consonne_muette_finale': 'Pour la retrouver, tu peux la plupart du temps chercher le féminin du mot ou un mot de la même famille.',
                'invariable_s_fantome': 'Ce mot garde toujours son s final : il faut le voir comme une étiquette fixe.',
                'mot_liaison_lexical': 'Ces mots relient les idées : retiens leur orthographe comme une forme toute prête.',
                'locution_mal_segmentee': 'Quand une expression est figée, garde sa bonne découpe : espace, trait d’union ou apostrophe.',
                'oralite_familiere': 'Transforme la forme orale en phrase complète, comme dans un écrit scolaire.',
                'segmentation_mot_colle': 'Si le mot semble collé, pense à remettre l’espace ou l’apostrophe qui manquent.',
                'metathese': 'Lis lentement le mot pour remettre les deux lettres dans le bon ordre.',
                'lettre_fantome_finale': 'Cherche un mot de la même famille pour retrouver la lettre cachée à la fin.',
                'conjugaison_verbe': 'Le verbe change de terminaison selon le sujet : je fais, tu fais, il fait, nous faisons, vous faites, ils font.',
                'verbe_infinitif_requis': 'Après aller, vouloir, pouvoir, devoir... le verbe suivant est à l\'infinitif (manger, partir).',
                'verbe_participe_requis': 'Distingue être et avoir : avec être, accord avec le sujet ; avec avoir, cherche si le COD est placé avant.',
                'homophone_sa_ca': 'Remplace par "cela": si ça marche, écris "ça"; sinon devant un nom, écris "sa/son/ses".',
                'homophone_sa_ca': 'Remplace par "cela" et vérifie si la phrase garde du sens.',
                'homophone_ca_sa': 'Devant un nom, cherche un déterminant possessif plutôt qu’un pronom.',
                'homophone_ces_cest': 'Regarde s’il y a un nom pluriel après, ou si tu peux remplacer par "cela est".',
                'homophone_a_a_grave': 'Essaie de remplacer par "avait" pour savoir si tu es dans le verbe avoir.',
                'homophone_a_a_sans': 'Devant un infinitif ou un complément, on écrit souvent "à" avec accent.',
                'homophone_et_est': 'Remplace par "était": si ça marche, c\'est "est".',
                'homophone_est_et': 'Pour relier deux mots ou groupes, cherche la conjonction.',
                'homophone_son_sont': 'Demande-toi si tu as un verbe avec un sujet pluriel, ou un déterminant devant un nom.',
                'homophone_sont_son': 'Devant un nom, privilégie "son" (déterminant).',
                'homophone_ou_ou_grave': 'Demande-toi si tu parles d’un lieu ou d’un moment, ou si tu proposes un choix.',
                'homophone_ou_grave_ou': 'Si tu proposes un choix, cherche la conjonction correspondante.',
                'homophone_ce_se': 'Devant un verbe pronominal, pense au pronom réfléchi.',
                'homophone_se_ce': 'Devant un nom, pense au déterminant.',
                'homophone_on_ont': 'Demande-toi si tu as un pronom sujet ou une forme du verbe avoir.',
                'homophone_ont_on': 'Comme sujet, cherche le pronom qui convient.',
                'homophone_leur_leurs': 'Regarde si le nom qui suit est singulier ou pluriel.',
                'homophone_leurs_leur': 'Regarde si le nom qui suit est singulier ou pluriel.',
                'homophone_se_cest': 'Teste le remplacement par "cela est".',
                'homophone_ce_cest': 'Regarde si tu peux remplacer par "cela est" ou si le mot accompagne un nom.',
                'homophone_ses_cest': 'Vérifie s’il y a un nom pluriel après, ou si "cela est" fonctionne.',
                'homophone_ni_ny': '"N\'y" = "ne ... y"; "ni" sert à coordonner des choix.',
                'homophone_mais_mes': 'Demande-toi si le mot accompagne un nom pluriel ou s’il oppose deux idées.',
                'homophone_mes_mais': 'Cherche si le mot sert à opposer, ou à accompagner un nom pluriel.',
                'homophone_la_grave_la': 'Demande-toi si le mot accompagne un nom, ou indique un lieu.',
                'homophone_la_la_grave': 'Si tu indiques un lieu, choisis la forme qui montre un endroit.',
                'homophone_ta_tas': '"T\'as" = "tu as"; "ta" devant un nom.',
                'homophone_peut_peu': '"Peu" exprime une quantité (un peu, très peu). "Peut" est le verbe pouvoir.',
                'homophone_peu_peut': '"Peut" est le verbe pouvoir (il peut venir). "Peu" exprime une quantité.',
                'homophone_quand_quant': '"Quant à / quant au" introduit un sujet abordé. "Quand" exprime le temps.',
                'homophone_tout_tous': 'Regarde si le nom qui suit est masculin singulier ou masculin pluriel.'
            };
            return astuces[typeErreur] || 'Relis attentivement la règle.';
        },

        continuer() {
            this.feedbackSection.classList.add('hidden');
            this.tilesSection.classList.remove('hidden');
            this.erreurActuelle = null;
            this.correctionEnCoursCle = null;
            this.questionActuelle = 0;
            this.questionsAide = [];
            this.contexteAide = {};
            document.querySelectorAll('.word-tile').forEach(t => t.classList.remove('selected'));

            const toutCorrige = this.erreursCorrigees.size >= this.erreurs.length && this.erreurs.length > 0;
            if (this.felicitationsEnAttente && toutCorrige) {
                this.felicitationsEnAttente = false;
                setTimeout(() => this.montrerModaleFelicitations(), 120);
            }
        }
    };

    global.AbeMainInteractionGuidance = api;
})(typeof window !== 'undefined' ? window : globalThis);
