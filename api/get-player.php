<?php
/**
 * API Endpoint: Get Player Data
 * Lädt die Daten eines Spielers anhand seiner Wallet-Adresse
 */

require_once '../config.php';

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

// Input validieren
$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['walletAddress'])) {
    errorResponse('Wallet address required');
}

$walletAddress = sanitizeInput($input['walletAddress']);

if (!isValidPolkadotAddress($walletAddress)) {
    errorResponse('Invalid wallet address');
}

// WICHTIG: Suche immer nach Generic-Adresse (Primary Key)
$genericAddress = $walletAddress;

// Players laden
$playersData = loadJSON('players.json');
if (!$playersData) {
    jsonResponse([
        'found' => false,
        'message' => 'No players data'
    ]);
}

// Spieler suchen - nach Generic-Adresse!
$player = null;
foreach ($playersData['players'] as $p) {
    $storedGeneric = isset($p['genericAddress']) ? $p['genericAddress'] : $p['walletAddress'];
    
    if ($storedGeneric === $genericAddress) {
        $player = $p;
        break;
    }
}

// Wenn Spieler nicht gefunden
if (!$player) {
    jsonResponse([
        'found' => false,
        'message' => 'Player not found',
        'genericAddress' => $genericAddress
    ]);
}

// On-Chain-Daten inkludieren falls vorhanden
$onChainData = isset($player['onChainData']) ? $player['onChainData'] : null;

// Spieler gefunden - Return mit On-Chain-Daten
jsonResponse([
    'found' => true,
    'returning' => true,  // Wiederkehrender Spieler!
    'player' => $player,
    'genericAddress' => $genericAddress,
    'onChainData' => $onChainData
]);