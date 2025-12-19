<?php
/**
 * Polkadot Quiz - Basis-Konfiguration
 * Version: 1.0
 */

// Standalone oder Integriert?
if (!defined('STANDALONE')) {
    define('STANDALONE', true);
}

// Basis-Pfade
define('QUIZ_ROOT', __DIR__);
define('QUIZ_DATA', QUIZ_ROOT . '/data');
define('QUIZ_API', QUIZ_ROOT . '/api');
define('QUIZ_DOWNLOADS', QUIZ_ROOT . '/downloads');

// Timezone
date_default_timezone_set('Europe/Berlin');

// Error Reporting (für Entwicklung)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS Headers für API-Requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

/**
 * Lade JSON-Datei
 */
function loadJSON($filename) {
    $path = QUIZ_DATA . '/' . $filename;
    if (!file_exists($path)) {
        return null;
    }
    $content = file_get_contents($path);
    return json_decode($content, true);
}

/**
 * Speichere JSON-Datei (mit File Locking)
 */
function saveJSON($filename, $data) {
    $path = QUIZ_DATA . '/' . $filename;
    
    // Exklusives Lock
    $fp = fopen($path, 'c+');
    if (!$fp) {
        return false;
    }
    
    if (flock($fp, LOCK_EX)) {
        // Datei komplett neu schreiben
        ftruncate($fp, 0);
        rewind($fp);
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        fwrite($fp, $json);
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    
    fclose($fp);
    return false;
}

/**
 * Validiere Wallet-Adresse (Polkadot/Substrate Format)
 */
function isValidPolkadotAddress($address) {
    // SS58-Format: 47-48 Zeichen, alphanumerisch
    // Kann mit verschiedenen Präfixen beginnen:
    // 1 = Polkadot, 5 = Generic Substrate, etc.
    return preg_match('/^[1-9A-HJ-NP-Za-km-z]{47,48}$/', $address);
}

/**
 * Sanitize Input
 */
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Generiere Response
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Error Response
 */
function errorResponse($message, $statusCode = 400) {
    jsonResponse(['error' => $message], $statusCode);
}

/**
 * Prüfe ob Spielername erlaubt ist (Profanity-Filter)
 * @param string $playerName Der zu prüfende Name
 * @return array ['allowed' => bool, 'error' => string|null]
 */
function isPlayerNameAllowed($playerName) {
    // 1. Zeichensatz-Validierung: Nur lateinische Zeichen + Umlaute
    if (!preg_match('/^[a-zA-Z0-9äöüÄÖÜß\s\-_\.]+$/u', $playerName)) {
        return ['allowed' => false, 'error' => 'Nur lateinische Zeichen erlaubt'];
    }
    
    // 2. Profanity-Filter laden
    $profanityData = loadJSON('profanity-words.json');
    if (!$profanityData) {
        // Keine Liste = erlaubt (fail-open)
        return ['allowed' => true, 'error' => null];
    }
    
    $nameLower = mb_strtolower($playerName, 'UTF-8');
    $whitelist = $profanityData['whitelist'] ?? [];
    
    // 3. Whitelist-Check (False-Positives erlauben)
    foreach ($whitelist as $allowed) {
        if (stripos($nameLower, mb_strtolower($allowed, 'UTF-8')) !== false) {
            return ['allowed' => true, 'error' => null];
        }
    }
    
    // 4. Prüfe gegen Deutsch & Englisch Listen
    $allWords = array_merge($profanityData['de'] ?? [], $profanityData['en'] ?? []);
    
    foreach ($allWords as $badWord) {
        $badWordLower = mb_strtolower($badWord, 'UTF-8');
        
        // Direkte Übereinstimmung
        if (stripos($nameLower, $badWordLower) !== false) {
            return ['allowed' => false, 'error' => 'Bitte wähle einen anderen Namen'];
        }
        
        // Leetspeak-Erkennung für englische Wörter (einfach)
        $leetspeakMap = [
            'a' => '[a4@]',
            'e' => '[e3]',
            'i' => '[i1!]',
            'o' => '[o0]',
            's' => '[s5$]',
            't' => '[t7+]',
            'l' => '[l1]',
            'g' => '[g9]',
            'b' => '[b8]'
        ];
        
        // Erstelle Leetspeak-Regex-Pattern
        $pattern = '';
        foreach (str_split($badWordLower) as $char) {
            if (isset($leetspeakMap[$char])) {
                $pattern .= $leetspeakMap[$char];
            } else {
                $pattern .= preg_quote($char, '/');
            }
        }
        
        // Prüfe mit Leetspeak-Pattern
        if (preg_match('/' . $pattern . '/i', $nameLower)) {
            return ['allowed' => false, 'error' => 'Bitte wähle einen anderen Namen'];
        }
    }
    
    return ['allowed' => true, 'error' => null];
}

/**
 * Prüfe ob Spielername verfügbar ist
 * @param string $playerName Der zu prüfende Name
 * @param string|null $walletAddress Optional: Wallet-Adresse des Spielers (eigener Name erlaubt)
 * @return array ['available' => bool, 'error' => string|null]
 */
function checkPlayerNameAvailability($playerName, $walletAddress = null) {
    // 1. Profanity-Filter (Zeichensatz + verbotene Wörter)
    $allowedCheck = isPlayerNameAllowed($playerName);
    if (!$allowedCheck['allowed']) {
        return ['available' => false, 'error' => $allowedCheck['error']];
    }
    
    // 2. Längenvalidierung: 3-20 Zeichen
    if (strlen($playerName) < 3) {
        return ['available' => false, 'error' => 'Name muss mindestens 3 Zeichen haben'];
    }
    
    if (strlen($playerName) > 20) {
        return ['available' => false, 'error' => 'Name darf maximal 20 Zeichen haben'];
    }
    
    // Players laden
    $playersData = loadJSON('players.json');
    if (!$playersData || !isset($playersData['players'])) {
        // Keine Spieler = Name verfügbar
        return ['available' => true, 'error' => null];
    }
    
    // Prüfe ob Name bereits vergeben ist (case-insensitive)
    foreach ($playersData['players'] as $player) {
        // Überspringe Spieler ohne Namen
        if (!isset($player['playerName']) || $player['playerName'] === null) {
            continue;
        }
        
        if (strcasecmp($player['playerName'], $playerName) === 0) {
            // Falls walletAddress gegeben: Ist es der eigene Name?
            if ($walletAddress) {
                $playerGeneric = isset($player['genericAddress']) ? $player['genericAddress'] : $player['walletAddress'];
                
                if ($playerGeneric === $walletAddress) {
                    // Eigener Name = OK
                    continue;
                }
            }
            
            // Name bereits vergeben
            return ['available' => false, 'error' => 'Name bereits vergeben'];
        }
    }
    
    return ['available' => true, 'error' => null];
}