<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée. Utilisez POST.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawInput = file_get_contents('php://input');
if ((!$rawInput || trim($rawInput) === '') && php_sapi_name() === 'cli') {
    $rawInput = file_get_contents('php://stdin');
}
if (!$rawInput || trim($rawInput) === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Aucune donnée reçue.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode($rawInput, true);
if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON invalide : ' . json_last_error_msg()], JSON_UNESCAPED_UNICODE);
    exit;
}

// Vérifier que le format est un tableau de phrases
$phrases = null;
if (is_array($data)) {
    if (isset($data['phrases']) && is_array($data['phrases'])) {
        $phrases = $data['phrases'];
    } elseif (isset($data[0]) && is_array($data[0])) {
        $phrases = $data;
    }
}

if (!$phrases || !is_array($phrases) || count($phrases) === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Le JSON doit contenir au moins une phrase annotée.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Validation minimale de chaque phrase
foreach ($phrases as $idx => $p) {
    if (!is_array($p) || empty($p['phrase_originale']) || empty($p['tokens']) || !is_array($p['tokens'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "La phrase à l'index $idx est invalide. Les champs 'phrase_originale' et 'tokens' sont obligatoires."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Création du dossier cible si inexistant
$dicteesDir = __DIR__ . DIRECTORY_SEPARATOR . 'dictees';
if (!is_dir($dicteesDir)) {
    if (!@mkdir($dicteesDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Impossible de créer le dossier de stockage des dictées.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Génération d'un identifiant unique court et aléatoire (ex: d_a1b2c3d4)
try {
    $bytes = random_bytes(4);
    $id = 'd_' . bin2hex($bytes);
} catch (\Exception $e) {
    $id = 'd_' . substr(md5(uniqid((string)mt_rand(), true)), 0, 8);
}

$filename = $id . '.json';
$filepath = $dicteesDir . DIRECTORY_SEPARATOR . $filename;

// Écriture du fichier JSON formaté
$encoded = json_encode($phrases, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
$written = @file_put_contents($filepath, $encoded);

if ($written === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'enregistrement du fichier sur le serveur.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Nettoyage automatique silencieux des dictées de plus de 30 jours
require_once __DIR__ . DIRECTORY_SEPARATOR . 'clean_dictees.php';
$purgeStats = AbeDicteesCleaner::nettoyer($dicteesDir);

echo json_encode([
    'success' => true,
    'id' => $id,
    'count' => count($phrases),
    'file' => $filename,
    'purged' => $purgeStats['supprimes']
], JSON_UNESCAPED_UNICODE);
