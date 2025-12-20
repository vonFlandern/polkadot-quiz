<?php
/**
 * API Endpoint: Save Score
 * Speichert den Score eines Spielers nach Abschluss eines Levels
 */

require_once '../config.php';

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

// Input validieren
$input = json_decode(file_get_contents('php://input'), true);

$requiredFields = ['walletAddress', 'playerName', 'levelNumber', 'levelData'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field])) {
        errorResponse("Missing field: $field");
    }
}

$walletAddress = sanitizeInput($input['walletAddress']);
$playerName = sanitizeInput($input['playerName']);
$levelNumber = (int) $input['levelNumber'];
$levelData = $input['levelData'];

// Validierungen
if (!isValidPolkadotAddress($walletAddress)) {
    errorResponse('Invalid wallet address');
}

// WICHTIG: Speichere ORIGINAL (Generic) als Primary Key
$genericAddress = $walletAddress;

// Validierung: 3-20 Zeichen
if (strlen($playerName) < 3) {
    errorResponse('Player name must be at least 3 characters');
}

if (strlen($playerName) > 20) {
    errorResponse('Player name must be max 20 characters');
}

if ($levelNumber < 1 || $levelNumber > 15) {
    errorResponse('Invalid level number');
}

// Level-Daten validieren
$requiredLevelFields = ['score', 'time', 'correctAnswers', 'totalQuestions', 'passed'];
foreach ($requiredLevelFields as $field) {
    if (!isset($levelData[$field])) {
        errorResponse("Missing level data field: $field");
    }
}

// Minimum-Regel: Score kann nicht negativ sein
if ($levelData['score'] < 0) {
    $levelData['score'] = 0;
}

// Players laden
$playersData = loadJSON('players.json');
if (!$playersData) {
    $playersData = ['players' => []];
}

// Prüfe ob Name bereits vergeben ist (case-insensitive)
$playerIndex = -1;
$nameAlreadyTaken = false;

foreach ($playersData['players'] as $index => $p) {
    // Suche nach genericAddress (Primary Key)
    $storedGeneric = isset($p['genericAddress']) ? $p['genericAddress'] : $p['walletAddress'];
    
    if ($storedGeneric === $genericAddress) {
        $playerIndex = $index;
    }
    
    // Prüfe Namen (case-insensitive)
    if (strcasecmp($p['playerName'], $playerName) === 0) {
        // Ist es der eigene Name?
        if ($storedGeneric !== $genericAddress) {
            // Jemand anders hat diesen Namen!
            $nameAlreadyTaken = true;
        }
    }
}

// Name bereits vergeben?
if ($nameAlreadyTaken) {
    errorResponse('Player name already taken. Please choose another name.');
}

// Neuer Spieler?
if ($playerIndex === -1) {
    $newPlayer = [
        'genericAddress' => $genericAddress,      // Primary Key
        'walletAddress' => $genericAddress,       // Backward compatibility
        'playerName' => $playerName,
        'nameHistory' => [
            [
                'name' => $playerName,
                'timestamp' => date('c'),
                'action' => 'initial'
            ]
        ],
        'registeredAt' => date('c'),
        'totalScore' => 0,
        'totalTime' => 0,
        'completedLevels' => 0,
        'levels' => [],
        'currentCategory' => 0,        // NEU: Category-Tracking
        'categoryHistory' => []        // NEU: Category-Tracking
    ];
    $playersData['players'][] = $newPlayer;
    $playerIndex = count($playersData['players']) - 1;
} else {
    // Prüfe ob Name geändert wurde
    $currentName = $playersData['players'][$playerIndex]['playerName'];
    if ($currentName !== $playerName) {
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

$player = &$playersData['players'][$playerIndex];

// Level-Daten speichern
$levelKey = (string) $levelNumber;

// Ist das der erste Versuch?
$isFirstAttempt = !isset($player['levels'][$levelKey]);

if ($isFirstAttempt) {
    // Erster Versuch - zählt für Leaderboard
    $player['levels'][$levelKey] = [
        'firstAttempt' => [
            'score' => $levelData['score'],
            'time' => $levelData['time'],
            'correctAnswers' => $levelData['correctAnswers'],
            'totalQuestions' => $levelData['totalQuestions'],
            'passed' => $levelData['passed'],
            'timestamp' => date('c'),
            'hintsUsed' => $levelData['hintsUsed'] ?? 0,
            'timeAddsUsed' => $levelData['timeAddsUsed'] ?? 0
        ],
        'bestAttempt' => [
            'score' => $levelData['score'],
            'time' => $levelData['time'],
            'correctAnswers' => $levelData['correctAnswers'],
            'totalQuestions' => $levelData['totalQuestions'],
            'passed' => $levelData['passed'],
            'timestamp' => date('c'),
            'hintsUsed' => $levelData['hintsUsed'] ?? 0,
            'timeAddsUsed' => $levelData['timeAddsUsed'] ?? 0
        ],
        'attempts' => 1,
        'unlocked' => $levelData['passed']  // Level freigeschaltet wenn bestanden
    ];
    
    // Gesamtpunktzahl und Zeit updaten (nur firstAttempt zählt)
    $player['totalScore'] += $levelData['score'];
    $player['totalTime'] += $levelData['time'];
    
    // Completed Levels updaten (wenn bestanden)
    if ($levelData['passed'] && $levelNumber > $player['completedLevels']) {
        $player['completedLevels'] = $levelNumber;
    }
    
    error_log("First attempt for level {$levelNumber}: passed=" . ($levelData['passed'] ? 'true' : 'false') . ", score={$levelData['score']}");
    
} else {
    // Weitere Versuche
    $player['levels'][$levelKey]['attempts']++;
    
    // Update bestAttempt wenn dieser Versuch besser ist
    $currentBestScore = $player['levels'][$levelKey]['bestAttempt']['score'] ?? 0;
    
    if ($levelData['score'] > $currentBestScore) {
        $player['levels'][$levelKey]['bestAttempt'] = [
            'score' => $levelData['score'],
            'time' => $levelData['time'],
            'correctAnswers' => $levelData['correctAnswers'],
            'totalQuestions' => $levelData['totalQuestions'],
            'passed' => $levelData['passed'],
            'timestamp' => date('c'),
            'hintsUsed' => $levelData['hintsUsed'] ?? 0,
            'timeAddsUsed' => $levelData['timeAddsUsed'] ?? 0
        ];
        
        error_log("New best attempt for level {$levelNumber}: score={$levelData['score']} (previous best: {$currentBestScore})");
    }
    
    // WICHTIG: Freischaltung auch bei späterem Bestehen!
    if ($levelData['passed'] && !$player['levels'][$levelKey]['unlocked']) {
        $player['levels'][$levelKey]['unlocked'] = true;
        
        // Update completedLevels falls nötig
        if ($levelNumber > $player['completedLevels']) {
            $player['completedLevels'] = $levelNumber;
        }
        
        error_log("Level {$levelNumber} now UNLOCKED after repeat attempt!");
    }
}

// Spielername updaten (falls geändert)
$player['playerName'] = $playerName;

// NEU: Category-Tracking nach Level-Bestehen
if ($levelData['passed']) {
    // Lade Categories und Questions
    $categoriesData = loadJSON('categories.json');
    $questionsData = loadJSON('questions.json');

    // Hole catId des bestandenen Levels
    $levelKeyForQuestions = "level{$levelNumber}";
    $catId = isset($questionsData[$levelKeyForQuestions]['catId'])
        ? $questionsData[$levelKeyForQuestions]['catId']
        : null;

    // Sicherstellen, dass currentCategory existiert (für alte Player)
    if (!isset($player['currentCategory'])) {
        $player['currentCategory'] = 0;
    }
    if (!isset($player['categoryHistory'])) {
        $player['categoryHistory'] = [];
    }

    if ($catId !== null && $catId > $player['currentCategory']) {
        // Prüfe ob ALLE Level dieser Kategorie bestanden sind
        $allLevelsInCategoryPassed = true;

        foreach ($questionsData as $lvlKey => $lvlData) {
            if (isset($lvlData['catId']) && $lvlData['catId'] == $catId) {
                $lvlNum = (int)str_replace('level', '', $lvlKey);
                $levelUnlocked = isset($player['levels'][$lvlNum]['unlocked'])
                    ? $player['levels'][$lvlNum]['unlocked']
                    : false;

                if (!$levelUnlocked) {
                    $allLevelsInCategoryPassed = false;
                    break;
                }
            }
        }

        // Kategorie freischalten!
        if ($allLevelsInCategoryPassed) {
            $player['currentCategory'] = $catId;
            $player['categoryHistory'][] = [
                'category' => $catId,
                'completed' => date('c'),
                'levelNumber' => $levelNumber
            ];

            error_log("Player {$genericAddress} unlocked category {$catId}");
        }
    }
}

// Speichern
if (!saveJSON('players.json', $playersData)) {
    errorResponse('Could not save player data', 500);
}

jsonResponse([
    'success' => true,
    'message' => $isFirstAttempt ? 'Score saved' : 'Practice attempt recorded',
    'isFirstAttempt' => $isFirstAttempt,
    'player' => $player
]);