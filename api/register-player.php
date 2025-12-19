<?php
/**
 * API Endpoint: Register/Update Player
 * Speichert oder aktualisiert Spieler sofort nach Wallet-Verbindung
 */

require_once '../config.php';

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

// Auto-select Converter
if (extension_loaded('gmp') && extension_loaded('sodium')) {
    require_once '../SS58AddressConverter.php';
    $converterClass = 'SS58AddressConverter';
} else {
    require_once '../SS58AddressConverterFallback.php';
    $converterClass = 'SS58AddressConverterFallback';
}

// Input validieren
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['walletAddress'])) {
    errorResponse('Wallet address required');
}

$walletAddress = sanitizeInput($input['walletAddress']);
$playerName = isset($input['playerName']) ? sanitizeInput($input['playerName']) : null;
$walletName = isset($input['walletName']) ? sanitizeInput($input['walletName']) : null;

// Validierungen
if (!isValidPolkadotAddress($walletAddress)) {
    errorResponse('Invalid wallet address');
}

// Validierung: Wenn playerName angegeben, muss er 3-20 Zeichen sein
if ($playerName !== null) {
    if (strlen($playerName) < 3) {
        errorResponse('Player name must be at least 3 characters');
    }

    if (strlen($playerName) > 20) {
        errorResponse('Player name must be max 20 characters');
    }
}



// WICHTIG: Speichere ORIGINAL (Generic) als Primary Key
$genericAddress = $walletAddress;
$polkadotAddress = $walletAddress;

// Versuche zu konvertieren für Anzeige
try {
    $converted = call_user_func([$converterClass, 'toPolkadot'], $walletAddress);
    $polkadotAddress = $converted;
    
    error_log("Register player ({$converterClass}): {$genericAddress} -> {$polkadotAddress}");
} catch (Exception $e) {
    error_log("SS58 conversion failed: " . $e->getMessage());
    // Kein Problem: Nutze Generic für beide
}

// Prüfe Verfügbarkeit nur wenn Name angegeben
if ($playerName !== null) {
    $availabilityCheck = checkPlayerNameAvailability($playerName, $genericAddress);
    if (!$availabilityCheck['available']) {
        errorResponse($availabilityCheck['error']);
    }
}

// Players laden
$playersData = loadJSON('players.json');
if (!$playersData) {
    $playersData = ['players' => []];
}

// Suche Spieler anhand genericAddress (Primary Key)
$playerIndex = -1;
foreach ($playersData['players'] as $index => $p) {
    $storedGeneric = isset($p['genericAddress']) ? $p['genericAddress'] : $p['walletAddress'];
    
    if ($storedGeneric === $genericAddress) {
        $playerIndex = $index;
        break;
    }
}

// Neuer Spieler?
if ($playerIndex === -1) {
    $newPlayer = [
        'genericAddress' => $genericAddress,      // Primary Key
        'polkadotAddress' => $polkadotAddress,    // Für Anzeige
        'walletAddress' => $genericAddress,       // Backward compatibility
        'walletName' => $walletName,              // NEU: Name aus Wallet-Extension
        'playerName' => $playerName,              // Kann null sein
        'nameHistory' => $playerName !== null ? [
            [
                'name' => $playerName,
                'timestamp' => date('c'),
                'action' => 'initial'
            ]
        ] : [],
        'registeredAt' => date('c'),
        'totalScore' => 0,
        'totalTime' => 0,
        'completedLevels' => 0,
        'levels' => [],
        'currentCategory' => 0,           // NEU: Höchste erreichte Kategorie
        'categoryHistory' => []           // NEU: Chronologischer Verlauf
    ];
    $playersData['players'][] = $newPlayer;
    $playerIndex = count($playersData['players']) - 1;
    
    error_log("New player registered: {$playerName} ({$genericAddress})");
    
} else {
    // Bestehender Spieler - Update
    $playersData['players'][$playerIndex]['polkadotAddress'] = $polkadotAddress;
    
    // Prüfe ob Name geändert wurde (nur wenn neuer Name angegeben)
    $currentName = $playersData['players'][$playerIndex]['playerName'];
    if ($playerName !== null && $currentName !== $playerName) {
        // Name wurde geändert - Füge zu Historie hinzu
        if (!isset($playersData['players'][$playerIndex]['nameHistory'])) {
            // Alte Einträge: Erstelle Historie mit aktuellem Namen
            $playersData['players'][$playerIndex]['nameHistory'] = [
                [
                    'name' => $currentName,
                    'timestamp' => $playersData['players'][$playerIndex]['registeredAt'],
                    'action' => 'initial'
                ]
            ];
        }
        
        // Füge neue Änderung hinzu
        $playersData['players'][$playerIndex]['nameHistory'][] = [
            'name' => $playerName,
            'timestamp' => date('c'),
            'action' => 'changed',
            'previousName' => $currentName
        ];
        
        // Update aktuellen Namen
        $playersData['players'][$playerIndex]['playerName'] = $playerName;
        
        error_log("Player name changed: {$currentName} -> {$playerName} for {$genericAddress}");
    }
}

// Speichern
if (!saveJSON('players.json', $playersData)) {
    errorResponse('Could not save player data', 500);
}

$player = $playersData['players'][$playerIndex];

// Erfolgreiche Response
jsonResponse([
    'success' => true,
    'message' => $playerIndex === count($playersData['players']) - 1 ? 'Player registered' : 'Player updated',
    'player' => $player,
    'isNewPlayer' => $playerIndex === count($playersData['players']) - 1
]);