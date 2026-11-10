/**
 * Catégorie extraite d'analyseur.js
 * Fichier: pedagogie.js
 */
(function (global) {
    const categories = global.AbeAnalyseurCategories = global.AbeAnalyseurCategories || {};

    function genererQuestionAide(erreur, contexte) {
        const verbeTexte = contexte && contexte.verbe ? contexte.verbe.texte : '[verbe]';
        const motCibleTexte = contexte && contexte.motCible ? contexte.motCible.texte : (erreur && erreur.mot ? erreur.mot : '[mot]');

        const poserQuestionAuxiliaire = this.doitDemanderAuxiliaire(erreur && erreur.position);
        const construireOptionsVerbesProches = () => {
            const options = new Set();
            const distracteursParInfinitif = {
                faire: ['dire', 'voir', 'aller', 'lire'],
                voir: ['vivre', 'vouloir', 'dire', 'croire'],
                dire: ['faire', 'lire', 'voir', 'écrire'],
                aller: ['arriver', 'aider', 'avoir', 'venir'],
                avoir: ['être', 'aller', 'venir', 'faire'],
                être: ['avoir', 'aller', 'venir', 'faire']
            };
            const distracteursGeneriques = ['faire', 'dire', 'voir', 'aller', 'lire', 'venir', 'avoir', 'être'];
            const ajouterVerbe = (mot) => {
                const texte = String(mot || '').trim();
                if (!texte) return;
                const donnees = this.getWordData(texte);
                if (donnees && this.estType(donnees, 'verbe') && this.estInfinitif(donnees)) {
                    options.add(texte.toLowerCase());
                    return;
                }
                const infinitif = this.trouverInfinitifDepuisFormeConjuguee(texte);
                if (infinitif) options.add(infinitif.toLowerCase());
            };

            ajouterVerbe(erreur && erreur.correction);
            ajouterVerbe(motCibleTexte);

            const similaires = Array.isArray(erreur && erreur.motsSimilaires) ? erreur.motsSimilaires : [];
            similaires.forEach((entree) => ajouterVerbe(entree && entree.mot));

            const variations = Array.isArray(erreur && erreur.variationsVerbe) ? erreur.variationsVerbe : [];
            variations.forEach((forme) => ajouterVerbe(forme));

            const correction = String((erreur && erreur.correction) || '').toLowerCase().trim();
            if (correction === 'fais' || motCibleTexte.toLowerCase() === 'fai') {
                ajouterVerbe('faire');
            }

            const sorties = [...options];
            if (sorties.length === 1) {
                const base = sorties[0];
                const distracteurs = distracteursParInfinitif[base] || [];
                distracteurs.forEach((verbe) => options.add(verbe));
            }

            if (options.size < 5) {
                distracteursGeneriques.forEach((verbe) => options.add(verbe));
            }

            const sortiesFinales = [...options].slice(0, 4);
            if (options.size >= 5) {
                const bonneReponseNorm = String(bonneReponseVerbeProche || '').toLowerCase();
                const autres = [...options].filter((v) => v.toLowerCase() !== bonneReponseNorm).slice(0, 4);
                const listeFinale = bonneReponseNorm ? [bonneReponseNorm, ...autres] : [...options].slice(0, 5);
                return listeFinale.map((v) => v.charAt(0).toUpperCase() + v.slice(1));
            }
            if (sortiesFinales.length <= 1) return null;
            return sortiesFinales.map((v) => v.charAt(0).toUpperCase() + v.slice(1));
        };

        const bonneReponseVerbeProche = (() => {
            const correction = String((erreur && erreur.correction) || '').trim();
            const donnees = this.getWordData(correction);
            if (donnees && this.estType(donnees, 'verbe') && this.estInfinitif(donnees)) {
                return correction.charAt(0).toUpperCase() + correction.slice(1);
            }
            const infinitif = this.trouverInfinitifDepuisFormeConjuguee(correction);
            if (infinitif) return infinitif.charAt(0).toUpperCase() + infinitif.slice(1);
            if (correction.toLowerCase() === 'fais') return 'Faire';
            return null;
        })();
        const optionsVerbesProches = construireOptionsVerbesProches();
        const questionAuxiliaire = {
            question: 'Avec quel auxiliaire le verbe est-il construit ?',
            type: 'choix',
            options: ['Être', 'Avoir', 'Aucun des deux'],
            rappel: 'Pour trouver l\'auxiliaire AVOIR, essaie de remplacer par "a".\nPour trouver l\'auxiliaire ÊTRE, essaie de remplacer par "est".'
        };

        const cibleErreur = String(
            (erreur && erreur.cibleErreur) ||
            (erreur && erreur.contexteAccord && erreur.contexteAccord.cibleErreur) ||
            ''
        ).toLowerCase().trim();

        const questions = {
            accord_determinant_nom: (() => {
                const detTexte = (contexte && (contexte.determinant || contexte.determinat) && (contexte.determinant || contexte.determinat).texte) || '';
                const nomTexte = (contexte && contexte.nom && contexte.nom.texte) || motCibleTexte || '[nom]';
                const estErreurSurNom = cibleErreur === 'nom' || (
                    !cibleErreur &&
                    contexte && contexte.nom && erreur && erreur.mot &&
                    String(contexte.nom.texte || '').toLowerCase().trim() === String(erreur.mot || '').toLowerCase().trim() &&
                    detTexte.toLowerCase().trim() !== String(erreur.mot || '').toLowerCase().trim()
                );

                if (estErreurSurNom) {
                    return [
                        {
                            question: `Quel est le déterminant qui accompagne le nom « ${nomTexte} » ?`,
                            type: 'selection',
                            cible: 'déterminant'
                        },
                        {
                            question: 'Ce déterminant est-il singulier ou pluriel ?',
                            type: 'choix',
                            options: ['Singulier', 'Pluriel'],
                            preserveOrder: true,
                            tileClass: 'subject-number-choice'
                        },
                        {
                            question: 'Écris la correction du nom pour l\'accorder avec son déterminant :',
                            type: 'proposition',
                            cible: 'nom'
                        }
                    ];
                }

                return [
                    {
                        question: 'Quel est le nom dans cette partie de la phrase ?',
                        type: 'selection',
                        cible: 'nom'
                    },
                    {
                        question: 'Le nom est il singulier ou pluriel ?',
                        type: 'choix',
                        options: ['Singulier', 'Pluriel'],
                        preserveOrder: true,
                        tileClass: 'subject-number-choice'
                    },
                    {
                        question: 'Écris la correction du déterminant :',
                        type: 'proposition',
                        cible: 'déterminant'
                    }
                ];
            })(),
            consonne_muette_finale: [
                {
                    type: 'info',
                    titre: 'Consonne finale muette',
                    question: (erreur && erreur.explication) || 'Ce mot se termine par une consonne qu\'on n\'entend pas. Pour la retrouver, tu peux la plupart du temps chercher le féminin du mot ou un mot de la même famille.',
                    exemples: [
                        'grand → grande',
                        'chat → chatte',
                        'gros → grosse'
                    ]
                },
                {
                    question: 'Écris le mot correctement, avec sa consonne finale :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            accord_au_aux: [
                {
                    question: 'Quel est le nom concerné dans cette partie de la phrase ?',
                    type: 'selection',
                    cible: 'nom'
                },
                {
                    question: 'Ce nom est il singulier ou pluriel ?',
                    type: 'choix',
                    options: ['Singulier', 'Pluriel'],
                    preserveOrder: true,
                    tileClass: 'subject-number-choice'
                },
                {
                    question: 'Écris la bonne forme entre « au » et « aux » :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            accord_sujet_verbe: (() => {
                if (cibleErreur === 'sujet') {
                    return [
                        {
                            question: 'Quel est le verbe dans cette phrase ?',
                            type: 'selection',
                            cible: 'verbe'
                        },
                        {
                            question: `Qui est-ce qui ${verbeTexte} ?`,
                            type: 'selection',
                            cible: 'sujet'
                        },
                        {
                            question: 'Le verbe est-il au singulier ou au pluriel ?',
                            type: 'choix',
                            options: ['Singulier', 'Pluriel'],
                            preserveOrder: true,
                            tileClass: 'subject-number-choice'
                        },
                        {
                            question: 'Écris la correction du sujet :',
                            type: 'proposition',
                            cible: 'sujet'
                        }
                    ];
                }
                return [
                    {
                        question: 'Quel est le verbe dans cette phrase ?',
                        type: 'selection',
                        cible: 'verbe'
                    },
                    {
                        question: `Qui est-ce qui ${verbeTexte} ?`,
                        type: 'selection',
                        cible: 'sujet'
                    },
                    {
                        question: 'Le sujet est il singulier ou pluriel ?',
                        type: 'choix',
                        options: ['Singulier', 'Pluriel'],
                        preserveOrder: true,
                        tileClass: 'subject-number-choice'
                    },
                    ...(poserQuestionAuxiliaire ? [questionAuxiliaire] : []),
                    {
                        type: 'proposition',
                        cible: 'verbe',
                        genererQuestion: (ctx) => {
                            const nombre = ctx && ctx.nombreSujet ? ctx.nombreSujet : 'singulier';
                            return nombre === 'pluriel'
                                ? 'D\'après toi, comment faut-il écrire le verbe avec un sujet pluriel ?\nN\'oublie pas la terminaison !\nÉcris ta proposition :'
                                : 'D\'après toi, comment faut-il écrire le verbe conjugué à la bonne personne ?\nÉcris ta proposition :';
                        }
                    }
                ];
            })(),
            accord_sujet_participe: (() => {
                const participeTexte = contexte && contexte.participe ? contexte.participe.texte : (verbeTexte !== '[verbe]' ? verbeTexte : '[participe]');
                return [
                    {
                        question: 'Quel est le participe passé dans cette phrase ?',
                        type: 'selection',
                        cible: 'participe'
                    },
                    {
                        question: `Qui est-ce qui ${participeTexte} ?`,
                        type: 'selection',
                        cible: 'sujet'
                    },
                    {
                        question: 'Le sujet est-il singulier ou pluriel ?',
                        type: 'choix',
                        options: ['Singulier', 'Pluriel'],
                        preserveOrder: true,
                        tileClass: 'subject-number-choice'
                    },
                    ...(poserQuestionAuxiliaire ? [questionAuxiliaire] : []),
                    {
                        question: 'Écris la correction du participe passé :',
                        type: 'proposition',
                        cible: 'participe'
                    }
                ];
            })(),
            accord_adjectif_nom: (() => {
                const estAttribut = cibleErreur === 'attribut' || (erreur && erreur.titreAide === 'Accord sujet-attribut');
                if (estAttribut) {
                    return [
                        {
                            question: 'Quel est l\'adjectif attribut dans cette phrase ?',
                            type: 'selection',
                            cible: 'adjectif'
                        },
                        {
                            question: 'Quel est le sujet avec lequel cet adjectif s\'accorde ?',
                            type: 'selection',
                            cible: 'nom'
                        },
                        {
                            question: 'Ce sujet est-il masculin ou féminin ?',
                            type: 'choix',
                            options: ['Masculin', 'Féminin']
                        },
                        {
                            question: 'Ce sujet est-il singulier ou pluriel ?',
                            type: 'choix',
                            options: ['Singulier', 'Pluriel'],
                            preserveOrder: true,
                            tileClass: 'subject-number-choice'
                        },
                        {
                            question: 'Écris la correction de l\'adjectif :',
                            type: 'proposition',
                            cible: 'adjectif'
                        }
                    ];
                }
                if (cibleErreur === 'nom') {
                    return [
                        {
                            question: 'Quel est le nom dans cette partie de la phrase ?',
                            type: 'selection',
                            cible: 'nom'
                        },
                        {
                            question: 'Quel est l\'adjectif qui qualifie ce nom ?',
                            type: 'selection',
                            cible: 'adjectif'
                        },
                        {
                            question: 'Le nom est masculin ou féminin ?',
                            type: 'choix',
                            options: ['Masculin', 'Féminin']
                        },
                        {
                            question: 'Le nom est il singulier ou pluriel ?',
                            type: 'choix',
                            options: ['Singulier', 'Pluriel'],
                            preserveOrder: true,
                            tileClass: 'subject-number-choice'
                        },
                        {
                            question: 'Écris la correction du nom :',
                            type: 'proposition',
                            cible: 'nom'
                        }
                    ];
                }
                return [
                    {
                        question: 'Quel est l\'adjectif dans cette phrase ?',
                        type: 'selection',
                        cible: 'adjectif'
                    },
                    {
                        question: 'Quel nom qualifie cet adjectif ?',
                        type: 'selection',
                        cible: 'nom'
                    },
                    {
                        question: 'Le nom est masculin ou féminin ?',
                        type: 'choix',
                        options: ['Masculin', 'Féminin']
                    },
                    {
                        question: 'Le nom est il singulier ou pluriel ?',
                        type: 'choix',
                        options: ['Singulier', 'Pluriel'],
                        preserveOrder: true,
                        tileClass: 'subject-number-choice'
                    },
                    {
                        question: 'Écris la correction de l\'adjectif :',
                        type: 'proposition',
                        cible: 'adjectif'
                    }
                ];
            })(),
            conjugaison_verbe: (() => {
                const modeVerbe = (erreur && erreur.modeVerbe) || '';
                const estInfinitif = modeVerbe === 'infinitif';
                const base = [
                    {
                        question: `Quelle est la nature du mot "${motCibleTexte}" ?`,
                        type: 'choix',
                        options: ['Nom', 'Verbe', 'Adjectif', 'Adverbe', 'Pronom', 'Déterminant', 'Préposition', 'Conjonction'],
                        bonneReponse: 'Verbe'
                    }
                ];
                if (estInfinitif) {
                    base.push({
                        question: 'Ce verbe doit-il être conjugué ou à l\'infinitif ?',
                        type: 'choix',
                        options: ['Conjugué (il change selon le sujet)', 'À l\'infinitif (la forme de base, comme dans le dictionnaire)'],
                        bonneReponse: 'À l\'infinitif (la forme de base, comme dans le dictionnaire)'
                    });
                    base.push({
                        question: 'D\'après toi, comment faut-il écrire le verbe dans ce cas précis ?',
                        type: 'proposition',
                        cible: 'verbe'
                    });
                } else {
                    base.push({
                        question: `Qui est-ce qui ${verbeTexte} ?`,
                        type: 'selection',
                        cible: 'sujet'
                    });
                    base.push({
                        question: 'Le sujet est il singulier ou pluriel ?',
                        type: 'choix',
                        options: ['Singulier', 'Pluriel'],
                        preserveOrder: true,
                        tileClass: 'subject-number-choice'
                    });
                    if (optionsVerbesProches && bonneReponseVerbeProche) {
                        base.push({
                            question: 'Parmi ces verbes, lequel ressemble au verbe que tu voulais écrire ?',
                            type: 'choix',
                            options: optionsVerbesProches,
                            bonneReponse: bonneReponseVerbeProche,
                            autrePropositionPlaceholder: 'Autre proposition'
                        });
                    }
                    if (poserQuestionAuxiliaire) base.push(questionAuxiliaire);
                    base.push({
                        question: 'Écris la forme verbale correcte conjuguée à la bonne personne :',
                        type: 'proposition',
                        cible: 'verbe'
                    });
                }
                return base;
            })(),
            mot_inconnu: (err) => {
                const motInconnu = err && err.mot ? err.mot : 'ce mot';
                return [
                    {
                        question: `Peux-tu proposer la bonne orthographe ?`,
                        type: 'proposition',
                        cible: 'mot_inconnu'
                    }
                ];
            },
            homophone_peut_peu: [
                {
                    question: 'Peux-tu remplacer ce mot par "il est capable de" ? ',
                    type: 'choix',
                    options: ['Oui', 'Non'],
                    bonneReponse: 'Non'
                },
                {
                    question: 'Peux-tu remplacer ce mot par "beaucoup de" ? ',
                    type: 'choix',
                    options: ['Oui', 'Non'],
                    bonneReponse: 'Oui'
                },
                {
                    question: 'Si "beaucoup de" fonctionne, écris la bonne forme :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_a_a_grave: [
                {
                    question: 'Peux-tu remplacer ce mot par « avait » ? Si oui, c\'est le verbe avoir.',
                    type: 'choix',
                    options: ['Oui, « avait » fonctionne', 'Non, « avait » ne fonctionne pas'],
                    bonneReponse: 'Oui, « avait » fonctionne'
                },
                {
                    question: 'Puisque « avait » fonctionne, écris la forme correcte du verbe avoir :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_a_a_sans: [
                {
                    question: 'Peux-tu remplacer ce mot par « avait » ? Si non, c\'est la préposition.',
                    type: 'choix',
                    options: ['Oui, « avait » fonctionne', 'Non, « avait » ne fonctionne pas'],
                    bonneReponse: 'Non, « avait » ne fonctionne pas'
                },
                {
                    question: 'Puisque « avait » ne fonctionne pas, écris la préposition correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_son_sont: [
                {
                    question: 'Peux-tu remplacer ce mot par « étaient » ? Si oui, c\'est le verbe être.',
                    type: 'choix',
                    options: ['Oui, « étaient » fonctionne', 'Non, « étaient » ne fonctionne pas'],
                    bonneReponse: 'Oui, « étaient » fonctionne'
                },
                {
                    question: 'Puisque « étaient » fonctionne, écris la forme correcte du verbe être :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_sont_son: [
                {
                    question: 'Peux-tu remplacer ce mot par « mon » ou « ton » ? Si oui, c\'est un déterminant.',
                    type: 'choix',
                    options: ['Oui, « mon/ton » fonctionne', 'Non, « mon/ton » ne fonctionne pas'],
                    bonneReponse: 'Oui, « mon/ton » fonctionne'
                },
                {
                    question: 'Puisque « mon/ton » fonctionne, écris le déterminant correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_on_ont: [
                {
                    question: 'Peux-tu remplacer ce mot par « avaient » ? Si oui, c\'est le verbe avoir.',
                    type: 'choix',
                    options: ['Oui, « avaient » fonctionne', 'Non, « avaient » ne fonctionne pas'],
                    bonneReponse: 'Oui, « avaient » fonctionne'
                },
                {
                    question: 'Puisque « avaient » fonctionne, écris la forme correcte du verbe avoir :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ont_on: [
                {
                    question: 'Peux-tu remplacer ce mot par « il » ou « elle » ? Si oui, c\'est un pronom sujet.',
                    type: 'choix',
                    options: ['Oui, « il/elle » fonctionne', 'Non, « il/elle » ne fonctionne pas'],
                    bonneReponse: 'Oui, « il/elle » fonctionne'
                },
                {
                    question: 'Puisque « il/elle » fonctionne, écris le pronom correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_et_est: [
                {
                    question: 'Peux-tu remplacer ce mot par « était » ? Si oui, c\'est le verbe être.',
                    type: 'choix',
                    options: ['Oui, « était » fonctionne', 'Non, « était » ne fonctionne pas'],
                    bonneReponse: 'Oui, « était » fonctionne'
                },
                {
                    question: 'Puisque « était » fonctionne, écris la forme correcte du verbe être :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_est_et: [
                {
                    question: 'Est-ce qu\'on relie deux éléments ? Si oui, c\'est la conjonction « et ».',
                    type: 'choix',
                    options: ['Oui, on relie deux éléments', 'Non, ce n\'est pas le cas'],
                    bonneReponse: 'Oui, on relie deux éléments'
                },
                {
                    question: 'Puisqu\'on relie deux éléments, écris la conjonction correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_cest_sest: [
                {
                    question: 'Peux-tu dire « cela est » ou « c\'était » ? (Astuce : le C sert à montrer quelque chose).',
                    type: 'choix',
                    options: ['Oui, je peux montrer avec « cela est »', 'Non, cela ne veut rien dire'],
                    bonneReponse: 'Oui, je peux montrer avec « cela est »'
                },
                {
                    question: 'Bravo ! Puisque tu peux le remplacer par « cela », quelle est la forme qui commence par C ?',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_sest_cest: [
                {
                    question: 'Peux-tu dire « il s\'était » ou « je me suis » ? (Astuce : le S est utilisé pour une action qui se fait).',
                    type: 'choix',
                    options: ['Oui, c\'est une action (il s\'était)', 'Non, ce n\'est pas une action'],
                    bonneReponse: 'Oui, c\'est une action (il s\'était)'
                },
                {
                    question: 'Exact ! C\'est un verbe. Écris la forme qui commence par S (comme dans "se") :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ce_se: [
                {
                    question: 'Ce mot est-il devant un verbe pronominal (il ___ lave) ?',
                    type: 'choix',
                    options: ['Oui, devant un verbe', 'Non, devant un nom'],
                    bonneReponse: 'Oui, devant un verbe'
                },
                {
                    question: 'Devant un verbe pronominal, écris le pronom correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_se_ce: [
                {
                    question: 'Ce mot est-il devant un nom (___ matin, ___ livre) ?',
                    type: 'choix',
                    options: ['Oui, devant un nom', 'Non, devant un verbe'],
                    bonneReponse: 'Oui, devant un nom'
                },
                {
                    question: 'Devant un nom, écris le déterminant correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ou_ou_grave: [
                {
                    question: 'Est-ce qu\'on exprime un choix (l\'un OU l\'autre) ? Si oui, c\'est « ou » sans accent.',
                    type: 'choix',
                    options: ['Oui, c\'est un choix', 'Non, c\'est un lieu ou un moment'],
                    bonneReponse: 'Non, c\'est un lieu ou un moment'
                },
                {
                    question: 'Puisque c\'est un lieu ou un moment, écris le mot correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ou_grave_ou: [
                {
                    question: 'Peux-tu remplacer par « ou bien » ? Si oui, c\'est la conjonction « ou ».',
                    type: 'choix',
                    options: ['Oui, « ou bien » fonctionne', 'Non, « ou bien » ne fonctionne pas'],
                    bonneReponse: 'Oui, « ou bien » fonctionne'
                },
                {
                    question: 'Puisque « ou bien » fonctionne, écris la conjonction correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_la_la_grave: [
                {
                    question: 'Peux-tu remplacer ce mot par « ici » ? Si oui, c\'est l\'adverbe « là ».',
                    type: 'choix',
                    options: ['Oui, « ici » fonctionne', 'Non, « ici » ne fonctionne pas'],
                    bonneReponse: 'Oui, « ici » fonctionne'
                },
                {
                    question: 'Puisque « ici » fonctionne, écris l\'adverbe correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_la_grave_la: [
                {
                    question: 'Peux-tu remplacer ce mot par « le » ou « une » ? Si oui, c\'est le déterminant « la ».',
                    type: 'choix',
                    options: ['Oui, « le/une » fonctionne', 'Non, c\'est un lieu'],
                    bonneReponse: 'Oui, « le/une » fonctionne'
                },
                {
                    question: 'Puisque c\'est un déterminant, écris la forme correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ces_ses: [
                {
                    question: 'Peux-tu remplacer par « mes » ou « tes » ? Si oui, c\'est le possessif « ses ».',
                    type: 'choix',
                    options: ['Oui, « mes/tes » fonctionne', 'Non, je montre quelque chose'],
                    bonneReponse: 'Oui, « mes/tes » fonctionne'
                },
                {
                    question: 'Puisque c\'est possessif, écris le déterminant correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ses_ces: [
                {
                    question: 'Peux-tu remplacer par « ce » ou « cet » au singulier ? Si oui, c\'est le démonstratif « ces ».',
                    type: 'choix',
                    options: ['Oui, « ce/cet » fonctionne', 'Non, c\'est possessif'],
                    bonneReponse: 'Oui, « ce/cet » fonctionne'
                },
                {
                    question: 'Puisque c\'est démonstratif, écris le déterminant correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_sa_ca: [
                {
                    question: 'Peux-tu remplacer par « cela » ? Si oui, c\'est le pronom « ça ».',
                    type: 'choix',
                    options: ['Oui, « cela » fonctionne', 'Non, c\'est devant un nom'],
                    bonneReponse: 'Oui, « cela » fonctionne'
                },
                {
                    question: 'Puisque « cela » fonctionne, écris le pronom correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ca_sa: [
                {
                    question: 'Peux-tu remplacer par « ma » ou « ta » ? Si oui, c\'est le possessif « sa ».',
                    type: 'choix',
                    options: ['Oui, « ma/ta » fonctionne', 'Non, c\'est un pronom'],
                    bonneReponse: 'Oui, « ma/ta » fonctionne'
                },
                {
                    question: 'Puisque c\'est possessif, écris le déterminant correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_peu_peut: [
                {
                    question: 'Peux-tu remplacer par « beaucoup » ? Si oui, c\'est la quantité « peu ».',
                    type: 'choix',
                    options: ['Oui, « beaucoup » fonctionne', 'Non, c\'est un verbe'],
                    bonneReponse: 'Non, c\'est un verbe'
                },
                {
                    question: 'Puisque c\'est le verbe pouvoir, écris la forme correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_peux_peut: [
                {
                    question: 'Le sujet est-il à la 3e personne (il / elle / on) ?',
                    type: 'choix',
                    options: ['Oui, sujet il/elle/on (avec -t)', 'Non, sujet je/tu (avec -x)'],
                    bonneReponse: 'Oui, sujet il/elle/on (avec -t)'
                },
                {
                    question: 'À la 3e personne, écris la forme qui se termine par -t :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_peut_peux: [
                {
                    question: 'Le sujet est-il « je » ou « tu » ?',
                    type: 'choix',
                    options: ['Oui, sujet je/tu (avec -x)', 'Non, sujet il/elle/on (avec -t)'],
                    bonneReponse: 'Oui, sujet je/tu (avec -x)'
                },
                {
                    question: 'Avec « je » ou « tu », écris la forme qui se termine par -x :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_peux_peu: [
                {
                    question: 'Peux-tu remplacer ce mot par "beaucoup de" ?',
                    type: 'choix',
                    options: ['Oui, une quantité (beaucoup)', 'Non, le verbe pouvoir'],
                    bonneReponse: 'Oui, une quantité (beaucoup)'
                },
                {
                    question: 'Puisque "beaucoup de" fonctionne, écris la bonne forme :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ces_cest: [
                {
                    question: 'Peux-tu remplacer par « cela est » ou « c\'était » ?',
                    type: 'choix',
                    options: ['Oui, je peux dire « cela est »', 'Non, c\'est devant un nom pluriel'],
                    bonneReponse: 'Oui, je peux dire « cela est »'
                },
                {
                    question: 'Puisque tu peux dire « cela est », écris le présentatif correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ses_cest: [
                {
                    question: 'Peux-tu remplacer par « cela est » ou « c\'était » ?',
                    type: 'choix',
                    options: ['Oui, je peux dire « cela est »', 'Non, c\'est possessif (les siens)'],
                    bonneReponse: 'Oui, je peux dire « cela est »'
                },
                {
                    question: 'Puisque tu peux dire « cela est », écris la forme correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_cest_ses: [
                {
                    question: 'Peux-tu remplacer par « mes » ou « tes » devant un nom pluriel ?',
                    type: 'choix',
                    options: ['Oui, « mes/tes » fonctionne', 'Non, cela signifie « cela est »'],
                    bonneReponse: 'Oui, « mes/tes » fonctionne'
                },
                {
                    question: 'Puisque c\'est possessif, écris le déterminant correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ce_cest: [
                {
                    question: 'Peux-tu remplacer par « cela est » ou « c\'était » ?',
                    type: 'choix',
                    options: ['Oui, je peux dire « cela est »', 'Non, c\'est devant un nom'],
                    bonneReponse: 'Oui, je peux dire « cela est »'
                },
                {
                    question: 'Puisque tu peux dire « cela est », écris la forme correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_se_cest: [
                {
                    question: 'Peux-tu remplacer par « cela est » ou « c\'était » ?',
                    type: 'choix',
                    options: ['Oui, je peux dire « cela est »', 'Non, c\'est un pronom réfléchi'],
                    bonneReponse: 'Oui, je peux dire « cela est »'
                },
                {
                    question: 'Puisque tu peux dire « cela est », écris la forme correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_mai_mais: [
                {
                    question: 'Est-ce qu\'on exprime une opposition (pourtant) ou le mois de l\'année ?',
                    type: 'choix',
                    options: ['Une opposition (pourtant)', 'Le mois de l\'année'],
                    bonneReponse: 'Une opposition (pourtant)'
                },
                {
                    question: 'Pour exprimer une opposition, écris la conjonction correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_mes_mais: [
                {
                    question: 'Peux-tu remplacer par « pourtant » (opposition) ou par « tes/ses » (possessif) ?',
                    type: 'choix',
                    options: ['Par « pourtant » (opposition)', 'Par « tes/ses » (possessif)'],
                    bonneReponse: 'Par « pourtant » (opposition)'
                },
                {
                    question: 'Pour marquer l\'opposition, écris la conjonction correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_mais_mes: [
                {
                    question: 'Peux-tu remplacer par « tes » ou « ses » devant un nom pluriel ?',
                    type: 'choix',
                    options: ['Oui, « tes/ses » fonctionne (possessif)', 'Non, c\'est une opposition'],
                    bonneReponse: 'Oui, « tes/ses » fonctionne (possessif)'
                },
                {
                    question: 'Puisque c\'est possessif, écris le déterminant pluriel correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_soi_soit: [
                {
                    question: 'Est-ce le verbe être (qu\'il soit...) ou le pronom (en soi, pour soi) ?',
                    type: 'choix',
                    options: ['Le verbe être (qu\'il soit)', 'Le pronom (en soi)'],
                    bonneReponse: 'Le verbe être (qu\'il soit)'
                },
                {
                    question: 'Puisque c\'est le verbe être, écris la forme correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_soit_soi: [
                {
                    question: 'Est-ce le pronom réfléchi invariable (chacun pour soi, en soi) ?',
                    type: 'choix',
                    options: ['Oui, le pronom invariable', 'Non, c\'est le verbe être'],
                    bonneReponse: 'Oui, le pronom invariable'
                },
                {
                    question: 'Écris le pronom invariable correct :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_son_sons: [
                {
                    question: 'Ce mot est-il au pluriel (les sons) ou au singulier (un son / son livre) ?',
                    type: 'choix',
                    options: ['Au pluriel (les sons)', 'Au singulier (son)'],
                    bonneReponse: 'Au pluriel (les sons)'
                },
                {
                    question: 'Écris la forme plurielle correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_ca_ca: [
                {
                    question: 'Pour remplacer « cela », quelle lettre avec signe utilise-t-on ?',
                    type: 'choix',
                    options: ['La lettre C avec cédille (ç)', 'La lettre C simple'],
                    bonneReponse: 'La lettre C avec cédille (ç)'
                },
                {
                    question: 'Écris le pronom correct avec la cédille :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_leur_leurs: [
                {
                    question: 'Le nom qui suit est-il au singulier ou au pluriel ?',
                    type: 'choix',
                    options: ['Au pluriel (leurs + nom pluriel)', 'Au singulier (leur + nom singulier)'],
                    bonneReponse: 'Au pluriel (leurs + nom pluriel)'
                },
                {
                    question: 'Devant un nom pluriel, écris le déterminant avec -s :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_leurs_leur: [
                {
                    question: 'Ce mot est-il devant un nom singulier ou devant un verbe (sans -s) ?',
                    type: 'choix',
                    options: ['Oui, singulier ou verbe (sans -s)', 'Non, devant un nom pluriel (avec -s)'],
                    bonneReponse: 'Oui, singulier ou verbe (sans -s)'
                },
                {
                    question: 'Écris la forme sans -s :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_quand_quant: [
                {
                    question: 'Ce mot est-il suivi de « à », « au » ou « aux » (quant à) ?',
                    type: 'choix',
                    options: ['Oui, suivi de « à » (quant à)', 'Non, indique le moment (quand)'],
                    bonneReponse: 'Oui, suivi de « à » (quant à)'
                },
                {
                    question: 'Dans la locution « quant à », écris le mot avec un t final :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ],
            homophone_tout_tous: [
                {
                    question: 'Le mot qui suit est-il au pluriel (tous les...) ou au singulier (tout le...) ?',
                    type: 'choix',
                    options: ['Au pluriel (tous les...)', 'Au singulier (tout le...)'],
                    bonneReponse: 'Au pluriel (tous les...)'
                },
                {
                    question: 'Écris la forme plurielle correcte :',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ]
        };

        // Les homophones ont leur propre parcours guidé (test de substitution + input).
        // On les vérifie AVANT parcoursType pour éviter qu'un homophone
        // (a/à, son/sont, on/ont, et/est…) ne tombe dans
        // « Quel est le verbe dans cette phrase ? ».
        // En mode oral, erreur.type est 'reference_orale_attendue' mais
        // erreur.parcoursType porte le type homophone (ex: 'homophone_a_a_grave').
        const erreurType = erreur && erreur.type;
        const parcoursTypeHomophone = (erreur && erreur.parcoursType && erreur.parcoursType.startsWith('homophone_'))
            ? erreur.parcoursType
            : null;
        const estHomophone = (erreurType && erreurType.startsWith('homophone_')) || parcoursTypeHomophone;
        if (estHomophone) {
            // Clé de routage : priorité au parcoursType (mode oral), sinon erreur.type
            const cleHomophone = parcoursTypeHomophone || erreurType;
            // Chemin 1 : parcours guidé dédié (a/à, peut/peu…)
            if (questions[cleHomophone]) {
                const qType = questions[cleHomophone];
                if (typeof qType === 'function') return qType(erreur);
                if (Array.isArray(qType) && qType.length > 0) return qType;
            }
            // Chemin 2 : règle + input direct (autres homophones)
            if (erreur.regle || erreur.explication) {
                return [
                    {
                        type: 'info',
                        titre: erreur.titreAide || 'Règle à observer',
                        question: erreur.regle || erreur.explication,
                        exemples: Array.isArray(erreur.exemples) ? erreur.exemples : []
                    },
                    {
                        question: erreur.spanLongueur > 1
                            ? 'Comment faut-il écrire ce groupe correctement ?'
                            : 'Comment faut-il écrire ce mot correctement ?',
                        type: 'proposition',
                        cible: 'mot_inconnu'
                    }
                ];
            }
        }

        // Si l'erreur porte un parcoursType (accord détecté via corpus),
        // on route directement vers les questions guidées correspondantes.
        const parcoursType = erreur && erreur.parcoursType;
        if (parcoursType && questions[parcoursType]) {
            const qType = questions[parcoursType];
            if (typeof qType === 'function') return qType(erreur);
            if (Array.isArray(qType) && qType.length > 0) return qType;
        }

        const questionsType = questions[erreurType];

        if (typeof questionsType === 'function') {
            return questionsType(erreur);
        }

        if (Array.isArray(questionsType) && questionsType.length > 0) {
            return questionsType;
        }

        if (erreur && erreur.regle) {
            return [
                {
                    type: 'info',
                    titre: erreur.titreAide || 'Règle à observer',
                    question: erreur.regle,
                    exemples: Array.isArray(erreur.exemples) ? erreur.exemples : []
                },
                {
                    question: erreur.spanLongueur > 1
                        ? 'Comment faut-il écrire ce groupe correctement ?'
                        : 'Comment faut-il écrire ce mot correctement ?',
                    type: 'proposition',
                    cible: 'mot_inconnu'
                }
            ];
        }

        return [];
    }

    categories.genererQuestionAide = genererQuestionAide;

    function verifierReponse(question, reponse, contexte) {
        switch (question.type) {
            case 'selection':
                return this.verifierSelection(question.cible, reponse, contexte);
            case 'choix':
                return this.verifierChoix(question, reponse, contexte);
            default:
                return false;
        }
    }

    categories.verifierReponse = verifierReponse;

    function verifierSelection(cible, reponse, contexte) {
        // PRIORITÉ : le corpus est la source de vérité.
        // Si le contexte contient des données du corpus pour ce rôle
        // (sujet, verbe, nom, adjectif, participe), on les utilise
        // car getWordData peut se tromper sur les formes fléchies
        // (ex: "fleuri" → adjectif pour le dictionnaire, mais verbe
        // dans le corpus ; "transporte" → pas dans le dictionnaire).
        const reponseNorm = (reponse || '').toLowerCase().trim();

        if (contexte) {
            const selectionIndex = Number.isInteger(contexte.selectionIndex) ? contexte.selectionIndex : null;
            const indexParId = contexte.tokenIndexParId instanceof Map ? contexte.tokenIndexParId : null;
            const matchTexte = (item) => item && item.texte && item.texte.toLowerCase().trim() === reponseNorm;
            const matchIndex = (item) => {
                if (!item || !Number.isInteger(selectionIndex)) return false;
                const indexItem = Number.isInteger(item.indexMot)
                    ? item.indexMot
                    : Number.isInteger(item.position)
                        ? item.position
                        : null;
                return Number.isInteger(indexItem) && indexItem === selectionIndex;
            };
            const matchId = (item) => {
                if (!item || !Number.isInteger(selectionIndex)) return false;
                const id = item && item.donnees ? Number(item.donnees.id) : NaN;
                if (!indexParId || !Number.isInteger(id) || !indexParId.has(id)) return false;
                return indexParId.get(id) === selectionIndex;
            };
            const matchItem = (item) => matchIndex(item) || matchId(item) || matchTexte(item);
            const rolesParCible = {
                verbe: ['verbe'],
                participe: ['participe', 'verbe'],
                sujet: ['sujet'],
                nom: ['nom'],
                adjectif: ['adjectif'],
                'déterminant': ['determinat', 'determinant', 'déterminant'],
                determinant: ['determinat', 'determinant', 'déterminant']
            };
            const roles = rolesParCible[cible] || [];
            const itemsCibles = roles
                .map((role) => contexte[role])
                .filter(Boolean);

            // Règle générale corpus-first : si le rôle ciblé est renseigné
            // dans le contexte corpus, toute sélection qui matche cet item
            // (index, id corpus ou texte) est acceptée immédiatement.
            if (itemsCibles.some((item) => matchItem(item))) return true;
            if (cible === 'sujet' && Array.isArray(contexte.sujets) && contexte.sujets.some((item) => matchItem(item))) {
                return true;
            }

            switch (cible) {
                case 'verbe':
                case 'participe':
                    // Corpus-first : le corpus a identifié le token à la position
                    // de l'erreur comme étant le verbe/participe recherché.
                    // Si l'élève sélectionne exactement ce mot (erreur.mot = saisie
                    // fautive affichée sur la tuile), l'accepter sans condition
                    // supplémentaire — indépendamment de ce que contient contexte.verbe.
                    // Cela résout les cas où contexteAccord.verbe.texte est mal
                    // synchronisé avec la saisie réelle (timing, corpus vs saisie).
                    if (contexte.erreur) {
                        const motErreur = String(contexte.erreur.mot || '').toLowerCase().trim();
                        const typeErreur = String(
                            contexte.erreur.parcoursType || contexte.erreur.type || ''
                        ).toLowerCase();
                        const estParcoursVerbe =
                            typeErreur === 'accord_sujet_verbe' ||
                            typeErreur === 'conjugaison_verbe' ||
                            typeErreur === 'accord_sujet_participe';
                        if (motErreur && estParcoursVerbe && reponseNorm === motErreur) return true;
                    }
                    break;
                case 'sujet':
                    break;
                case 'nom':
                    if (contexte.erreur) {
                        const motErreur = String(contexte.erreur.mot || '').toLowerCase().trim();
                        const typeErreur = String(
                            contexte.erreur.parcoursType || contexte.erreur.type || ''
                        ).toLowerCase();
                        const cibleErr = String(contexte.erreur.cibleErreur || '').toLowerCase();
                        if (typeErreur === 'accord_adjectif_nom' && cibleErr === 'nom' && motErreur && reponseNorm === motErreur) return true;
                    }
                    break;
                case 'adjectif':
                    if (contexte.erreur) {
                        const motErreur = String(contexte.erreur.mot || '').toLowerCase().trim();
                        const typeErreur = String(
                            contexte.erreur.parcoursType || contexte.erreur.type || ''
                        ).toLowerCase();
                        const cibleErr = String(contexte.erreur.cibleErreur || '').toLowerCase();
                        if (typeErreur === 'accord_adjectif_nom' && cibleErr !== 'nom' && motErreur && reponseNorm === motErreur) return true;
                    }
                    break;
                case 'déterminant':
                case 'determinant':
                    break;
            }
        }

        // Fallback : dictionnaire (moins fiable pour les formes fléchies)
        // IMPORTANT : si le contexte contient déjà un item pour ce rôle
        // (ex: contexte.verbe = "viendront"), on ne doit PAS accepter
        // n'importe quel mot du bon type via le dictionnaire (ex: "pense"
        // est aussi un verbe mais ce n'est pas le verbe erroné ciblé).
        // Le fallback n'est utile que quand le contexte manque l'item.
        const aItemContexte = contexte && (
            (cible === 'verbe' && contexte.verbe) ||
            (cible === 'participe' && (contexte.participe || contexte.verbe)) ||
            (cible === 'sujet' && contexte.sujet) ||
            (cible === 'nom' && contexte.nom) ||
            (cible === 'adjectif' && contexte.adjectif) ||
            ((cible === 'déterminant' || cible === 'determinant') && (contexte.determinant || contexte.determinat))
        );
        if (aItemContexte) return false;

        // Corpus-first strict : quand on est dans un parcours guidé adossé
        // au corpus, on ne valide jamais via le dictionnaire de la saisie.
        const parcoursTypeErreur = String(
            (contexte && contexte.erreur && (contexte.erreur.parcoursType || contexte.erreur.type)) || ''
        ).toLowerCase().trim();
        const estParcoursCorpus = !!parcoursTypeErreur;
        if (estParcoursCorpus) return false;

        const motData = this.getWordData(reponse);
        if (!motData) return false;

        switch (cible) {
            case 'nom':
                return motData.type === 'nom';
            case 'verbe':
            case 'participe':
                return motData.type === 'verbe';
            case 'sujet':
                return motData.type === 'nom' || motData.type === 'pronom';
            case 'adjectif':
                return motData.type === 'adjectif';
            case 'déterminant':
            case 'determinant':
                return motData.type === 'déterminant' || motData.type === 'determinant';
            default:
                return false;
        }
    }

    categories.verifierSelection = verifierSelection;

    function verifierChoix(question, reponse, contexte) {
        const texteQuestion = (question.question || '').toLowerCase();
        const reponseNorm = (reponse || '').toLowerCase().trim();
        const questionSurNom = texteQuestion.includes('le nom est') || texteQuestion.includes('ce nom est');
        const questionSurSujet = texteQuestion.includes('le sujet est');

        // ── Validation corpus-first pour toutes les questions de choix homophones ──
        // Le corpus (parcoursType + correction) est la source de vérité.
        // Pour chaque parcours, on définit : quelle question-test est posée
        // et quelle réponse est juste SELON LE CORPUS — indépendamment de
        // la saisie fautive ou d'une éventuelle inversion de bonneReponse.
        //
        // Structure de la table :
        //   parcoursType → [
        //     { motifQuestion: string, bonneReponseOui: bool },
        //     ...
        //   ]
        // motifQuestion  : sous-chaîne distinctive de la question (en minuscules)
        // bonneReponseOui: true si la bonne réponse commence par "oui", false si "non"
        const REGLES_CORPUS = {
            // ces → ses : test mes/tes → OUI (ses est possessif)
            'homophone_ces_ses':   [{ motif: 'mes » ou « tes »',         oui: true  }],
            // ses → ces : test ce/cet  → OUI (ces est démonstratif)
            'homophone_ses_ces':   [{ motif: 'ce » ou « cet »',          oui: true  }],
            // ce → se : devant un verbe pronominal → OUI
            'homophone_ce_se':     [{ motif: 'devant un verbe pronominal', oui: true  }],
            // se → ce : devant un nom → OUI
            'homophone_se_ce':     [{ motif: 'devant un nom',             oui: true  }],
            // a → à : avait fonctionne → OUI
            'homophone_ces_ses_correction_a': [],  // non utilisé directement
            'homophone_a_a_grave': [{ motif: 'avait »',                   oui: true  }],
            // à → a : avait ne fonctionne pas → NON
            'homophone_a_a_sans':  [{ motif: 'avait »',                   oui: false }],
            // son → sont : étaient fonctionne → OUI
            'homophone_son_sont':  [{ motif: 'étaient »',                 oui: true  }],
            // sont → son : mon/ton fonctionne → OUI
            'homophone_sont_son':  [{ motif: 'mon/ton »',                 oui: true  }],
            // on → ont : avaient fonctionne → OUI
            'homophone_on_ont':    [{ motif: 'avaient »',                 oui: true  }],
            // ont → on : il/elle fonctionne → OUI
            'homophone_ont_on':    [{ motif: 'il/elle »',                 oui: true  }],
            // et → est : était fonctionne → OUI
            'homophone_et_est':    [{ motif: 'était »',                   oui: true  }],
            // est → et : on relie deux éléments → OUI
            'homophone_est_et':    [{ motif: 'relie deux éléments',       oui: true  }],
            // c'est → s'est : s'était fonctionne → OUI
            'homophone_cest_sest': [{ motif: 's\'était »',                oui: true  }],
            // s'est → c'est : cela est fonctionne → OUI
            'homophone_sest_cest': [{ motif: 'cela est »',                oui: true  }],
            // ou → où : lieu ou moment → NON à "choix"
            'homophone_ou_ou_grave':  [{ motif: 'l\'un ou l\'autre',      oui: false }],
            // où → ou : ou bien fonctionne → OUI
            'homophone_ou_grave_ou':  [{ motif: 'ou bien »',              oui: true  }],
            // la → là : ici fonctionne → OUI
            'homophone_la_la_grave':  [{ motif: 'ici »',                  oui: true  }],
            // là → la : le/une fonctionne → OUI
            'homophone_la_grave_la':  [{ motif: 'le/une »',               oui: true  }],
            // sa → ça : cela fonctionne → OUI
            'homophone_sa_ca':    [{ motif: 'cela »',                     oui: true  }],
            // ça → sa : ma/ta fonctionne → OUI
            'homophone_ca_sa':    [{ motif: 'ma/ta »',                    oui: true  }],
            // peu → peut : beaucoup fonctionne → NON (c'est un verbe)
            'homophone_peu_peut': [{ motif: 'beaucoup »',                 oui: false }],
            // peut → peu : beaucoup fonctionne → OUI (c'est une quantité)
            'homophone_peut_peu': [{ motif: 'beaucoup »',                 oui: true  }],
            'homophone_peux_peut': [{ motif: 'sujet il/elle/on',          oui: true  }],
            'homophone_peut_peux': [{ motif: 'sujet je/tu',               oui: true  }],
            'homophone_ces_cest': [{ motif: 'cela est',                   oui: true  }],
            'homophone_ses_cest': [{ motif: 'cela est',                   oui: true  }],
            'homophone_cest_ses': [{ motif: 'mes/tes',                    oui: true  }],
            'homophone_ce_cest':  [{ motif: 'cela est',                   oui: true  }],
            'homophone_se_cest':  [{ motif: 'cela est',                   oui: true  }],
            'homophone_mai_mais': [{ motif: 'opposition',                 oui: true  }],
            'homophone_mes_mais': [{ motif: 'pourtant',                   oui: true  }],
            'homophone_mais_mes': [{ motif: 'tes/ses',                    oui: true  }],
            'homophone_soi_soit': [{ motif: 'verbe être',                 oui: true  }],
            'homophone_soit_soi': [{ motif: 'pronom invariable',          oui: true  }],
            'homophone_son_sons': [{ motif: 'pluriel',                    oui: true  }],
            'homophone_ca_ca':    [{ motif: 'cédille',                    oui: true  }],
            'homophone_leur_leurs': [{ motif: 'pluriel',                  oui: true  }],
            'homophone_leurs_leur': [{ motif: 'singulier',                oui: true  }],
            'homophone_quand_quant': [{ motif: 'quant à',                 oui: true  }],
            'homophone_tout_tous':  [{ motif: 'pluriel',                  oui: true  }]
        };

        const correctionCible = String((contexte && contexte.erreur && contexte.erreur.correction) || '').toLowerCase().trim();
        const parcoursType = (
            (contexte && contexte.erreur && contexte.erreur.parcoursType) ||
            (contexte && contexte.erreur && contexte.erreur.type) || ''
        ).toLowerCase().trim();
        const estParcoursCorpus = !!parcoursType;

        const regles = REGLES_CORPUS[parcoursType] || [];
        for (const regle of regles) {
            if (texteQuestion.includes(regle.motif)) {
                const estOui = reponseNorm.startsWith('oui');
                const estNon = reponseNorm.startsWith('non');
                if (!estOui && !estNon) break; // autre type de réponse, laisser passer
                return regle.oui ? estOui : estNon;
            }
        }

        if (typeof question.bonneReponse === 'string' && question.bonneReponse.trim()) {
            return reponseNorm === question.bonneReponse.toLowerCase().trim();
        }

        if (texteQuestion.includes('auxiliaire')) {
            return true;
        }

        if (
            texteQuestion.includes('seul ou plusieurs') ||
            texteQuestion.includes('seul ou sont-ils plusieurs') ||
            texteQuestion.includes('singulier ou pluriel') ||
            (texteQuestion.includes('singulier') && texteQuestion.includes('pluriel')) ||
            texteQuestion.includes('comment doit-on écrire le déterminant') ||
            texteQuestion.includes("comment doit-on écrire l'adjectif")
        ) {
            // PRIORITÉ : le corpus (nombreSujet) est la source de vérité.
            // On le consulte EN PREMIER car mot.donnees.nombre peut venir
            // de la saisie fautive de l'utilisateur (ex: "fourmi" au lieu
            // de "fourmis" → donnees.nombre = singulier → mauvaise réponse).
            const nombreConnu = (contexte && (contexte.nombreSujet || (contexte.erreur && contexte.erreur.nombreSujet))) || null;
            if (nombreConnu === 'pluriel') {
                return reponse === 'Pluriel' || reponse === 'Plusieurs' || reponse === 'Au pluriel';
            }
            if (nombreConnu === 'singulier') {
                return reponse === 'Singulier' || reponse === 'Un seul' || reponse === 'Au singulier';
            }

            if (estParcoursCorpus) return false;

            // Fallback : si le corpus n'a pas fourni nombreSujet,
            // utiliser les données du mot (potentiellement de la saisie).
            let mot = null;
            if (questionSurNom) {
                mot = contexte.nom || contexte.motCible;
            } else if (questionSurSujet) {
                mot = contexte.sujet || contexte.motCible;
            } else {
                mot = contexte.sujet || contexte.nom || contexte.motCible;
            }
            if (mot && mot.donnees) {
                const estPluriel = this.normaliserNombre(mot.donnees.nombre) === 'pluriel';
                return (
                    ((reponse === 'Pluriel' || reponse === 'Plusieurs' || reponse === 'Au pluriel') && estPluriel) ||
                    ((reponse === 'Singulier' || reponse === 'Un seul' || reponse === 'Au singulier') && !estPluriel)
                );
            }

            return false;
        }

        if (texteQuestion.includes('masculin ou féminin') || (texteQuestion.includes('masculin') && texteQuestion.includes('féminin'))) {
            // PRIORITÉ : le corpus (genreSujet) est la source de vérité.
            const genreConnu = (contexte && contexte.genreSujet) || null;
            if (genreConnu === 'féminin') return reponse === 'Féminin';
            if (genreConnu === 'masculin') return reponse === 'Masculin';

            if (estParcoursCorpus) {
                const correction = (contexte && contexte.erreur && typeof contexte.erreur.correction === 'string')
                    ? contexte.erreur.correction.toLowerCase().trim()
                    : '';
                if (correction) {
                    if (correction.endsWith('es') || correction.endsWith('e')) {
                        return reponse === 'Féminin';
                    }
                    if (correction.endsWith('s') || correction.endsWith('x')) {
                        return reponse === 'Masculin';
                    }
                }
                return false;
            }

            // Fallback : données du mot (potentiellement de la saisie fautive)
            const mot = questionSurNom
                ? (contexte.nom || contexte.motCible)
                : (contexte.sujet || contexte.nom || contexte.motCible);
            if (mot && mot.donnees) {
                const genreNormalise = this.normaliserGenre(mot.donnees.genre);
                if (genreNormalise === 'féminin') return reponse === 'Féminin';
                if (genreNormalise === 'masculin') return reponse === 'Masculin';
            }

            // Dernier fallback : déduire depuis la correction
            const correction = (contexte && contexte.erreur && typeof contexte.erreur.correction === 'string')
                ? contexte.erreur.correction.toLowerCase().trim()
                : '';
            if (correction) {
                if (correction.endsWith('es') || correction.endsWith('e')) {
                    return reponse === 'Féminin';
                }
                if (correction.endsWith('s') || correction.endsWith('x')) {
                    return reponse === 'Masculin';
                }
            }

            return reponse === 'Féminin' || reponse === 'Masculin';
        }

        return false;
    }

    categories.verifierChoix = verifierChoix;

})(typeof window !== 'undefined' ? window : globalThis);
