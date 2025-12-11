<?php
/**
 * Production Server Check
 * 
 * Upload diese Datei auf deinen Live-Server und öffne sie im Browser:
 * https://vonflandern.org/quiz/check-server.php
 * 
 * Zeigt ob der Server bereit für das Quiz ist
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
echo "<title>Production Server Check</title>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { color: #E6007A; }
    .check { padding: 10px; margin: 10px 0; border-left: 4px solid #ccc; }
    .success { border-color: #22c55e; background: #f0fdf4; }
    .warning { border-color: #f59e0b; background: #fffbeb; }
    .error { border-color: #ef4444; background: #fef2f2; }
    .icon { font-weight: bold; margin-right: 10px; }
    pre { background: #f4f4f4; padding: 10px; overflow: auto; }
    .summary { background: #f0f9ff; padding: 20px; margin-top: 20px; border-radius: 8px; }
</style></head><body>";

echo "<h1>🔍 Production Server Check</h1>";
echo "<p><strong>Server:</strong> " . $_SERVER['SERVER_NAME'] . "</p>";
echo "<p><strong>Zeit:</strong> " . date('Y-m-d H:i:s') . "</p>";
echo "<hr>";

$allGood = true;
$warnings = [];
$errors = [];

// Check 1: PHP Version
echo "<h2>1. PHP Version</h2>";
$phpVersion = phpversion();
if (version_compare($phpVersion, '7.2', '>=')) {
    echo "<div class='check success'><span class='icon'>✅</span>";
    echo "<strong>PHP Version:</strong> {$phpVersion} (OK)</div>";
} else {
    echo "<div class='check error'><span class='icon'>❌</span>";
    echo "<strong>PHP Version:</strong> {$phpVersion} (TOO OLD - need 7.2+)</div>";
    $errors[] = "PHP Version zu alt";
    $allGood = false;
}

// Check 2: Required Extensions
echo "<h2>2. PHP Extensions</h2>";

$requiredExtensions = [
    'json' => 'JSON encoding/decoding',
    'mbstring' => 'Multibyte string support',
];

$recommendedExtensions = [
    'gmp' => 'Big number math (für Production Converter)',
    'sodium' => 'Blake2b hashing (für Production Converter)',
    'bcmath' => 'Math functions (für Fallback Converter)'
];

foreach ($requiredExtensions as $ext => $desc) {
    if (extension_loaded($ext)) {
        echo "<div class='check success'><span class='icon'>✅</span>";
        echo "<strong>{$ext}:</strong> {$desc}</div>";
    } else {
        echo "<div class='check error'><span class='icon'>❌</span>";
        echo "<strong>{$ext}:</strong> {$desc} - FEHLT!</div>";
        $errors[] = "Extension {$ext} fehlt";
        $allGood = false;
    }
}

$converterType = 'Keine';
foreach ($recommendedExtensions as $ext => $desc) {
    if (extension_loaded($ext)) {
        echo "<div class='check success'><span class='icon'>✅</span>";
        echo "<strong>{$ext}:</strong> {$desc}</div>";
        
        if ($ext === 'gmp' || $ext === 'sodium') {
            $converterType = 'Production';
        } elseif ($ext === 'bcmath' && $converterType !== 'Production') {
            $converterType = 'Fallback';
        }
    } else {
        echo "<div class='check warning'><span class='icon'>⚠️</span>";
        echo "<strong>{$ext}:</strong> {$desc} - Nicht verfügbar</div>";
        $warnings[] = "Extension {$ext} nicht verfügbar";
    }
}

// Check 3: File Permissions
echo "<h2>3. Schreibrechte</h2>";

$testFile = __DIR__ . '/data/test-write.tmp';
$testDir = __DIR__ . '/data';

if (is_dir($testDir)) {
    if (is_writable($testDir)) {
        // Versuche zu schreiben
        $written = @file_put_contents($testFile, 'test');
        if ($written !== false) {
            echo "<div class='check success'><span class='icon'>✅</span>";
            echo "<strong>data/ Verzeichnis:</strong> Schreibbar</div>";
            @unlink($testFile);
        } else {
            echo "<div class='check error'><span class='icon'>❌</span>";
            echo "<strong>data/ Verzeichnis:</strong> Nicht schreibbar!</div>";
            $errors[] = "data/ nicht schreibbar";
            $allGood = false;
        }
    } else {
        echo "<div class='check error'><span class='icon'>❌</span>";
        echo "<strong>data/ Verzeichnis:</strong> Nicht schreibbar!</div>";
        $errors[] = "data/ nicht schreibbar";
        $allGood = false;
    }
} else {
    echo "<div class='check warning'><span class='icon'>⚠️</span>";
    echo "<strong>data/ Verzeichnis:</strong> Nicht gefunden (erstellen!)</div>";
    $warnings[] = "data/ Verzeichnis fehlt";
}

// Check 4: Memory Limit
echo "<h2>4. PHP Einstellungen</h2>";

$memoryLimit = ini_get('memory_limit');
echo "<div class='check success'><span class='icon'>ℹ️</span>";
echo "<strong>Memory Limit:</strong> {$memoryLimit}</div>";

$maxExecutionTime = ini_get('max_execution_time');
echo "<div class='check success'><span class='icon'>ℹ️</span>";
echo "<strong>Max Execution Time:</strong> {$maxExecutionTime}s</div>";

$uploadMaxFilesize = ini_get('upload_max_filesize');
echo "<div class='check success'><span class='icon'>ℹ️</span>";
echo "<strong>Upload Max Filesize:</strong> {$uploadMaxFilesize}</div>";

// Check 5: Test SS58 Conversion
echo "<h2>5. SS58 Konvertierung Test</h2>";

if ($converterType === 'Production' || $converterType === 'Fallback') {
    echo "<div class='check success'><span class='icon'>✅</span>";
    echo "<strong>Verfügbarer Converter:</strong> {$converterType}</div>";
    
    $testAddr = '5F25EmKKwnaRUHGdkTG7RmPLtSG2g3uXSexGaC9d8FdT53zz';
    $expectedPolkadot = '13xNP6aPoZqtupH9i6K7ZvDVk4FgNMTfX9gkjV8ygLeyFWAu';
    
    // Versuche zu konvertieren
    if (file_exists(__DIR__ . '/SS58AddressConverterFallback.php')) {
        require_once __DIR__ . '/SS58AddressConverterFallback.php';
        try {
            $result = SS58AddressConverterFallback::toPolkadot($testAddr);
            
            echo "<div class='check success'><span class='icon'>✅</span>";
            echo "<strong>Konvertierung funktioniert!</strong><br>";
            echo "<small>Test: {$testAddr}<br>→ {$result}</small></div>";
        } catch (Exception $e) {
            echo "<div class='check error'><span class='icon'>❌</span>";
            echo "<strong>Konvertierung fehlgeschlagen:</strong> {$e->getMessage()}</div>";
            $errors[] = "Konvertierung funktioniert nicht";
            $allGood = false;
        }
    } else {
        echo "<div class='check warning'><span class='icon'>⚠️</span>";
        echo "<strong>SS58AddressConverterFallback.php nicht gefunden</strong> (noch nicht hochgeladen?)</div>";
        $warnings[] = "Converter-Datei fehlt";
    }
} else {
    echo "<div class='check error'><span class='icon'>❌</span>";
    echo "<strong>Kein Converter verfügbar!</strong> Weder gmp/sodium noch bcmath vorhanden.</div>";
    $errors[] = "Keine Extensions für Konvertierung";
    $allGood = false;
}

// Summary
echo "<div class='summary'>";
echo "<h2>📊 Zusammenfassung</h2>";

if ($allGood && count($warnings) === 0) {
    echo "<div class='check success'>";
    echo "<h3>✅ Server ist bereit für Production!</h3>";
    echo "<p>Alle Checks erfolgreich. Du kannst das Quiz deployen.</p>";
    echo "</div>";
} elseif ($allGood) {
    echo "<div class='check warning'>";
    echo "<h3>⚠️ Server funktioniert, aber mit Einschränkungen</h3>";
    echo "<p><strong>Warnungen:</strong></p><ul>";
    foreach ($warnings as $warning) {
        echo "<li>{$warning}</li>";
    }
    echo "</ul>";
    echo "<p><strong>Empfehlung:</strong> Nutze den Fallback-Converter. Funktioniert gut genug!</p>";
    echo "</div>";
} else {
    echo "<div class='check error'>";
    echo "<h3>❌ Server hat kritische Probleme</h3>";
    echo "<p><strong>Fehler:</strong></p><ul>";
    foreach ($errors as $error) {
        echo "<li>{$error}</li>";
    }
    echo "</ul>";
    echo "<p><strong>Diese Probleme müssen behoben werden vor dem Deploy!</strong></p>";
    echo "</div>";
}

echo "<h3>🎯 Empfohlener Converter</h3>";
if (extension_loaded('gmp') && extension_loaded('sodium')) {
    echo "<p class='success'>✅ <strong>Production Converter</strong> (beste Qualität)</p>";
} elseif (extension_loaded('bcmath')) {
    echo "<p class='warning'>⚠️ <strong>Fallback Converter</strong> (funktioniert gut)</p>";
} else {
    echo "<p class='error'>❌ <strong>Kein Converter möglich</strong></p>";
}

echo "</div>";

// System Info
echo "<hr><h2>📋 System Info</h2>";
echo "<pre>";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
echo "PHP Version: " . phpversion() . "\n";
echo "PHP SAPI: " . php_sapi_name() . "\n";
echo "OS: " . PHP_OS . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Script Filename: " . __FILE__ . "\n";
echo "</pre>";

echo "</body></html>";