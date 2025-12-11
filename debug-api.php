<?php
/**
 * Debug Script - Find PHP Errors
 * Öffne: http://localhost/Quiz/debug-api.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>API Debug</h1>";
echo "<style>
    body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    .success { color: #4ec9b0; }
    .error { color: #f48771; }
    .warning { color: #dcdcaa; }
    pre { background: #2d2d2d; padding: 15px; border-radius: 5px; overflow: auto; }
</style>";

echo "<h2>1. Check Files</h2>";

$files = [
    'config.php',
    'SS58AddressConverter.php',
    'SS58AddressConverterFallback.php',
    'api/save-score.php',
    'api/get-player.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "<span class='success'>✅ {$file}</span><br>";
    } else {
        echo "<span class='error'>❌ {$file} - MISSING!</span><br>";
    }
}

echo "<h2>2. Test Requires</h2>";

try {
    require_once 'config.php';
    echo "<span class='success'>✅ config.php loaded</span><br>";
} catch (Exception $e) {
    echo "<span class='error'>❌ config.php error: {$e->getMessage()}</span><br>";
}

try {
    if (file_exists('SS58AddressConverterFallback.php')) {
        require_once 'SS58AddressConverterFallback.php';
        echo "<span class='success'>✅ SS58AddressConverterFallback.php loaded</span><br>";
        
        // Test if class exists
        if (class_exists('SS58AddressConverterFallback')) {
            echo "<span class='success'>✅ Class SS58AddressConverterFallback exists</span><br>";
            
            // Test conversion
            try {
                $testAddr = '5F25EmKKwnaRUHGdkTG7RmPLtSG2g3uXSexGaC9d8FdT53zz';
                $result = SS58AddressConverterFallback::toPolkadot($testAddr);
                echo "<span class='success'>✅ Conversion works: {$testAddr} → {$result}</span><br>";
            } catch (Exception $e) {
                echo "<span class='error'>❌ Conversion failed: {$e->getMessage()}</span><br>";
            }
        } else {
            echo "<span class='error'>❌ Class SS58AddressConverterFallback NOT found!</span><br>";
        }
    } else {
        echo "<span class='error'>❌ SS58AddressConverterFallback.php not found!</span><br>";
    }
} catch (Exception $e) {
    echo "<span class='error'>❌ SS58AddressConverterFallback.php error: {$e->getMessage()}</span><br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}

echo "<h2>3. Test API Endpoint</h2>";

echo "<p>Testing save-score.php manually...</p>";

$_SERVER['REQUEST_METHOD'] = 'POST';

// Simulate POST data
$testData = [
    'walletAddress' => '5F25EmKKwnaRUHGdkTG7RmPLtSG2g3uXSexGaC9d8FdT53zz',
    'playerName' => 'DebugTest',
    'levelNumber' => 1,
    'levelData' => [
        'score' => 100,
        'time' => 10,
        'correctAnswers' => 3,
        'totalQuestions' => 3,
        'passed' => true,
        'hintsUsed' => 0,
        'timeAddsUsed' => 0
    ]
];

// Fake the input
file_put_contents('php://input', json_encode($testData));

ob_start();
try {
    // This will output the response
    include 'api/save-score.php';
    $output = ob_get_clean();
    
    echo "<span class='success'>✅ API executed</span><br>";
    echo "<strong>Output:</strong>";
    echo "<pre>" . htmlspecialchars($output) . "</pre>";
    
    // Try to decode as JSON
    $json = json_decode($output, true);
    if ($json) {
        echo "<span class='success'>✅ Valid JSON response</span><br>";
    } else {
        echo "<span class='error'>❌ Not valid JSON - this is the problem!</span><br>";
    }
    
} catch (Exception $e) {
    ob_end_clean();
    echo "<span class='error'>❌ API error: {$e->getMessage()}</span><br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}

echo "<h2>4. PHP Info</h2>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Extensions: " . implode(', ', get_loaded_extensions()) . "<br>";

echo "<h2>5. Recommendation</h2>";
echo "<p class='warning'>Based on the results above:</p>";
echo "<ul>";
echo "<li>If files are missing → Upload them</li>";
echo "<li>If class not found → Check PHP syntax</li>";
echo "<li>If conversion fails → Check bcmath extension</li>";
echo "<li>If API returns HTML → There's a PHP error</li>";
echo "</ul>";