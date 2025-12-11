<?php
/**
 * API Endpoint: Get Leaderboard
 * Liefert die Top-Spieler sortiert nach Punkten
 */

require_once '../config.php';

// Nur GET erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

// Parameter
$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
$limit = max(1, min(100, $limit)); // Zwischen 1 und 100

// Players laden
$playersData = loadJSON('players.json');
if (!$playersData || empty($playersData['players'])) {
    jsonResponse([
        'leaderboard' => [],
        'total' => 0
    ]);
}

$players = $playersData['players'];

// Berechne Score und Zeit für jeden Spieler aus firstAttempts
foreach ($players as &$player) {
    $calculatedScore = 0;
    $calculatedTime = 0;
    $totalHints = 0;
    $totalTimeAdds = 0;
    $totalCorrectAnswers = 0;
    $totalQuestions = 0;
    
    if (isset($player['levels'])) {
        foreach ($player['levels'] as $levelNum => $levelData) {
            // Nutze IMMER firstAttempt für Leaderboard
            if (isset($levelData['firstAttempt'])) {
                $attempt = $levelData['firstAttempt'];
                
                // ALLE firstAttempts zählen für Score und Zeit (auch failed!)
                $calculatedScore += $attempt['score'];
                $calculatedTime += $attempt['time'];
                
                // Statistiken sammeln
                $totalHints += isset($attempt['hintsUsed']) ? $attempt['hintsUsed'] : 0;
                $totalTimeAdds += isset($attempt['timeAddsUsed']) ? $attempt['timeAddsUsed'] : 0;
                $totalCorrectAnswers += isset($attempt['correctAnswers']) ? $attempt['correctAnswers'] : 0;
                $totalQuestions += isset($attempt['totalQuestions']) ? $attempt['totalQuestions'] : 0;
            }
        }
    }
    
    // Überschreibe mit berechneten Werten für Leaderboard
    $player['leaderboardScore'] = $calculatedScore;
    $player['leaderboardTime'] = $calculatedTime;
    // WICHTIG: Verwende completedLevels aus players.json (zählt alle bestandenen Level, auch Wiederholungen)
    $player['displayedCompletedLevels'] = isset($player['completedLevels']) ? $player['completedLevels'] : 0;
    $player['totalHintsUsed'] = $totalHints;
    $player['totalTimeAddsUsed'] = $totalTimeAdds;
    $player['totalCorrectAnswers'] = $totalCorrectAnswers;
    $player['totalQuestions'] = $totalQuestions;
}
unset($player); // Referenz aufheben

// Sortieren nach leaderboardScore (absteigend), dann nach leaderboardTime (aufsteigend)
usort($players, function($a, $b) {
    if ($a['leaderboardScore'] === $b['leaderboardScore']) {
        return $a['leaderboardTime'] - $b['leaderboardTime'];
    }
    return $b['leaderboardScore'] - $a['leaderboardScore'];
});

// Nur relevante Daten für Leaderboard
$leaderboard = [];
foreach (array_slice($players, 0, $limit) as $index => $player) {
    $leaderboard[] = [
        'rank' => $index + 1,
        'playerName' => $player['playerName'],
        'walletAddress' => $player['walletAddress'],
        'polkadotAddress' => isset($player['polkadotAddress']) ? $player['polkadotAddress'] : $player['walletAddress'],
        'totalScore' => $player['leaderboardScore'],  // Berechneter Score (ALLE firstAttempts)
        'totalTime' => $player['leaderboardTime'],    // Berechnete Zeit (ALLE firstAttempts)
        'completedLevels' => $player['displayedCompletedLevels'], // Aus players.json (alle bestandenen Level)
        'hintsUsed' => $player['totalHintsUsed'],     // Gesamtanzahl genutzter Hints
        'timeAddsUsed' => $player['totalTimeAddsUsed'], // Gesamtanzahl genutzter Time-Adds
        'correctAnswers' => $player['totalCorrectAnswers'], // Richtige Antworten
        'totalQuestions' => $player['totalQuestions'], // Gesamtanzahl Fragen
        'registeredAt' => $player['registeredAt']
    ];
}

jsonResponse([
    'leaderboard' => $leaderboard,
    'total' => count($players)
]);