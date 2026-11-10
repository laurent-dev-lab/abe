<?php
/**
 * Relais de lecture d'une dictée.
 * 1. Renouvelle le timestamp du fichier (touch) pour ne pas purger une dictée activement utilisée en classe.
 * 2. Effectue silencieusement une passe de nettoyage des dictées vieilles de > 30 jours (probabilité 1/10).
 * 3. Renvoie le JSON de la dictée demandée.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$dicteeId = isset($_GET['d']) ? trim((string)$_GET['d']) : '';
if (!preg_match('/^[a-zA-Z0-9_-]{2,64}$/', $dicteeId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Identifiant de dictée invalide.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$dicteesDir = __DIR__ . DIRECTORY_SEPARATOR . 'dictees';
$filepath = $dicteesDir . DIRECTORY_SEPARATOR . $dicteeId . '.json';

if (!is_file($filepath)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Dictée introuvable.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Renouvellement silencieux : la dictée est ouverte aujourd'hui, elle repart pour 30 jours
@touch($filepath);

// Nettoyage probabiliste en lecture (1 chance sur 10) pour purger sans ralentir l'élève
if (mt_rand(1, 10) === 1) {
    require_once __DIR__ . DIRECTORY_SEPARATOR . 'clean_dictees.php';
    AbeDicteesCleaner::nettoyer($dicteesDir);
}

readfile($filepath);
exit;

