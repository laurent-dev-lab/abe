<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Les parcours ne sont pas répertoriés publiquement
echo json_encode(['files' => []], JSON_UNESCAPED_UNICODE);
