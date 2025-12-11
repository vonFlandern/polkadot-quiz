<?php
/**
 * API Endpoint: Get Player Data
 * Lädt die Daten eines Spielers anhand seiner Wallet-Adresse
 */

require_once '../config.php';

// Wähle automatisch die richtige Converter-Version
if (extension_loaded('gmp') && extension_loaded('sodium')) {
    require_once '../SS58AddressConverter.php';
    $converterClass = 'SS58AddressConverter';
} else {
    require_once '../SS58AddressConverterFallback.php';
    $converterClass = 'SS58AddressConverterFallback';
}

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
$polkadotAddress = $walletAddress;

// Konvertiere für Anzeige
try {
    $converted = call_user_func([$converterClass, 'toPolkadot'], $walletAddress);
    $polkadotAddress = $converted;
    error_log("Player lookup ({$converterClass}): {$genericAddress} -> {$polkadotAddress}");
} catch (Exception $e) {
    error_log("SS58 conversion failed in get-player: " . $e->getMessage());
}

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
        'genericAddress' => $genericAddress,
        'polkadotAddress' => $polkadotAddress
    ]);
}

// Spieler gefunden - Return mit beiden Adressen
jsonResponse([
    'found' => true,
    'returning' => true,  // Wiederkehrender Spieler!
    'player' => $player,
    'genericAddress' => $genericAddress,
    'polkadotAddress' => $polkadotAddress
]);