<?php
/**
 * API Endpoint: Check Name Availability
 * Prüft ob ein Spielername bereits vergeben ist
 */

require_once '../config.php';

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

// Input validieren
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['playerName'])) {
    errorResponse('Player name required');
}

$playerName = sanitizeInput($input['playerName']);
$walletAddress = isset($input['walletAddress']) ? sanitizeInput($input['walletAddress']) : null;

// Prüfe Verfügbarkeit mit gemeinsamer Funktion
$result = checkPlayerNameAvailability($playerName, $walletAddress);

jsonResponse([
    'available' => $result['available'],
    'error' => $result['error'],
    'playerName' => $playerName
]);