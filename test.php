<?php
/**
 * PHP Test Script
 * Öffne diese Datei im Browser um zu prüfen ob PHP läuft
 */

echo "<h1>PHP Test</h1>";
echo "<p><strong>✅ PHP läuft!</strong></p>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Server: " . $_SERVER['SERVER_SOFTWARE'] . "</p>";
echo "<hr>";

// Teste JSON-Dateien
echo "<h2>JSON-Dateien Test</h2>";

$configPath = __DIR__ . '/data/config.json';
$questionsPath = __DIR__ . '/data/questions.json';
$playersPath = __DIR__ . '/data/players.json';

function testFile($path, $name) {
    if (file_exists($path)) {
        echo "<p>✅ <strong>$name</strong> existiert</p>";
        
        if (is_readable($path)) {
            echo "<p style='margin-left: 20px;'>✅ Lesbar</p>";
            
            $content = file_get_contents($path);
            $json = json_decode($content, true);
            
            if ($json !== null) {
                echo "<p style='margin-left: 20px;'>✅ Gültiges JSON</p>";
                echo "<pre style='margin-left: 20px; background: #f0f0f0; padding: 10px;'>";
                echo htmlspecialchars(json_encode($json, JSON_PRETTY_PRINT));
                echo "</pre>";
            } else {
                echo "<p style='margin-left: 20px; color: red;'>❌ Ungültiges JSON</p>";
            }
        } else {
            echo "<p style='margin-left: 20px; color: red;'>❌ Nicht lesbar</p>";
        }
        
        if (is_writable($path)) {
            echo "<p style='margin-left: 20px;'>✅ Schreibbar</p>";
        } else {
            echo "<p style='margin-left: 20px; color: red;'>❌ Nicht schreibbar (chmod 666 benötigt!)</p>";
        }
    } else {
        echo "<p style='color: red;'>❌ <strong>$name</strong> existiert nicht!</p>";
    }
    echo "<hr>";
}

testFile($configPath, 'config.json');
testFile($questionsPath, 'questions.json');
testFile($playersPath, 'players.json');

// Teste API-Dateien
echo "<h2>API-Dateien Test</h2>";

$apiFiles = [
    'api/get-player.php',
    'api/save-score.php',
    'api/get-leaderboard.php'
];

foreach ($apiFiles as $file) {
    $path = __DIR__ . '/' . $file;
    if (file_exists($path)) {
        echo "<p>✅ <strong>$file</strong> existiert</p>";
    } else {
        echo "<p style='color: red;'>❌ <strong>$file</strong> fehlt!</p>";
    }
}

echo "<hr>";
echo "<h2>Nächste Schritte</h2>";
echo "<p>Wenn alle Tests ✅ sind, funktioniert das Backend!</p>";
echo "<p>Falls 'players.json nicht schreibbar' ist, führe aus: <code>chmod 666 data/players.json</code></p>";