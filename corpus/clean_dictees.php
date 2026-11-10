<?php
/**
 * Module utilitaire de nettoyage automatique des dictées expirées (30 jours).
 * Appelé silencieusement par les flux PHP sans nécessiter de tâche planifiée (cron).
 */

class AbeDicteesCleaner
{
    /**
     * Durée de conservation par défaut : 30 jours en secondes.
     */
    public const DUREE_MAX_SECONDES = 30 * 86400;

    /**
     * Nettoie les fichiers JSON du dossier des dictées dont l'âge dépasse le seuil défini.
     *
     * @param string|null $dicteesDir Chemin vers le dossier des dictées
     * @param int $dureeMaxSecondes Seuil d'expiration en secondes
     * @return array Statistiques du nettoyage ['total_fichiers', 'supprimes', 'erreurs']
     */
    public static function nettoyer(?string $dicteesDir = null, int $dureeMaxSecondes = self::DUREE_MAX_SECONDES): array
    {
        if ($dicteesDir === null) {
            $dicteesDir = __DIR__ . DIRECTORY_SEPARATOR . 'dictees';
        }

        $stats = [
            'total_fichiers' => 0,
            'supprimes' => 0,
            'erreurs' => 0
        ];

        if (!is_dir($dicteesDir)) {
            return $stats;
        }

        $maintenant = time();
        $motif = $dicteesDir . DIRECTORY_SEPARATOR . 'd_*.json';
        $fichiers = glob($motif);

        if (!is_array($fichiers)) {
            return $stats;
        }

        $stats['total_fichiers'] = count($fichiers);

        foreach ($fichiers as $fichier) {
            if (!is_file($fichier)) {
                continue;
            }

            $mtime = @filemtime($fichier);
            if ($mtime === false) {
                continue;
            }

            $age = $maintenant - $mtime;
            if ($age > $dureeMaxSecondes) {
                if (@unlink($fichier)) {
                    $stats['supprimes']++;
                } else {
                    $stats['erreurs']++;
                }
            }
        }

        return $stats;
    }
}

