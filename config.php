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