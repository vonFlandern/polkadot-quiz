<?php
/**
 * API Endpoint: Save On-Chain Data
 * Speichert On-Chain-Daten eines Spielers in players.json
 * Wird nach Pre-Loading und bei manuellen Refreshes aufgerufen
 */

require_once '../config.php';

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

// Input validieren
$input = json_decode(file_get_contents('php://input'), true);

$requiredFields = ['walletAddress', 'network', 'onChainData'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field])) {
        errorResponse("Missing field: $field");
    }
}

$walletAddress = sanitizeInput($input['walletAddress']);
$network = sanitizeInput($input['network']);
$onChainData = $input['onChainData'];

// Validierungen
if (!isValidPolkadotAddress($walletAddress)) {
    errorResponse('Invalid wallet address');
}

// Network-Namen validieren (alphanum + dash)
if (!preg_match('/^[a-z0-9-]+$/', $network)) {
    errorResponse('Invalid network name format');
}

// On-Chain-Daten validieren (muss Object sein mit erwarteten Keys)
if (!is_array($onChainData) || !isset($onChainData['lastUpdate'])) {
    errorResponse('Invalid on-chain data structure');
}

// WICHTIG: Generic Address ist der Primary Key
$genericAddress = $walletAddress;

// Players.json laden
$playersData = loadJSON('players.json');

// Player finden
$player = null;
$playerIndex = null;

foreach ($playersData['players'] as $index => $p) {
    // Suche nach Generic Address (Primary Key)
    $storedGeneric = isset($p['genericAddress']) ? $p['genericAddress'] : $p['walletAddress'];
    
    if ($storedGeneric === $genericAddress) {
        $player = $p;
        $playerIndex = $index;
        break;
    }
}

if (!$player) {
    errorResponse('Player not found. Please register first.');
}

// On-Chain-Daten zum Player hinzufügen/aktualisieren
if (!isset($player['onChainData'])) {
    $player['onChainData'] = [];
}

// Daten für das spezifische Netzwerk speichern
$player['onChainData'][$network] = $onChainData;

// Player-Daten aktualisieren
$playersData['players'][$playerIndex] = $player;

// Speichern mit File-Locking
if (!saveJSON('players.json', $playersData)) {
    errorResponse('Failed to save on-chain data');
}

// Erfolgreiche Response
jsonResponse([
    'success' => true,
    'message' => 'On-chain data saved successfully',
    'network' => $network,
    'lastUpdate' => $onChainData['lastUpdate']
]);
