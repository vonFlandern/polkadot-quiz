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

$requiredFields = ['walletAddress', 'networkGroup', 'onChainData'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field])) {
        errorResponse("Missing field: $field");
    }
}

$walletAddress = sanitizeInput($input['walletAddress']);
$networkGroup = sanitizeInput($input['networkGroup']);
$onChainData = $input['onChainData'];

// Validierungen
if (!isValidPolkadotAddress($walletAddress)) {
    errorResponse('Invalid wallet address');
}

// Network Group validieren (whitelist)
if (!in_array($networkGroup, ['polkadot', 'kusama'], true)) {
    errorResponse('Invalid network group. Allowed: polkadot, kusama');
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

// Daten für die Network Group speichern (hierarchische Struktur)
$player['onChainData'][$networkGroup] = $onChainData;

// Player-Daten aktualisieren
$playersData['players'][$playerIndex] = $player;

// Speichern mit File-Locking
if (!saveJSON('players.json', $playersData)) {
    errorResponse('Failed to save on-chain data');
}

// Erfolgreiche Response
jsonResponse([
    'success' => true,
    'message' => 'Aggregated on-chain data saved successfully',
    'networkGroup' => $networkGroup,
    'lastUpdate' => $onChainData['lastUpdate']
]);
