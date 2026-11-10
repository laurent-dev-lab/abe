/**
 * Catégorie: détection de lettres manquantes ou en trop pour la dictée orale.
 */
(function (global) {
    'use strict';

    const categories = global.AbeAnalyseurCategories = global.AbeAnalyseurCategories || {};

    /**
     * Détecte si le mot saisi est un préfixe du mot attendu (lettre manquante).
     * Ex: tron → tronc
     *
     * @param {string} motSaisi   - Mot écrit par l'élève
     * @param {string} motAttendu - Mot attendu par la dictée
     * @returns {object|null}     - { explication, titreAide, memo } ou null
     */
    // Suffixes purement grammaticaux (pluriel, conjugaison) — ne pas traiter comme "lettre manquante"
    const SUFFIXES_GRAMMATICAUX = ['nt', 'ez', 'ons', 's', 'x'];

    // Terminaisons verbales complexes : si la lettre oubliée tombe à l'intérieur
    // d'une de ces terminaisons sur un verbe, c'est une erreur de conjugaison/accord
    // et non un simple oubli de lettre au milieu du radical.
    const TERMINAISONS_VERBALES_COMPLEXES = [
        'eraient', 'erions', 'eriez', 'eront', 'erons', 'erais', 'erait', 'eras', 'erez', 'erai',
        'iraient', 'irions', 'iriez', 'iront', 'irons', 'irais', 'irait', 'iras', 'irez', 'irai',
        'raient', 'rions', 'riez', 'ront', 'rons', 'rais', 'rait',
        'assions', 'assiez', 'assent', 'asses', 'asse',
        'issions', 'issiez', 'issent', 'isses', 'isse', 'issons', 'issez',
        'aient', 'oient', 'uient',
        'eons', 'çons', 'ions', 'iez',
        'ais', 'ait', 'ois', 'oit',
        'ons', 'ont', 'ent', 'ant',
        'ées', 'ies', 'ues', 'és',
        'ez', 'er', 'ir', 'es'
    ];

    /**
     * Détecte un oubli de lettre(s) strictement au milieu d'un mot (ni la première lettre,
     * ni la fin du mot / marque de pluriel s/x, ni l'intérieur d'une terminaison complexe
     * comme -ent, -ons, -aient, -ions, -es...).
     * Ex: "sis" -> "suis" (s_is), "liu" -> "lieu" (li_u), "mager" -> "manger" (ma_ger).
     *
     * @param {string} motSaisi
     * @param {string} motAttendu
     * @param {object|null} tokenCorpusAttendu
     * @param {object|null} analyseur
     * @returns {object|null}
     */
    function detecterOubliLettreInterne(motSaisi, motAttendu, tokenCorpusAttendu = null, analyseur = null) {
        const saisiBrut = String(motSaisi || '').trim();
        const attenduBrut = String(motAttendu || '').trim();
        if (!saisiBrut || !attenduBrut) return null;

        const normaliser = (str) => String(str || '').toLowerCase().replace(/[’]/g, "'").trim();
        const s = normaliser(saisiBrut);
        const a = normaliser(attenduBrut);

        if (s === a) return null;
        if (a.length <= s.length) return null;
        if (s.length < 2 || a.length < 3) return null;

        const nbManquantes = a.length - s.length;
        if (nbManquantes < 1 || nbManquantes > 2) return null;

        // Calcul du préfixe commun (depuis le début)
        let prefixLen = 0;
        while (prefixLen < s.length && prefixLen < a.length && s[prefixLen] === a[prefixLen]) {
            prefixLen += 1;
        }

        // Calcul du suffixe commun (depuis la fin, sans chevaucher le préfixe)
        let suffixLen = 0;
        while (
            suffixLen < (s.length - prefixLen) &&
            suffixLen < (a.length - prefixLen) &&
            s[s.length - 1 - suffixLen] === a[a.length - 1 - suffixLen]
        ) {
            suffixLen += 1;
        }

        // L'oubli doit être un bloc contigu strictement à l'intérieur du mot :
        // - prefixLen >= 1 : jamais la première lettre
        // - suffixLen >= 1 : jamais la dernière lettre (fin du mot / pluriel s, x, e, t...)
        if (prefixLen + suffixLen !== s.length) return null;
        if (prefixLen < 1 || suffixLen < 1) return null;

        const lettresManquantes = a.slice(prefixLen, a.length - suffixLen);
        const suffixeCommun = a.slice(a.length - suffixLen);

        // 1) Protection contre les accords de genre/nombre devant -s ou -x final :
        // Ex: "petits" vs "petites", "allés" vs "allées", "chiens" vs "chiennes", "chevax" vs "chevaux"
        if (suffixeCommun === 's' || suffixeCommun === 'x') {
            if (lettresManquantes.endsWith('e') || lettresManquantes.endsWith('é')) {
                return null;
            }
            if (suffixeCommun === 'x' && (a.endsWith('aux') || a.endsWith('eaux') || a.endsWith('oux') || a.endsWith('eux'))) {
                return null;
            }
        }

        const donneesAttendu = (analyseur && typeof analyseur.getWordData === 'function')
            ? analyseur.getWordData(attenduBrut)
            : null;
        const donneesSaisi = (analyseur && typeof analyseur.getWordData === 'function')
            ? analyseur.getWordData(saisiBrut)
            : null;

        const natureCorpus = String((tokenCorpusAttendu && tokenCorpusAttendu.nature) || '').toLowerCase();
        const typeDictAttendu = String((donneesAttendu && donneesAttendu.type) || '').toLowerCase();
        const lemmeAttendu = normaliser(
            (tokenCorpusAttendu && tokenCorpusAttendu.lemme) ||
            (donneesAttendu && (donneesAttendu.lemme || donneesAttendu.infinitif)) ||
            ''
        );
        const lemmeSaisi = normaliser(
            (donneesSaisi && (donneesSaisi.lemme || donneesSaisi.infinitif)) || ''
        );

        // 2) Si le mot saisi est déjà une autre forme fléchie valide du même lemme (ex: "était" vs "étaient",
        // "chantons" vs "chantions", "petits" vs "petites", "peut" vs "peuvent"), c'est une erreur grammaticale.
        if (lemmeAttendu && lemmeSaisi && lemmeAttendu === lemmeSaisi) {
            return null;
        }

        // 3) Protection contre le doublage de consonne ou transformation du féminin devant -e / -es final
        // Ex: "bone" vs "bonne" (lemme "bon"), "muete" vs "muette" (lemme "muet"), "nouvele" vs "nouvelle" (lemme "nouveau")
        // En revanche, "voiure" vs "voiture" (lemme "voiture") garde bien le 't' dans son lemme.
        if ((suffixeCommun === 'e' || suffixeCommun === 'es') && lemmeAttendu) {
            const debutAttenduAvecLettre = a.slice(0, prefixLen + lettresManquantes.length);
            if (!lemmeAttendu.startsWith(debutAttenduAvecLettre)) {
                return null;
            }
        }

        // 4) Protection contre les terminaisons verbales complexes (-ent, -ons, -ions, -iez, -ais, -ait, -aient, etc.)
        const estVerbe = natureCorpus.includes('verbe') || typeDictAttendu.includes('verbe');
        if (estVerbe) {
            for (const term of TERMINAISONS_VERBALES_COMPLEXES) {
                if (a.endsWith(term) && a.length > term.length) {
                    // Si suffixLen < term.length, la lettre manquante se situe DANS la terminaison verbale
                    // (ex: "manget" pour "mangent" -> suffix="t" < "ent"; "mangons" pour "mangeons" -> suffix="ons" < "eons").
                    // Si suffixLen >= term.length, la terminaison est intacte et l'oubli est dans le radical
                    // (ex: "magent" pour "mangent" -> suffix="gent" >= "ent"; "mager" pour "manger" -> suffix="ger" >= "er").
                    if (suffixLen < term.length) {
                        return null;
                    }
                    break;
                }
            }
        } else {
            // Même hors verbe annoté, protéger les finales en -ent / -ons si l'oubli est le 'n' ou 'e' juste avant la consonne finale
            // sur un mot qui pourrait être un verbe conjugué
            const finAttendue = lettresManquantes + suffixeCommun;
            if ((finAttendue === 'ent' || finAttendue === 'nt' || finAttendue === 'aient') && donneesAttendu && typeDictAttendu.includes('verbe')) {
                return null;
            }
        }

        const motMasque = attenduBrut.slice(0, prefixLen)
            + '_'.repeat(nbManquantes)
            + attenduBrut.slice(attenduBrut.length - suffixLen);

        return {
            explication: `Il manque ${nbManquantes === 1 ? 'une lettre' : nbManquantes + ' lettres'} dans ce mot, écoute à nouveau la dictée et corrige ton oubli : ${motMasque}`,
            titreAide: 'Lettre manquante dans le mot',
            memo: 'Écoute bien chaque syllabe de la dictée et relis le mot pour n\'oublier aucune lettre à l\'intérieur.',
            parcoursType: 'oubli_lettre_interne',
            motMasque
        };
    }

    /**
     * Détecte l'oubli d'une consonne finale muette INHÉRENTE au mot (ex: "vieu" -> "vieux",
     * "cha" -> "chat", "gran" -> "grand", "souri" -> "souris") sur un nom ou un adjectif
     * dont la forme attendue est au SINGULIER (corpus : nombre "s").
     *
     * Dans ce cas, ce n'est PAS un problème d'accord pluriel : le -x/-s/-t/-d fait partie
     * de la forme singulière du mot. Le parcours d'accord (singulier/pluriel) est donc
     * inadapté ; on propose l'aide « consonne finale muette ».
     *
     * @param {string} motSaisi
     * @param {string} motAttendu
     * @param {object|null} tokenAttendu Token corpus du mot attendu
     * @returns {object|null}
     */
    function detecterConsonneMuetteFinale(motSaisi, motAttendu, tokenAttendu = null) {
        const normaliser = (str) => String(str || '').toLowerCase().replace(/[’]/g, "'").trim();
        const s = normaliser(motSaisi);
        const a = normaliser(motAttendu);
        if (!s || !a || s === a) return null;
        if (a.length !== s.length + 1 || s.length < 2) return null;
        if (!a.startsWith(s)) return null;

        const lettreFinale = a.slice(-1);
        if (!/^[sxtdpzcg]$/.test(lettreFinale)) return null;

        const nature = String((tokenAttendu && tokenAttendu.nature) || '').toLowerCase();
        if (!nature.includes('adjectif') && !nature.includes('nom')) return null;

        const nombre = String((tokenAttendu && tokenAttendu.nombre) || '').toLowerCase();
        if (nombre !== 's' && nombre !== 'singulier') return null;

        return {
            explication: `Ce mot est au singulier, mais il se termine par une consonne qu'on n'entend pas : « ${lettreFinale} ». Pour la retrouver, tu peux la plupart du temps chercher le féminin du mot ou un mot de la même famille.`,
            titreAide: 'Consonne finale muette',
            memo: 'Une consonne finale muette réapparaît souvent au féminin ou dans un mot de la même famille (grand / grande, chat / chatte).',
            parcoursType: 'consonne_muette_finale',
            consonneMuette: lettreFinale
        };
    }

    function enrichirExplicationLettreManquante(motSaisi, motAttendu) {
        if (!motAttendu.toLowerCase().startsWith(motSaisi.toLowerCase())) return null;
        if (motAttendu.length <= motSaisi.length) return null;
        if (motAttendu.length - motSaisi.length > 3) return null;

        // Si la seule différence est un suffixe grammatical, ce n'est pas une "lettre manquante"
        const suffixeManquant = motAttendu.slice(motSaisi.length).toLowerCase();
        if (SUFFIXES_GRAMMATICAUX.includes(suffixeManquant)) return null;

        const nbLettres = motAttendu.length - motSaisi.length;
        return {
            explication: `Il manque ${nbLettres === 1 ? 'une lettre' : nbLettres + ' lettres'} à la fin de « ${motSaisi} ». Écoute bien la fin du mot dans la dictée.`,
            titreAide: 'Lettre manquante',
            memo: `Écoute bien la fin du mot dans la dictée et vérifie chaque lettre.`
        };
    }

    /**
     * Détecte si le mot attendu est un préfixe du mot saisi (lettre en trop).
     * Ex: poure → pour
     *
     * @param {string} motSaisi   - Mot écrit par l'élève
     * @param {string} motAttendu - Mot attendu par la dictée
     * @returns {object|null}     - { explication, titreAide, memo } ou null
     */
    function enrichirExplicationLettreEnTrop(motSaisi, motAttendu) {
        if (!motSaisi.toLowerCase().startsWith(motAttendu.toLowerCase())) return null;
        if (motSaisi.length <= motAttendu.length) return null;
        if (motSaisi.length - motAttendu.length > 3) return null;

        // Si la seule différence est un suffixe grammatical, ce n'est pas une "lettre en trop"
        const suffixeEnTrop = motSaisi.slice(motAttendu.length).toLowerCase();
        if (SUFFIXES_GRAMMATICAUX.includes(suffixeEnTrop)) return null;

        const nbLettres = motSaisi.length - motAttendu.length;
        return {
            explication: `Tu as ajouté ${nbLettres === 1 ? 'une lettre en trop' : nbLettres + ' lettres en trop'} à la fin de « ${motSaisi} ». Vérifie si cette fin est nécessaire.`,
            titreAide: 'Lettre en trop',
            memo: `Relis le mot : certaines lettres prononcées ne s'écrivent pas, ou tu as ajouté une lettre inutile.`
        };
    }

    categories.detecterOubliLettreInterne = detecterOubliLettreInterne;
    categories.detecterConsonneMuetteFinale = detecterConsonneMuetteFinale;
    categories.enrichirExplicationLettreManquante = enrichirExplicationLettreManquante;
    categories.enrichirExplicationLettreEnTrop = enrichirExplicationLettreEnTrop;
})(typeof window !== 'undefined' ? window : globalThis);
