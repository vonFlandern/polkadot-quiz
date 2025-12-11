<?php
/**
 * API Endpoint: Convert Address
 * Konvertiert eine Wallet-Adresse ins Polkadot-Format
 * Ohne zu speichern - nur für Anzeige
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

if (!isset($input['address'])) {
    errorResponse('Address required');
}

$address = sanitizeInput($input['address']);

// Validiere Adresse
if (!isValidPolkadotAddress($address)) {
    errorResponse('Invalid address format');
}

// Konvertiere
try {
    $polkadotAddress = call_user_func([$converterClass, 'toPolkadot'], $address);
    $prefix = call_user_func([$converterClass, 'getPrefix'], $address);
    
    // Bestimme Format-Namen
    $formatName = 'Unknown';
    if ($prefix === 0) {
        $formatName = 'Polkadot';
    } elseif ($prefix === 42) {
        $formatName = 'Generic Substrate';
    } elseif ($prefix === 2) {
        $formatName = 'Kusama';
    }
    
    jsonResponse([
        'success' => true,
        'original' => [
            'address' => $address,
            'format' => $formatName,
            'prefix' => $prefix
        ],
        'polkadot' => [
            'address' => $polkadotAddress,
            'format' => 'Polkadot',
            'prefix' => 0
        ],
        'converted' => $address !== $polkadotAddress,
        'converter' => $converterClass
    ]);
    
} catch (Exception $e) {
    error_log("Address conversion error: " . $e->getMessage());
    errorResponse('Conversion failed: ' . $e->getMessage(), 500);
}