<?php
/**
 * API Endpoint: Suggest Player Name
 * Findet den nächsten verfügbaren "Player_X" Namen
 */

require_once '../config.php';

// Nur POST erlauben (für Konsistenz)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

// Players laden
$playersData = loadJSON('players.json');

// Sammle alle existierenden "Player_X" Namen
$playerNumbers = [];

if ($playersData && isset($playersData['players'])) {
    foreach ($playersData['players'] as $player) {
        $name = $player['playerName'];
        
        // Prüfe ob Name dem Pattern "Player_X" entspricht
        if (preg_match('/^Player_(\d+)$/i', $name, $matches)) {
            $playerNumbers[] = (int) $matches[1];
        }
    }
}

// Finde die nächste freie Nummer
if (empty($playerNumbers)) {
    // Keine Player_X Namen vorhanden = Start mit 1
    $nextNumber = 1;
} else {
    // Sortiere Nummern
    sort($playerNumbers);
    
    // Finde erste Lücke oder nimm nächste Nummer
    $nextNumber = 1;
    foreach ($playerNumbers as $num) {
        if ($num === $nextNumber) {
            $nextNumber++;
        } else {
            // Lücke gefunden
            break;
        }
    }
}

$suggestedName = "Player_" . $nextNumber;

jsonResponse([
    'success' => true,
    'suggestedName' => $suggestedName,
    'nextNumber' => $nextNumber
]);