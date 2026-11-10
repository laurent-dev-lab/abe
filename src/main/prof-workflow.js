/**
 * Module de gestion des modales d'entrée et du workflow Enseignant pour Abe
 * - Modale d'entrée si aucun paramètre de dictée (?d=...) n'est présent dans l'URL :
 *   - Bouton "Je suis prof" -> lance le workflow de conception (mot de passe "EN")
 *   - Bouton "Je suis élève" -> ferme l'onglet
 * - Générateur de préprompt optimisé et verrouillé sur le noyau ABE
 * - Bascule automatique après 5 secondes vers l'étape de collage JSON
 * - Validation du JSON retourné par l'IA et sauvegarde via corpus/save_dictee.php
 * - Génération du lien unique avec bouton copier et disclaimer
 */
(function (global) {
    'use strict';

    const DELAI_BASCULE_MS = 5000;

    /**
     * Extrait les phrases non vides saisies dans le textarea (1 ligne = 1 phrase)
     * @param {string} rawText
     * @returns {string[]}
     */
    function extrairePhrasesSaisies(rawText) {
        if (!rawText || typeof rawText !== 'string') return [];
        return rawText
            .split(/\r?\n/)
            .map((ligne) => ligne.replace(/\s+/g, ' ').trim())
            .filter(Boolean);
    }

    /**
     * Génère le préprompt maître optimisé pour une IAG grand public (ChatGPT, Gemini, Claude)
     * en y injectant dynamiquement les phrases saisies par l'enseignant.
     * @param {string[]} phrases - Tableau de phrases
     * @returns {string} Le préprompt complet prêt à coller
     */
    function genererPreprompt(phrases) {
        const listePhrases = phrases
            .map((p, i) => `${i + 1}. ${p.trim()}`)
            .join('\n');

        return `# PROMPT MAÎTRE — Génération de corpus JSON pour le moteur de dictée guidée ABE

## RÔLE
Tu es un linguiste expert en grammaire française et en dépendances syntaxiques (Universal Dependencies). Tu génères le fichier JSON d'annotation grammaticale pour le logiciel de dictée guidée ABE. Chaque phrase doit être annotée token par token avec ses caractéristiques grammaticales exactes, ses dépendances syntaxiques et ses relations d'accord.

## TÂCHE IMPÉRATIVE — PHRASES À ANNOTER
Tu dois traiter EXACTEMENT les **${phrases.length} phrase(s)** suivantes (sans en modifier l'orthographe, sans en supprimer et sans en inventer d'autres) :

${listePhrases}

## STRUCTURE JSON ATTENDUE
Le résultat doit être UNIQUEMENT un tableau JSON valide \`[{...}, {...}]\` contenant exactement ${phrases.length} objet(s) (un par phrase ci-dessus, dans le même ordre), où chaque objet a la structure suivante :

\`\`\`json
{
  "phrase_originale": "La phrase complète exacte avec sa ponctuation finale.",
  "phrase_normalisee": "La même phrase exacte.",
  "langue": "fr",
  "tokens": [ ... ],
  "relations_globales": [ ... ],
  "erreurs": [],
  "corrections": []
}
\`\`\`

### 1. CHAMPS \`tokens\` — Structure exacte de chaque token

\`\`\`json
{
  "id": 1,
  "texte": "Les",
  "lemme": "le",
  "nature": "déterminant",
  "genre": "m",
  "nombre": "p",
  "personne": null,
  "mode": null,
  "temps": null,
  "fonction": null,
  "dependance": { "type": "det", "cible": 2 },
  "homophone_de": null,
  "priorite_corpus": null
}
\`\`\`

#### Valeurs autorisées par champ :

**\`nature\`** (OBLIGATOIRE, valeur exacte parmi) :
- \`"déterminant"\` — articles (y compris articles contractés \`"au"\`, \`"aux"\`, \`"du"\`) et déterminants (le, la, les, l', un, une, des, du, au, aux, ce, cet, cette, ces, son, sa, ses, mon, ma, mes, ton, ta, tes, notre, nos, votre, vos, leur, leurs, tout, toute, tous, toutes, chaque, quelque, quelques, plusieurs, aucun, aucune)
- \`"nom"\` — noms communs et noms propres
- \`"adjectif"\` — adjectifs qualificatifs (épithète, attribut, apposé)
- \`"verbe"\` — verbes conjugués OU infinitif OU participe passé (distinction via \`mode\`)
- \`"pronom"\` — pronoms sujets (je, j', tu, il, elle, on, nous, vous, ils, elles), pronoms objets (le, la, les, l', lui, leur, se, s', me, m', te, t', y, en), pronoms relatifs (qui, que, qu', dont, où), démonstratifs (ce, c', ça, cela, celui, celle, ceux, celles), possessifs, réfléchis (soi)
- \`"adverbe"\` — très, bien, mal, plus, moins, jamais, toujours, souvent, pas, ne, n', rien, aussi, encore, déjà, bientôt, vite, ensemble, lentement, peu, beaucoup, etc.
- \`"préposition"\` — à, de, d', en, dans, pour, par, avec, sans, sous, sur, vers, chez, entre, contre, avant, après, depuis, pendant, jusqu', devant, derrière (ATTENTION : \`"au"\`, \`"aux"\` et \`"du"\` devant un nom ont TOUJOURS \`"nature": "déterminant"\`, jamais \`"préposition"\`)
- \`"conjonction"\` — et, mais, ou, donc, or, ni, car, que, qu', si, quand, lorsque, comme, puisque, bien que
- \`"ponctuation"\` — . , ; : ! ? ( )

**\`genre\`** :
- \`"m"\` = masculin, \`"f"\` = féminin, \`null\` = non applicable (verbes conjugués/infinitifs, adverbes, prépositions, conjonctions, ponctuation, et pronoms sans genre inhérent comme \`"je"\`, \`"j'"\`, \`"tu"\`, \`"nous"\`, \`"vous"\`, \`"on"\`, \`"se"\`, \`"s'"\`, \`"y"\`, \`"en"\`, \`"ce"\`, \`"c'"\`, \`"ça"\`)

**\`nombre\`** :
- \`"s"\` = singulier, \`"p"\` = pluriel, \`null\` = non applicable

**\`personne\`** (uniquement pour pronoms et verbes conjugués) :
- \`"1"\`, \`"2"\`, \`"3"\`, ou \`null\`

**\`mode\`** (uniquement pour les verbes) :
- \`"indicatif"\`, \`"subjonctif"\`, \`"conditionnel"\`, \`"impératif"\`, \`"infinitif"\`, \`"participe"\`, ou \`null\`

**\`temps\`** (uniquement pour les verbes) :
- \`"présent"\`, \`"imparfait"\`, \`"passé simple"\`, \`"futur"\`, \`"plus-que-parfait"\`, \`"passé"\`, ou \`null\`

**\`fonction\`** (rôle grammatical dans la phrase) :
- \`"sujet"\` — sujet du verbe (nom, pronom)
- \`"COD"\` — complément d'objet direct
- \`"COI"\` — complément d'objet indirect
- \`"attribut du sujet"\` — attribut du sujet (après un verbe d'état comme être, sembler, paraître, devenir)
- \`"épithète"\` — adjectif épithète ou participe lié au nom
- \`"complément du nom"\` — nom complément du nom (via nmod)
- \`"complément circonstanciel"\` — complément circonstanciel (lieu, temps, manière...)
- \`"verbe principal"\` — verbe racine de la phrase (root)
- \`"auxiliaire"\` — auxiliaire avoir ou être dans un temps composé (aux)
- \`"explétif"\` — pronom réfléchi (se) ou il impersonnel
- \`null\` — déterminant, préposition, conjonction, ponctuation, adverbe

**\`dependance\`** — Relation syntaxique Universal Dependencies :
\`"dependance": { "type": "...", "cible": <id_du_gouverneur> }\`
- \`"root"\` : verbe principal de la phrase -> \`"cible": 0\`
- \`"nsubj"\` : sujet nominal ou pronominal -> pointe vers l'\`id\` du verbe (ou du participe/attribut dans un temps composé)
- \`"obj"\` : COD -> pointe vers l'\`id\` du verbe
- \`"obl"\` : COI ou complément circonstanciel -> pointe vers l'\`id\` du verbe
- \`"aux"\` : auxiliaire avoir/être -> pointe vers l'\`id\` du participe passé
- \`"acl"\` : participe ou relative modifiant un nom -> pointe vers l'\`id\` du nom
- \`"advcl"\` : subordonnée circonstancielle -> pointe vers l'\`id\` du verbe principal
- \`"ccomp"\` : subordonnée complétive -> pointe vers l'\`id\` du verbe principal
- \`"xcomp"\` : infinitif complément ou attribut -> pointe vers l'\`id\` du verbe
- \`"det"\` : déterminant -> pointe vers l'\`id\` du nom
- \`"amod"\` : adjectif épithète -> pointe vers l'\`id\` du nom
- \`"nmod"\` : complément du nom -> pointe vers l'\`id\` du nom complété
- \`"advmod"\` : adverbe -> pointe vers l'\`id\` du mot modifié
- \`"case"\` : préposition -> pointe vers l'\`id\` du nom introduit
- \`"mark"\` : conjonction de subordination -> pointe vers l'\`id\` du verbe subordonné
- \`"fixed"\` : locution figée
- \`"expl"\` : pronom réfléchi ou impersonnel -> pointe vers l'\`id\` du verbe
- \`"punct"\` : ponctuation -> pointe vers l'\`id\` du verbe \`root\`

**\`homophone_de\`** :
Tableau des homophones grammaticaux fréquents si le token fait partie de la liste ci-dessous, sinon \`null\` :
- \`"ces"\` -> \`["ses", "c'est", "s'est"]\` | \`"ses"\` -> \`["ces", "c'est", "s'est"]\`
- \`"c'"\` (devant \`"est"\` ou \`"était"\`) -> \`["s'"]\` | \`"s'"\` (devant \`"est"\` ou \`"était"\`) -> \`["c'"]\`
- \`"son"\` -> \`["sont", "sons"]\` | \`"sont"\` -> \`["son"]\` | \`"sons"\` -> \`["son"]\`
- \`"ce"\` -> \`["se"]\` | \`"se"\` -> \`["ce"]\`
- \`"on"\` -> \`["ont"]\` | \`"ont"\` -> \`["on"]\`
- \`"ou"\` -> \`["où"]\` | \`"où"\` -> \`["ou"]\`
- \`"a"\` -> \`["à"]\` | \`"à"\` -> \`["a"]\`
- \`"la"\` -> \`["là"]\` | \`"là"\` -> \`["la"]\`
- \`"sa"\` -> \`["ça"]\` | \`"ça"\` -> \`["sa"]\`
- \`"peut"\` -> \`["peu", "peux"]\` | \`"peux"\` -> \`["peut", "peu"]\` | \`"peu"\` -> \`["peut", "peux"]\`
- \`"est"\` -> \`["et"]\` | \`"et"\` -> \`["est"]\`
- \`"leur"\` -> \`["leurs"]\` | \`"leurs"\` -> \`["leur"]\`
- \`"mais"\` -> \`["mes", "mai", "met", "mets"]\` | \`"mes"\` -> \`["mais"]\` | \`"mai"\` -> \`["mais"]\`
- \`"quand"\` -> \`["quant"]\` | \`"quant"\` -> \`["quand"]\`
- \`"tout"\` -> \`["tous"]\` | \`"tous"\` -> \`["tout"]\`
- \`"soi"\` -> \`["soit"]\` | \`"soit"\` -> \`["soi"]\`
- Pour tous les autres mots : \`null\`.

**\`priorite_corpus\`** :
Valeurs possibles : \`"accord_sujet_verbe"\`, \`"accord_sujet_participe"\`, \`"accord_determinant_nom"\`, \`"accord_adjectif_nom"\`, \`"accord_sujet_attribut"\`, \`"conjugaison_verbe"\`, ou \`null\` (mettre \`null\` par défaut sauf sur un participe passé accordé ou verbe d'état ambigu).

---

### 2. INTERDÉPENDANCE DES MOTS (\`dependance\` ET \`relations_globales\`) — EXHAUSTIVITÉ ABSOLUE
La méthodologie d'orthographe grammaticale d'ABE repose intégralement sur l'**interdépendance entre les mots** (donneur d'accord ↔ receveur d'accord). Si une dépendance ou une relation d'accord est absente, le guidage pédagogique échoue. Tu dois IMPÉRATIVEMENT :

1. **Renseigner chaque \`dependance\` de token sans exception** :
   - **Déterminant ↔ Nom** : TOUT déterminant (\`"un"\`, \`"une"\`, \`"le"\`, \`"la"\`, \`"les"\`, \`"l'"\`, \`"des"\`, \`"du"\`, \`"au"\`, \`"aux"\`, \`"mon"\`, \`"ton"\`, \`"son"\`, \`"notre"\`, \`"votre"\`, \`"leur"\`, \`"ce"\`, \`"cet"\`, \`"cette"\`, \`"ces"\`, etc.) DOIT pointer vers son nom :
     \`"dependance": { "type": "det", "cible": <id_du_nom> }\`
   - **Sujet ↔ Verbe** : TOUT sujet (pronom ou nom, y compris pronom relatif \`"qui"\` ou chaque nom d'un sujet coordonné comme \`"Paul et Marie"\`) DOIT pointer vers son verbe :
     \`"dependance": { "type": "nsubj", "cible": <id_du_verbe> }\`
   - **Adjectif épithète ↔ Nom** : TOUT adjectif épithète DOIT pointer vers le nom qu'il qualifie :
     \`"dependance": { "type": "amod", "cible": <id_du_nom> }\`
   - **Adjectif attribut ↔ Verbe d'état / Sujet** : TOUT adjectif attribut du sujet a \`"fonction": "attribut du sujet"\` et \`"dependance": { "type": "xcomp", "cible": <id_du_verbe_d_etat> }\`.
   - **Préposition ↔ Nom/Verbe** : Toute préposition (\`"dans"\`, \`"à"\`, \`"de"\`, \`"pour"\`, \`"sans"\`, \`"avec"\`, etc.) a \`"dependance": { "type": "case", "cible": <id_du_nom_ou_pronom> }\` (ou \`"mark"\` devant un infinitif).
   - **Verbe principal** : \`"dependance": { "type": "root", "cible": 0 }\`.

2. **Renseigner EXHAUSTIVEMENT le tableau \`relations_globales\`** :
   Déclarer SANS AUCUNE EXCEPTION toutes les chaînes d'accord et d'interdépendance présentes dans la phrase :
   - **Accord Déterminant-Nom (OBLIGATOIRE pour CHAQUE couple déterminant + nom, y compris au singulier et pour \`"du"\`, \`"au"\`, \`"aux"\`)** :
     \`{ "type": "accord_determinant_nom", "det": <id_det>, "nom": <id_nom>, "correct": true }\`
     *Exemple 1 : dans "un avion", si "un" est id 4 et "avion" est id 5 -> \`{ "type": "accord_determinant_nom", "det": 4, "nom": 5, "correct": true }\`.*
     *Exemple 2 : dans "les mains", si "les" est id 6 et "mains" est id 7 -> \`{ "type": "accord_determinant_nom", "det": 6, "nom": 7, "correct": true }\`.*
   - **Accord Sujet-Verbe (OBLIGATOIRE pour CHAQUE verbe conjugué avec son sujet ; si sujets coordonnés comme "Paul et Marie chantent", créer une entrée \`accord_sujet_verbe\` pour chaque nom sujet vers le verbe)** :
     \`{ "type": "accord_sujet_verbe", "sujet": <id_sujet>, "verbe": <id_verbe>, "correct": true }\`
   - **Accord Adjectif-Nom (OBLIGATOIRE pour CHAQUE adjectif épithète avec son nom)** :
     \`{ "type": "accord_adjectif_nom", "adj": <id_adj>, "nom": <id_nom>, "correct": true }\`
   - **Accord Sujet-Attribut (OBLIGATOIRE pour CHAQUE adjectif attribut avec son sujet)** :
     \`{ "type": "accord_sujet_attribut", "sujet": <id_sujet>, "attribut": <id_attribut>, "correct": true }\`
   - **Accord Sujet-Participe (OBLIGATOIRE pour CHAQUE participe passé accordé avec son sujet)** :
     \`{ "type": "accord_sujet_participe", "sujet": <id_sujet>, "participe": <id_participe>, "correct": true }\`
   - **Auxiliaire-Participe** :
     \`{ "type": "auxiliaire_participe", "auxiliaire": <id_aux>, "participe": <id_participe> }\`
   - **COD-Participe** :
     \`{ "type": "cod_participe", "cod": <id_cod>, "participe": <id_participe> }\`

---

### 3. RÈGLES DE DÉCOUPAGE ET DE COHÉRENCE STRICTES
1. **IDs séquentiels** : Les \`id\` des tokens commencent à 1 et se suivent sans trou (1, 2, 3, ..., N).
2. **Élisions séparées OBLIGATOIRES** : Les mots élidés (\`"j'"\`, \`"l'"\`, \`"d'"\`, \`"n'"\`, \`"s'"\`, \`"qu'"\`, \`"c'"\`, \`"m'"\`, \`"t'"\`, \`"jusqu'"\`) constituent TOUJOURS un token distinct avec l'apostrophe droite \`'\`. Exemple : \`"l'école"\` -> token 1 \`"l'"\` (lemme: \`"le"\`, nature: \`"déterminant"\`) + token 2 \`"école"\` (lemme: \`"école"\`, nature: \`"nom"\`). De même, \`"c'est"\` -> token \`"c'"\` (lemme: \`"ce"\`, nature: \`"pronom"\`, homophone_de: \`["s'"]\`) + token \`"est"\` (lemme: \`"être"\`, nature: \`"verbe"\`).
3. **Inversion verbe-sujet avec trait d'union (y compris \`-t-\` euphonique)** : Dans une inversion comme \`"as-tu"\`, \`"est-il"\`, \`"peut-on"\` ou avec \`-t-\` euphonique comme \`"a-t-il"\`, \`"va-t-elle"\`, \`"mange-t-on"\`, sépare le verbe et le pronom en **2 tokens lexicaux distincts** : le verbe (ex: \`"a"\`, \`"va"\`, \`"as"\`) et le pronom sujet (ex: \`"il"\`, \`"elle"\`, \`"tu"\` avec \`dependance: { "type": "nsubj", "cible": <id_verbe> }\`). Ne crée pas de token séparé pour \`"-"\` ni pour \`"-t-"\`. En revanche, les mots composés lexicaux (\`"aujourd'hui"\`, \`"peut-être"\`, \`"grand-père"\`) restent un seul token.
4. **Ponctuation** : La ponctuation finale (\`"."\`, \`"!"\`, \`"?"\`) et les virgules/points-virgules internes sont des tokens à part entière avec \`nature: "ponctuation"\`.
5. **Genre et Nombre OBLIGATOIRES (et héritage sur \`qui\` / \`que\` / \`qu'\`)** :
   - Tout \`"nom"\`, \`"déterminant"\`, \`"adjectif"\` et participe passé (\`mode: "participe"\`) DOIT avoir \`"genre"\` (\`"m"\` ou \`"f"\`) et \`"nombre"\` (\`"s"\` ou \`"p"\`) renseignés (pour \`"au"\` et \`"du"\` : \`"genre": "m", "nombre": "s"\` ; pour \`"aux"\` : \`"nombre": "p"\` et le genre du nom accompagné).
   - **Pronoms relatifs \`"qui"\`, \`"que"\`, \`"qu'"\`** : ils DOIVENT OBLIGATOIREMENT hériter du \`"genre"\` (\`"m"\` ou \`"f"\`) et du \`"nombre"\` (\`"s"\` ou \`"p"\`) de leur nom antécédent (ex: dans *"Les fleurs qui poussent"*, \`"qui"\` a \`"genre": "f", "nombre": "p"\`).
   - Pronoms de 3e personne genrés (\`"il"\`, \`"ils"\`, \`"elle"\`, \`"elles"\`, \`"le"\`, \`"la"\`, \`"ceux"\`, \`"celles"\`, etc.) : renseigner \`"genre"\` et \`"nombre"\`.
   - Pronoms sans genre inhérent (\`"je"\`, \`"j'"\`, \`"tu"\`, \`"nous"\`, \`"vous"\`, \`"on"\`, \`"se"\`, \`"s'"\`, \`"me"\`, \`"te"\`, \`"lui"\`, \`"leur"\`, \`"y"\`, \`"en"\`, \`"ce"\`, \`"c'"\`, \`"ça"\`) : mettre \`"genre": null\` (et \`"nombre": "s"\` ou \`"p"\` selon la personne, ou \`null\` pour \`"y"\`, \`"en"\`, \`"se"\`).
6. **Lemmes** :
   - Verbe conjugué ou participe -> infinitif (\`"étaient"\` -> \`"être"\`, \`"prises"\` -> \`"prendre"\`).
   - Nom pluriel -> singulier (\`"chevaux"\` -> \`"cheval"\`, \`"mains"\` -> \`"main"\`).
   - Adjectif féminin/pluriel -> masculin singulier (\`"petites"\` -> \`"petit"\`).
   - Déterminant -> masculin singulier (\`"les"\`, \`"la"\`, \`"l'"\` -> \`"le"\` ; \`"au"\`, \`"aux"\` -> \`"au"\` ; \`"du"\` -> \`"du"\` ; \`"des"\`, \`"une"\` -> \`"un"\` ; \`"ces"\`, \`"cette"\`, \`"cet"\` -> \`"ce"\` ; \`"ses"\`, \`"sa"\` -> \`"son"\`).
7. **Cohérence des cibles** : Tout \`id\` référencé dans \`dependance.cible\` ou dans \`relations_globales\` DOIT exister dans \`tokens\` (et \`cible: 0\` uniquement pour \`root\`).

---

### 4. EXEMPLE COMPLET DE RÉFÉRENCE
\`\`\`json
[
  {
    "phrase_originale": "Les livres que j'ai lus étaient passionnants.",
    "phrase_normalisee": "Les livres que j'ai lus étaient passionnants.",
    "langue": "fr",
    "tokens": [
      { "id": 1, "texte": "Les", "lemme": "le", "nature": "déterminant", "genre": "m", "nombre": "p", "personne": null, "mode": null, "temps": null, "fonction": null, "dependance": { "type": "det", "cible": 2 }, "homophone_de": null, "priorite_corpus": null },
      { "id": 2, "texte": "livres", "lemme": "livre", "nature": "nom", "genre": "m", "nombre": "p", "personne": null, "mode": null, "temps": null, "fonction": "sujet", "dependance": { "type": "nsubj", "cible": 7 }, "homophone_de": null, "priorite_corpus": null },
      { "id": 3, "texte": "que", "lemme": "que", "nature": "pronom", "genre": "m", "nombre": "p", "personne": "3", "mode": null, "temps": null, "fonction": "COD", "dependance": { "type": "obj", "cible": 6 }, "homophone_de": null, "priorite_corpus": null },
      { "id": 4, "texte": "j'", "lemme": "je", "nature": "pronom", "genre": null, "nombre": "s", "personne": "1", "mode": null, "temps": null, "fonction": "sujet", "dependance": { "type": "nsubj", "cible": 6 }, "homophone_de": null, "priorite_corpus": null },
      { "id": 5, "texte": "ai", "lemme": "avoir", "nature": "verbe", "genre": null, "nombre": "s", "personne": "1", "mode": "indicatif", "temps": "présent", "fonction": "auxiliaire", "dependance": { "type": "aux", "cible": 6 }, "homophone_de": null, "priorite_corpus": null },
      { "id": 6, "texte": "lus", "lemme": "lire", "nature": "verbe", "genre": "m", "nombre": "p", "personne": null, "mode": "participe", "temps": "passé", "fonction": "épithète", "dependance": { "type": "acl", "cible": 2 }, "homophone_de": null, "priorite_corpus": "accord_sujet_participe" },
      { "id": 7, "texte": "étaient", "lemme": "être", "nature": "verbe", "genre": null, "nombre": "p", "personne": "3", "mode": "indicatif", "temps": "imparfait", "fonction": "verbe principal", "dependance": { "type": "root", "cible": 0 }, "homophone_de": null, "priorite_corpus": "accord_sujet_verbe" },
      { "id": 8, "texte": "passionnants", "lemme": "passionnant", "nature": "adjectif", "genre": "m", "nombre": "p", "personne": null, "mode": null, "temps": null, "fonction": "attribut du sujet", "dependance": { "type": "xcomp", "cible": 7 }, "homophone_de": null, "priorite_corpus": null },
      { "id": 9, "texte": ".", "lemme": ".", "nature": "ponctuation", "genre": null, "nombre": null, "personne": null, "mode": null, "temps": null, "fonction": null, "dependance": { "type": "punct", "cible": 7 }, "homophone_de": null, "priorite_corpus": null }
    ],
    "relations_globales": [
      { "type": "accord_determinant_nom", "det": 1, "nom": 2, "correct": true },
      { "type": "accord_sujet_verbe", "sujet": 4, "verbe": 5, "correct": true },
      { "type": "accord_sujet_participe", "sujet": 2, "participe": 6, "correct": true },
      { "type": "accord_sujet_verbe", "sujet": 2, "verbe": 7, "correct": true },
      { "type": "accord_sujet_attribut", "sujet": 2, "attribut": 8, "correct": true },
      { "type": "auxiliaire_participe", "auxiliaire": 5, "participe": 6 },
      { "type": "cod_participe", "cod": 3, "participe": 6 }
    ],
    "erreurs": [],
    "corrections": []
  }
]
\`\`\`

---

## ÉTAPE D'AUTO-CONTRÔLE OBLIGATOIRE (AVANT DE PRODUIRE TA RÉPONSE FINALE)
Avant d'émettre le moindre caractère, tu dois IMPÉRATIVEMENT réaliser mentalement cette checklist de contrôle qualité sur chaque phrase générée :
1. **Intégrité du texte** : Les ${phrases.length} phrases correspondent-elles mot à mot et ponctuation comprise au texte demandé ? Aucune phrase n'a été tronquée ou oubliée ?
2. **Continuité des identifiants** : Les \`id\` démarrent bien à 1 et se succèdent sans aucun trou (1, 2, 3...) ?
3. **Élisions et apostrophes** : Chaque élision (\`"j'"\`, \`"l'"\`, \`"d'"\`, \`"n'"\`, \`"s'"\`, \`"qu'"\`, \`"c'"\`) est-elle bien isolée dans son propre token avec l'apostrophe droite \`'\` ?
4. **Interdépendance et accords** :
   - Chaque déterminant a-t-il sa \`dependance: { "type": "det", "cible": <nom> }\` ET son entrée correspondante dans \`relations_globales\` (\`"accord_determinant_nom"\`) ?
   - Chaque sujet et verbe ont-ils leur \`dependance\` ET leur entrée \`"accord_sujet_verbe"\` ?
   - Chaque adjectif épithète ou attribut a-t-il sa relation bien déclarée ?
5. **Validité syntaxique stricte du JSON** : As-tu vérifié l'absence de virgule traînante (*trailing comma*), la bonne fermeture de tous les crochets \`[]\` et accolades \`{}\` ?

---

## CONSIGNE DE SORTIE (TRÈS IMPORTANT)
- Réponds **UNIQUEMENT** par le tableau JSON valide \`[ ... ]\`.
- Ne rédige **aucun** commentaire ni phrase d'introduction ou de conclusion.
- Ne place aucune balise de code ou texte explicatif : le premier caractère de ta réponse doit être \`[\` et le dernier doit être \`]\`.`;
    }

    /**
     * Génère une consigne de rectification à copier-coller dans l'IAG en cas d'erreur dans le JSON
     * @param {string} descriptionErreur - Description de l'anomalie détectée
     * @returns {string} Prompt prêt à être envoyé à l'IA
     */
    function genererPromptRectification(descriptionErreur) {
        return `Le code JSON que tu as fourni comporte une anomalie qui bloque son intégration dans le moteur ABE :
⚠️ "${descriptionErreur}"

Consignes pour corriger :
1. Corrige cette anomalie en respectant scrupuleusement la structure demandée (tous les tokens doivent avoir id, texte, lemme, nature, genre, nombre, dependance avec type et cible, homophone_de, etc.).
2. Conserve l'intégralité de toutes les phrases et de tous les tokens.
3. RENDS UNIQUEMENT LE CODE JSON VALIDE (le tableau [ ... ]), sans aucune balise markdown autour et sans aucun texte avant ou après.`;
    }

    /**
     * Valide et normalise le JSON collé par l'enseignant
     * @param {string} rawString - Chaîne brute collée
     * @returns {{ valide: boolean, donnees?: any[], erreur?: string }}
     */
    function validerJsonDictee(rawString) {
        if (!rawString || typeof rawString !== 'string' || !rawString.trim()) {
            return { valide: false, erreur: 'Le contenu collé est vide.' };
        }

        let texte = rawString.trim();

        // Nettoyage automatique si l'IA a entouré le JSON de blocs ```json ... ``` ou de texte parasite
        if (texte.startsWith('```')) {
            texte = texte.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
        } else {
            const firstBracket = texte.indexOf('[');
            const lastBracket = texte.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket > firstBracket) {
                texte = texte.slice(firstBracket, lastBracket + 1);
            }
        }

        let parsed;
        try {
            parsed = JSON.parse(texte);
        } catch (e) {
            return { valide: false, erreur: `Erreur de syntaxe JSON : ${e.message}` };
        }

        let phrases = null;
        if (Array.isArray(parsed)) {
            phrases = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.phrases)) {
            phrases = parsed.phrases;
        }

        if (!phrases || phrases.length === 0) {
            return { valide: false, erreur: 'Le JSON doit être un tableau contenant au moins une phrase annotée.' };
        }

        const normalisees = [];

        for (let i = 0; i < phrases.length; i += 1) {
            const p = phrases[i];
            if (!p || typeof p !== 'object') {
                return { valide: false, erreur: `L'élément n°${i + 1} n'est pas un objet JSON valide.` };
            }

            const phraseOriginale = String(p.phrase_originale || p.phrase_normalisee || '').trim();
            if (!phraseOriginale) {
                return { valide: false, erreur: `La phrase n°${i + 1} ne possède pas de champ "phrase_originale".` };
            }

            if (!Array.isArray(p.tokens) || p.tokens.length === 0) {
                return { valide: false, erreur: `La phrase n°${i + 1} ("${phraseOriginale.slice(0, 35)}...") ne contient pas de tableau "tokens".` };
            }

            for (let t = 0; t < p.tokens.length; t += 1) {
                const tok = p.tokens[t];
                if (!tok || typeof tok !== 'object') {
                    return { valide: false, erreur: `Dans la phrase n°${i + 1}, le token n°${t + 1} est invalide.` };
                }
                if (typeof tok.id === 'undefined' || typeof tok.texte !== 'string' || !tok.texte.trim()) {
                    return { valide: false, erreur: `Dans la phrase n°${i + 1}, le token n°${t + 1} n'a pas d'"id" ou de "texte".` };
                }
                if (typeof tok.nature !== 'string' || !tok.nature.trim()) {
                    return { valide: false, erreur: `Dans la phrase n°${i + 1}, le token "${tok.texte}" n'a pas de champ "nature".` };
                }
            }

            // Auto-complétion bidirectionnelle de sécurité entre dependance et relations_globales
            const relations = Array.isArray(p.relations_globales) ? [...p.relations_globales] : [];
            const tokensParId = new Map();
            p.tokens.forEach((tok) => {
                if (tok && Number.isInteger(Number(tok.id))) {
                    tokensParId.set(Number(tok.id), tok);
                }
            });
            const hasRel = (type, k1, v1, k2, v2) => relations.some(
                (r) => r && r.type === type && Number(r[k1]) === Number(v1) && Number(r[k2]) === Number(v2)
            );

            // 1) Depuis relations_globales vers tok.dependance si manquant
            relations.forEach((rel) => {
                if (!rel || typeof rel !== 'object') return;
                if ((rel.type === 'accord_determinant_nom' || rel.type === 'accord_det_nom') && rel.det && rel.nom) {
                    const tDet = tokensParId.get(Number(rel.det));
                    if (tDet && (!tDet.dependance || !tDet.dependance.cible)) {
                        tDet.dependance = { type: 'det', cible: Number(rel.nom) };
                    }
                }
                if (rel.type === 'accord_adjectif_nom' && rel.adj && rel.nom) {
                    const tAdj = tokensParId.get(Number(rel.adj));
                    if (tAdj && (!tAdj.dependance || !tAdj.dependance.cible)) {
                        tAdj.dependance = { type: 'amod', cible: Number(rel.nom) };
                    }
                }
                if (rel.type === 'accord_sujet_verbe' && rel.sujet && rel.verbe) {
                    const tSuj = tokensParId.get(Number(rel.sujet));
                    if (tSuj && (!tSuj.dependance || !tSuj.dependance.cible)) {
                        tSuj.dependance = { type: 'nsubj', cible: Number(rel.verbe) };
                    }
                }
            });

            // 2) Depuis les tokens et leurs dépendances vers relations_globales
            for (let t = 0; t < p.tokens.length; t += 1) {
                const tok = p.tokens[t];
                const idTok = Number(tok.id);
                const texteLower = String(tok.texte || '').toLowerCase().trim();
                let depType = String((tok.dependance && tok.dependance.type) || '').toLowerCase();
                let cible = Number((tok.dependance && tok.dependance.cible) || 0);
                let nature = String(tok.nature || '').toLowerCase();
                const fonction = String(tok.fonction || '').toLowerCase();

                // Normalisation des articles contractés ("au", "aux", "du") devant un nom
                if (['au', 'aux', 'du'].includes(texteLower)) {
                    let nomCible = cible > 0 ? tokensParId.get(cible) : null;
                    if (!nomCible || !String(nomCible.nature || '').toLowerCase().includes('nom')) {
                        for (let j = t + 1; j < Math.min(p.tokens.length, t + 4); j += 1) {
                            const cand = p.tokens[j];
                            if (cand && String(cand.nature || '').toLowerCase().includes('nom')) {
                                nomCible = cand;
                                break;
                            }
                        }
                    }
                    if (nomCible && String(nomCible.nature || '').toLowerCase().includes('nom')) {
                        tok.nature = 'déterminant';
                        nature = 'déterminant';
                        cible = Number(nomCible.id);
                        depType = 'det';
                        tok.dependance = { type: 'det', cible };
                        if (!tok.nombre) tok.nombre = texteLower === 'aux' ? 'p' : 's';
                        if (!tok.genre) tok.genre = nomCible.genre || 'm';
                    }
                }

                // Héritage du genre et du nombre de l'antécédent sur les pronoms relatifs ("qui", "que", "qu'")
                if (nature.includes('pronom') && ['qui', 'que', "qu'"].includes(texteLower) && (!tok.genre || !tok.nombre)) {
                    let antecedent = null;
                    for (let j = t - 1; j >= 0; j -= 1) {
                        const prev = p.tokens[j];
                        if (!prev) continue;
                        const natPrev = String(prev.nature || '').toLowerCase();
                        if (natPrev.includes('nom') || (natPrev.includes('pronom') && prev.genre && prev.nombre)) {
                            antecedent = prev;
                            break;
                        }
                    }
                    if (antecedent) {
                        if (!tok.genre && antecedent.genre) tok.genre = antecedent.genre;
                        if (!tok.nombre && antecedent.nombre) tok.nombre = antecedent.nombre;
                    }
                }

                // Si déterminant sans cible, chercher le nom suivant
                if ((nature.includes('déterminant') || nature.includes('determinant') || depType === 'det') && cible <= 0) {
                    for (let j = t + 1; j < Math.min(p.tokens.length, t + 4); j += 1) {
                        const cand = p.tokens[j];
                        if (cand && String(cand.nature || '').toLowerCase().includes('nom')) {
                            cible = Number(cand.id);
                            tok.dependance = { type: 'det', cible };
                            break;
                        }
                    }
                }

                // Accord déterminant-nom
                if ((depType === 'det' || nature.includes('déterminant') || nature.includes('determinant')) && cible > 0) {
                    const tCible = tokensParId.get(cible);
                    if (!tCible || String(tCible.nature || '').toLowerCase().includes('nom')) {
                        if (!hasRel('accord_determinant_nom', 'det', idTok, 'nom', cible)) {
                            relations.push({ type: 'accord_determinant_nom', det: idTok, nom: cible, correct: true });
                        }
                    }
                }

                // Accord adjectif-nom (épithète)
                if ((depType === 'amod' || (nature.includes('adjectif') && !fonction.includes('attribut'))) && cible > 0) {
                    const tCible = tokensParId.get(cible);
                    if (!tCible || String(tCible.nature || '').toLowerCase().includes('nom')) {
                        if (!hasRel('accord_adjectif_nom', 'adj', idTok, 'nom', cible)) {
                            relations.push({ type: 'accord_adjectif_nom', adj: idTok, nom: cible, correct: true });
                        }
                    }
                }

                // Accord sujet-attribut (adjectif attribut du sujet)
                if (nature.includes('adjectif') && (fonction.includes('attribut') || depType === 'xcomp' || depType === 'acomp')) {
                    let idSujet = 0;
                    if (cible > 0) {
                        const tGouv = tokensParId.get(cible);
                        if (tGouv && (String(tGouv.nature || '').toLowerCase().includes('nom') || String(tGouv.nature || '').toLowerCase().includes('pronom'))) {
                            idSujet = cible;
                        } else {
                            const sujTok = p.tokens.find((x) => x && x.dependance && x.dependance.type === 'nsubj' && Number(x.dependance.cible) === cible);
                            if (sujTok) idSujet = Number(sujTok.id);
                        }
                    }
                    if (!idSujet) {
                        const sujFallback = p.tokens.find((x) => x && String(x.fonction || '').toLowerCase().includes('sujet'));
                        if (sujFallback) idSujet = Number(sujFallback.id);
                    }
                    if (idSujet > 0 && !hasRel('accord_sujet_attribut', 'sujet', idSujet, 'attribut', idTok)) {
                        relations.push({ type: 'accord_sujet_attribut', sujet: idSujet, attribut: idTok, correct: true });
                    }
                }

                // Accord sujet-verbe et sujet-participe
                if (depType === 'nsubj' && cible > 0) {
                    const tCible = tokensParId.get(cible);
                    const modeCible = tCible ? String(tCible.mode || '').toLowerCase() : '';
                    if (modeCible.includes('participe')) {
                        if (!hasRel('accord_sujet_participe', 'sujet', idTok, 'participe', cible)) {
                            relations.push({ type: 'accord_sujet_participe', sujet: idTok, participe: cible, correct: true });
                        }
                    } else if (!hasRel('accord_sujet_verbe', 'sujet', idTok, 'verbe', cible)) {
                        relations.push({ type: 'accord_sujet_verbe', sujet: idTok, verbe: cible, correct: true });
                    }
                }

                // Sujets coordonnés (ex: Nom2 avec dep "conj" pointant vers Nom1 sujet)
                if (depType === 'conj' && cible > 0) {
                    const tCoord = tokensParId.get(cible);
                    if (tCoord && tCoord.dependance && String(tCoord.dependance.type || '').toLowerCase() === 'nsubj' && Number(tCoord.dependance.cible) > 0) {
                        const idVerbe = Number(tCoord.dependance.cible);
                        const tVerbe = tokensParId.get(idVerbe);
                        const modeVerbe = tVerbe ? String(tVerbe.mode || '').toLowerCase() : '';
                        if (modeVerbe.includes('participe')) {
                            if (!hasRel('accord_sujet_participe', 'sujet', idTok, 'participe', idVerbe)) {
                                relations.push({ type: 'accord_sujet_participe', sujet: idTok, participe: idVerbe, correct: true });
                            }
                        } else if (!hasRel('accord_sujet_verbe', 'sujet', idTok, 'verbe', idVerbe)) {
                            relations.push({ type: 'accord_sujet_verbe', sujet: idTok, verbe: idVerbe, correct: true });
                        }
                    }
                }
            }

            normalisees.push({
                phrase_originale: phraseOriginale,
                phrase_normalisee: String(p.phrase_normalisee || phraseOriginale).trim(),
                langue: p.langue || 'fr',
                tokens: p.tokens,
                relations_globales: relations,
                erreurs: Array.isArray(p.erreurs) ? p.erreurs : [],
                corrections: Array.isArray(p.corrections) ? p.corrections : []
            });
        }

        return { valide: true, donnees: normalisees };
    }

    /**
     * Copie un texte dans le presse-papier avec solution de repli
     * @param {string} texte
     * @returns {Promise<boolean>}
     */
    async function copierTexte(texte) {
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            try {
                await navigator.clipboard.writeText(texte);
                return true;
            } catch {
                // Repli ci-dessous
            }
        }

        if (typeof document !== 'undefined') {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = texte;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '-9999px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return Boolean(success);
            } catch {
                return false;
            }
        }
        return false;
    }

    /**
     * Envoie la dictée validée au script PHP pour enregistrement dans corpus/dictees/
     * @param {any[]} phrases
     * @returns {Promise<{ success: boolean, id?: string, count?: number, error?: string }>}
     */
    async function sauvegarderDicteeSurServeur(phrases) {
        try {
            const response = await fetch('corpus/save_dictee.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(phrases)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                const msg = errData && errData.error ? errData.error : `Erreur serveur (HTTP ${response.status})`;
                return { success: false, error: msg };
            }

            const data = await response.json();
            if (data && data.success && data.id) {
                return { success: true, id: data.id, count: data.count };
            }

            return { success: false, error: (data && data.error) || 'Réponse serveur inattendue.' };
        } catch (e) {
            return { success: false, error: `Impossible de contacter le serveur PHP : ${e.message}` };
        }
    }

    /**
     * Construit l'URL complète de la dictée à partir de son identifiant
     * @param {string} idDictee
     * @returns {string}
     */
    function construireLienDictee(idDictee) {
        if (typeof window === 'undefined' || !window.location) {
            return `?d=${encodeURIComponent(idDictee)}`;
        }
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('d', idDictee);
        return url.toString();
    }

    /**
     * Initialise le contrôleur des modales (Entrée sans paramètre URL + Workflow Prof)
     */
    function initialiserModalesProf() {
        if (typeof document === 'undefined') return;

        const modalEntree = document.getElementById('modal-entree');
        const modalEntreeTexte = document.getElementById('modal-entree-texte');
        const modalEntreeActions = document.getElementById('modal-entree-actions');
        const modalEntreeMessageEleve = document.getElementById('modal-entree-message-eleve');
        const btnRoleProf = document.getElementById('btn-role-prof');
        const btnRoleEleve = document.getElementById('btn-role-eleve');

        const modalProf = document.getElementById('modal-prof');
        const stepPhrases = document.getElementById('prof-step-phrases');
        const stepJson = document.getElementById('prof-step-json');
        const stepLink = document.getElementById('prof-step-link');

        // Étape 1 : Phrases & Copie du préprompt
        const phrasesTextarea = document.getElementById('prof-phrases-textarea');
        const copyPromptBtn = document.getElementById('prof-copy-prompt-btn');
        const copyStatusBox = document.getElementById('prof-copy-status');
        const phrasesCancelBtn = document.getElementById('prof-phrases-cancel-btn');

        // Étape 2 : Collage du JSON
        const jsonTextarea = document.getElementById('prof-json-textarea');
        const jsonErrorContainer = document.getElementById('prof-json-error-container');
        const jsonError = document.getElementById('prof-json-error');
        const copyFixPromptBtn = document.getElementById('prof-copy-fix-prompt-btn');
        const copyFixFeedback = document.getElementById('prof-copy-fix-feedback');
        const validateJsonBtn = document.getElementById('prof-validate-json-btn');
        const backToPhrasesBtn = document.getElementById('prof-back-phrases-btn');

        let derniereErreurJson = '';

        function masquerErreurJson() {
            derniereErreurJson = '';
            if (jsonErrorContainer) jsonErrorContainer.classList.add('hidden');
            if (copyFixFeedback) copyFixFeedback.classList.add('hidden');
        }

        function afficherErreurJson(message) {
            derniereErreurJson = String(message || 'Erreur dans le format JSON.');
            if (jsonError) jsonError.textContent = derniereErreurJson;
            if (jsonErrorContainer) jsonErrorContainer.classList.remove('hidden');
            if (copyFixFeedback) copyFixFeedback.classList.add('hidden');
        }

        // Étape 3 : Lien généré & Disclaimer
        const generatedLinkInput = document.getElementById('prof-generated-link');
        const copyLinkBtn = document.getElementById('prof-copy-link-btn');
        const copyLinkFeedback = document.getElementById('prof-copy-link-feedback');
        const openDicteeBtn = document.getElementById('prof-open-dictee-btn');

        if (!modalEntree || !modalProf) return;

        let timerBascule = null;
        let intervalDecompte = null;

        function nettoyerTimers() {
            if (timerBascule) {
                clearTimeout(timerBascule);
                timerBascule = null;
            }
            if (intervalDecompte) {
                clearInterval(intervalDecompte);
                intervalDecompte = null;
            }
        }

        function aParametreDicteeUrl() {
            if (typeof window === 'undefined' || !window.location) return false;
            try {
                const params = new URLSearchParams(window.location.search || '');
                const brut = (params.get('d') || params.get('dictee') || '').trim();
                return /^[a-zA-Z0-9_-]{2,64}$/.test(brut);
            } catch {
                return false;
            }
        }

        function afficherEtapeProf(etapeActive) {
            nettoyerTimers();
            [stepPhrases, stepJson, stepLink].forEach((el) => {
                if (!el) return;
                if (el === etapeActive) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });

            const dialogBox = modalProf.querySelector('.modal-prof-box');
            if (dialogBox) {
                if (etapeActive === stepPhrases || etapeActive === stepJson) {
                    dialogBox.classList.add('modal-prof-large');
                } else {
                    dialogBox.classList.remove('modal-prof-large');
                }
            }
        }

        function ouvrirModaleEntree(messagePersonnalise) {
            nettoyerEleveTimer();
            modalProf.classList.add('hidden');
            if (modalEntreeTexte && messagePersonnalise) {
                modalEntreeTexte.textContent = messagePersonnalise;
            }
            if (modalEntreeActions) modalEntreeActions.classList.remove('hidden');
            if (modalEntreeMessageEleve) modalEntreeMessageEleve.classList.add('hidden');
            modalEntree.classList.remove('hidden');
        }

        function ouvrirModaleProf() {
            modalEntree.classList.add('hidden');
            modalProf.classList.remove('hidden');
            afficherEtapeProf(stepPhrases);
            mettreAJourEtatBoutonCopiePrompt();
            if (copyStatusBox) copyStatusBox.classList.add('hidden');
            if (phrasesTextarea) {
                setTimeout(() => phrasesTextarea.focus(), 50);
            }
        }

        function fermerModaleProfOuRetourEntree() {
            nettoyerTimers();
            if (aParametreDicteeUrl()) {
                modalProf.classList.add('hidden');
            } else {
                ouvrirModaleEntree();
            }
        }

        // Gestion de la modale d'entrée ("Je suis prof" / "Je suis élève")
        if (btnRoleProf) {
            btnRoleProf.addEventListener('click', () => {
                ouvrirModaleProf();
            });
        }

        let eleveTimer = null;
        let eleveInterval = null;

        function nettoyerEleveTimer() {
            if (eleveTimer) {
                clearTimeout(eleveTimer);
                eleveTimer = null;
            }
            if (eleveInterval) {
                clearInterval(eleveInterval);
                eleveInterval = null;
            }
        }

        function fermerOngletOuFenetre() {
            try {
                window.open('', '_self');
                window.close();
            } catch {
                // ignore
            }
        }

        if (btnRoleEleve) {
            btnRoleEleve.addEventListener('click', () => {
                nettoyerEleveTimer();
                if (modalEntreeActions) modalEntreeActions.classList.add('hidden');
                if (modalEntreeMessageEleve) {
                    modalEntreeMessageEleve.classList.remove('hidden');
                }

                let secondesRestantes = 5;
                const updateCountdown = () => {
                    const countdownEl = document.getElementById('prof-eleve-countdown');
                    if (countdownEl) {
                        countdownEl.textContent = `(fermeture dans ${secondesRestantes} s)`;
                    }
                };
                updateCountdown();

                eleveInterval = setInterval(() => {
                    secondesRestantes -= 1;
                    if (secondesRestantes > 0) {
                        updateCountdown();
                    } else {
                        nettoyerEleveTimer();
                    }
                }, 1000);

                eleveTimer = setTimeout(() => {
                    nettoyerEleveTimer();
                    fermerOngletOuFenetre();
                }, 5000);
            });
        }

        // Étape 1 : Saisie des phrases & Copie du prompt
        function mettreAJourEtatBoutonCopiePrompt() {
            if (!phrasesTextarea || !copyPromptBtn) return;
            const phrases = extrairePhrasesSaisies(phrasesTextarea.value);
            copyPromptBtn.disabled = phrases.length === 0;
        }

        if (phrasesTextarea) {
            phrasesTextarea.addEventListener('input', () => {
                mettreAJourEtatBoutonCopiePrompt();
            });
        }

        if (phrasesCancelBtn) {
            phrasesCancelBtn.addEventListener('click', fermerModaleProfOuRetourEntree);
        }

        function passerAEtapeJson() {
            afficherEtapeProf(stepJson);
            masquerErreurJson();
            mettreAJourEtatBoutonValiderJson();
            if (jsonTextarea) {
                setTimeout(() => jsonTextarea.focus(), 50);
            }
        }

        if (copyPromptBtn) {
            copyPromptBtn.addEventListener('click', async () => {
                if (!phrasesTextarea) return;
                const phrases = extrairePhrasesSaisies(phrasesTextarea.value);
                if (phrases.length === 0) return;

                const promptComplet = genererPreprompt(phrases);
                await copierTexte(promptComplet);

                copyPromptBtn.disabled = true;
                let secondesRestantes = Math.ceil(DELAI_BASCULE_MS / 1000);

                if (copyStatusBox) {
                    copyStatusBox.textContent = `✅ Prompt copié dans le presse-papier (${phrases.length} phrase${phrases.length > 1 ? 's' : ''}) ! Ouverture de la fenêtre de collage du JSON dans ${secondesRestantes} s...`;
                    copyStatusBox.classList.remove('hidden');
                }

                nettoyerTimers();
                intervalDecompte = setInterval(() => {
                    secondesRestantes -= 1;
                    if (secondesRestantes > 0 && copyStatusBox) {
                        copyStatusBox.textContent = `✅ Prompt copié dans le presse-papier (${phrases.length} phrase${phrases.length > 1 ? 's' : ''}) ! Ouverture de la fenêtre de collage du JSON dans ${secondesRestantes} s...`;
                    }
                }, 1000);

                timerBascule = setTimeout(() => {
                    nettoyerTimers();
                    passerAEtapeJson();
                }, DELAI_BASCULE_MS);
            });
        }

        // Étape 2 : Collage et validation du JSON
        function mettreAJourEtatBoutonValiderJson() {
            if (!jsonTextarea || !validateJsonBtn) return;
            validateJsonBtn.disabled = jsonTextarea.value.trim().length === 0;
        }

        if (jsonTextarea) {
            jsonTextarea.addEventListener('input', () => {
                mettreAJourEtatBoutonValiderJson();
                masquerErreurJson();
            });
        }

        if (copyFixPromptBtn) {
            copyFixPromptBtn.addEventListener('click', async () => {
                if (!derniereErreurJson) return;
                const promptRectif = genererPromptRectification(derniereErreurJson);
                await copierTexte(promptRectif);
                if (copyFixFeedback) {
                    copyFixFeedback.classList.remove('hidden');
                }
            });
        }

        if (backToPhrasesBtn) {
            backToPhrasesBtn.addEventListener('click', () => {
                afficherEtapeProf(stepPhrases);
                masquerErreurJson();
                if (copyStatusBox) copyStatusBox.classList.add('hidden');
                mettreAJourEtatBoutonCopiePrompt();
            });
        }

        if (validateJsonBtn) {
            validateJsonBtn.addEventListener('click', async () => {
                if (!jsonTextarea) return;
                const validation = validerJsonDictee(jsonTextarea.value);
                if (!validation.valide) {
                    afficherErreurJson(validation.erreur);
                    return;
                }

                validateJsonBtn.disabled = true;
                const texteOriginalBtn = validateJsonBtn.textContent;
                validateJsonBtn.textContent = '⏳ Création de la dictée en cours...';

                const sauvegarde = await sauvegarderDicteeSurServeur(validation.donnees);
                validateJsonBtn.textContent = texteOriginalBtn;
                validateJsonBtn.disabled = false;

                if (!sauvegarde.success) {
                    afficherErreurJson(sauvegarde.error || 'Erreur lors de la sauvegarde.');
                    return;
                }

                const lienComplet = construireLienDictee(sauvegarde.id);
                if (generatedLinkInput) {
                    generatedLinkInput.value = lienComplet;
                }
                if (copyLinkFeedback) {
                    copyLinkFeedback.classList.add('hidden');
                }
                if (openDicteeBtn) {
                    openDicteeBtn.dataset.targetUrl = lienComplet;
                }

                afficherEtapeProf(stepLink);
            });
        }

        // Étape 3 : Copie du lien généré et accès
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', async () => {
                if (!generatedLinkInput || !generatedLinkInput.value) return;
                await copierTexte(generatedLinkInput.value);
                if (copyLinkFeedback) {
                    copyLinkFeedback.textContent = '✅ Lien copié dans le presse-papier !';
                    copyLinkFeedback.classList.remove('hidden');
                }
            });
        }

        if (openDicteeBtn) {
            openDicteeBtn.addEventListener('click', () => {
                const targetUrl = openDicteeBtn.dataset.targetUrl || (generatedLinkInput && generatedLinkInput.value);
                if (targetUrl) {
                    window.location.href = targetUrl;
                } else {
                    fermerModaleProfOuRetourEntree();
                }
            });
        }

        // Ouverture automatique de la modale d'entrée si l'URL n'a pas de paramètre ?d=...
        if (!aParametreDicteeUrl()) {
            ouvrirModaleEntree();
        }

        window.addEventListener('abe-aucune-dictee-url', () => {
            // Ne pas écraser l'affichage si l'élève est déjà en train de lire le message
            if (modalProf.classList.contains('hidden') && modalEntreeMessageEleve && modalEntreeMessageEleve.classList.contains('hidden')) {
                ouvrirModaleEntree();
            }
        });

        window.addEventListener('abe-dictee-introuvable', () => {
            ouvrirModaleEntree('Le lien de dictée demandé est introuvable ou invalide. Indique ton profil :');
        });
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialiserModalesProf);
        } else {
            initialiserModalesProf();
        }
    }

    global.AbeProfWorkflow = {
        DELAI_BASCULE_MS,
        extrairePhrasesSaisies,
        genererPreprompt,
        genererPromptRectification,
        validerJsonDictee,
        copierTexte,
        sauvegarderDicteeSurServeur,
        construireLienDictee,
        initialiserModalesProf
    };

})(typeof window !== 'undefined' ? window : globalThis);
