/**
 * Catégorie: explications d'accent/cédille pour la dictée orale.
 */
(function (global) {
    'use strict';

    const categories = global.AbeAnalyseurCategories = global.AbeAnalyseurCategories || {};

    /**
     * Détecte une différence d'accent/cédille entre deux mots
     * et retourne une explication pédagogique si applicable.
     *
     * @param {string} motSaisi   - Mot écrit par l'élève
     * @param {string} motAttendu - Mot attendu par la dictée
     * @returns {object|null}     - { explication, titreAide, memo } ou null
     */
    function enrichirExplicationAccent(motSaisi, motAttendu) {
        const sansAccent1 = motSaisi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const sansAccent2 = motAttendu.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        if (sansAccent1 !== sansAccent2) return null;

        const accentGrave = /[àèù]/i.test(motAttendu);
        const accentAigu = /[é]/i.test(motAttendu);
        const accentCirconflexe = /[âêîôû]/i.test(motAttendu);
        const cedille = /[ç]/i.test(motAttendu);

        let detailAccent = '';
        if (accentCirconflexe) detailAccent = ' un accent circonflexe (ˆ)';
        else if (accentGrave) detailAccent = ' un accent grave';
        else if (accentAigu) detailAccent = ' un accent aigu';
        else if (cedille) detailAccent = ' une cédille';

        return {
            explication: `Les accents sont importants ! Le mot attendu s'écrit avec${detailAccent}. L'accent peut changer le sens du mot.`,
            titreAide: 'Accent ou cédille manquant(e)',
            memo: `L'accent change le sens ou la prononciation du mot.`
        };
    }

    categories.enrichirExplicationAccent = enrichirExplicationAccent;
})(typeof window !== 'undefined' ? window : globalThis);
