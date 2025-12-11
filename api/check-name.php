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

// Validierung: 3-20 Zeichen
if (strlen($playerName) < 3) {
    jsonResponse([
        'available' => false,
        'error' => 'Name muss mindestens 3 Zeichen haben'
    ]);
}

if (strlen($playerName) > 20) {
    jsonResponse([
        'available' => false,
        'error' => 'Name darf maximal 20 Zeichen haben'
    ]);
}

// Players laden
$playersData = loadJSON('players.json');
if (!$playersData || !isset($playersData['players'])) {
    // Keine Spieler = Name verfügbar
    jsonResponse([
        'available' => true,
        'playerName' => $playerName
    ]);
}

// Prüfe ob Name bereits vergeben ist
$nameExists = false;
foreach ($playersData['players'] as $player) {
    // Case-insensitive Vergleich
    if (strcasecmp($player['playerName'], $playerName) === 0) {
        // Falls walletAddress gegeben: Ist es der eigene Name?
        if ($walletAddress) {
            $playerGeneric = isset($player['genericAddress']) ? $player['genericAddress'] : $player['walletAddress'];
            
            if ($playerGeneric === $walletAddress) {
                // Eigener Name = OK
                continue;
            }
        }
        
        $nameExists = true;
        break;
    }
}

if ($nameExists) {
    jsonResponse([
        'available' => false,
        'error' => 'Name bereits vergeben'
    ]);
} else {
    jsonResponse([
        'available' => true,
        'playerName' => $playerName
    ]);
}