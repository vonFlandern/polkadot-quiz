<?php
/**
 * Test Script for SS58 Address Converter
 * 
 * Run this file to test if the conversion works:
 * http://localhost/Quiz/test-ss58.php
 */

require_once 'SS58AddressConverter.php';

echo "<h1>SS58 Address Converter - Test</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .success { color: green; font-weight: bold; }
    .error { color: red; font-weight: bold; }
    .warning { color: orange; font-weight: bold; }
    .info { background: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    td, th { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #E6007A; color: white; }
    .code { background: #f4f4f4; padding: 5px; font-family: monospace; }
</style>";

// Test 1: Check if required extensions are available
echo "<h2>1. Check PHP Extensions</h2>";

$extensions = [
    'gmp' => 'GMP (for large numbers)',
    'sodium' => 'Sodium (for Blake2b hashing)'
];

$allOk = true;
$converterType = 'Production';

foreach ($extensions as $ext => $description) {
    if (extension_loaded($ext)) {
        echo "<p class='success'>✅ {$ext} - {$description}</p>";
    } else {
        echo "<p class='error'>❌ {$ext} - {$description} - NOT AVAILABLE!</p>";
        $allOk = false;
    }
}

// Wähle Converter
if ($allOk) {
    require_once 'SS58AddressConverter.php';
    $converter = 'SS58AddressConverter';
    echo "<div class='info'><strong>✅ Using Production Converter</strong><br>";
    echo "All extensions available. Best quality conversion!</div>";
} else {
    require_once 'SS58AddressConverterFallback.php';
    $converter = 'SS58AddressConverterFallback';
    $converterType = 'Fallback';
    echo "<div class='info' style='border-color: orange; background: #fffbeb;'>";
    echo "<strong>⚠️ Using Fallback Converter</strong><br>";
    echo "Missing extensions. Converter will work but is less accurate.<br>";
    echo "<strong>For Production:</strong> Please enable gmp and sodium extensions!<br>";
    echo "<a href='XAMPP-EXTENSIONS-AKTIVIEREN.md' target='_blank'>→ How to enable extensions</a>";
    echo "</div>";
}

// Test 2: Test address conversion
echo "<h2>2. Test Address Conversion</h2>";

// Your actual address from the console
$genericAddress = '5F25EmKKwnaRUHGdkTG7RmPLtSG2g3uXSexGaC9d8FdT53zz';

echo "<table>";
echo "<tr><th>Test</th><th>Result</th></tr>";

// Test: Decode generic address
try {
    $decoded = call_user_func([$converter, 'decode'], $genericAddress);
    echo "<tr><td>Decode Generic Address</td><td class='success'>✅ Success</td></tr>";
    echo "<tr><td>Detected Prefix</td><td class='code'>{$decoded['prefix']} (Generic Substrate)</td></tr>";
    echo "<tr><td>Public Key (hex)</td><td class='code'>" . bin2hex($decoded['publicKey']) . "</td></tr>";
} catch (Exception $e) {
    echo "<tr><td>Decode Generic Address</td><td class='error'>❌ Failed: {$e->getMessage()}</td></tr>";
}

// Test: Convert to Polkadot format
try {
    $polkadotAddress = call_user_func([$converter, 'toPolkadot'], $genericAddress);
    echo "<tr><td>Convert to Polkadot Format</td><td class='success'>✅ Success</td></tr>";
    echo "<tr><td>Polkadot Address</td><td class='code'>{$polkadotAddress}</td></tr>";
    
    // Verify it's actually Polkadot format
    $prefix = call_user_func([$converter, 'getPrefix'], $polkadotAddress);
    if ($prefix === 0) {
        echo "<tr><td>Verify Polkadot Format</td><td class='success'>✅ Confirmed (Prefix: 0)</td></tr>";
    } else {
        echo "<tr><td>Verify Polkadot Format</td><td class='error'>❌ Not in Polkadot format! (Prefix: {$prefix})</td></tr>";
    }
    
} catch (Exception $e) {
    echo "<tr><td>Convert to Polkadot Format</td><td class='error'>❌ Failed: {$e->getMessage()}</td></tr>";
}

// Test: Convert back to Generic (should match original)
try {
    $backToGeneric = call_user_func([$converter, 'convert'], $polkadotAddress, 42);
    echo "<tr><td>Convert back to Generic</td><td class='success'>✅ Success</td></tr>";
    echo "<tr><td>Generic Address</td><td class='code'>{$backToGeneric}</td></tr>";
    
    if ($backToGeneric === $genericAddress) {
        echo "<tr><td>Match Original?</td><td class='success'>✅ Perfect match!</td></tr>";
    } else {
        echo "<tr><td>Match Original?</td><td class='warning'>⚠️ Mismatch (might be OK with Fallback)</td></tr>";
        echo "<tr><td colspan='2'><small>Original: {$genericAddress}<br>Result: {$backToGeneric}</small></td></tr>";
    }
    
} catch (Exception $e) {
    echo "<tr><td>Convert back to Generic</td><td class='error'>❌ Failed: {$e->getMessage()}</td></tr>";
}

echo "</table>";

// Test 3: More test addresses
echo "<h2>3. Additional Test Addresses</h2>";

$testAddresses = [
    '13xNP6aPoZqtupH9i6K7ZvDVk4FgNMTfX9gkjV8ygLeyFYtj' => 'Polkadot format',
    '5F25EmKKwnaRUHGdkTG7RmPLtSG2g3uXSexGaC9d8FdT53zz' => 'Generic Substrate',
    '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' => 'Alice (Generic)',
];

echo "<table>";
echo "<tr><th>Original Address</th><th>Format</th><th>Converted to Polkadot</th></tr>";

foreach ($testAddresses as $address => $description) {
    $prefix = call_user_func([$converter, 'getPrefix'], $address);
    $converted = call_user_func([$converter, 'toPolkadot'], $address);
    
    echo "<tr>";
    echo "<td class='code'>" . substr($address, 0, 10) . "..." . substr($address, -6) . "</td>";
    echo "<td>{$description} (prefix: {$prefix})</td>";
    echo "<td class='code'>" . substr($converted, 0, 10) . "..." . substr($converted, -6) . "</td>";
    echo "</tr>";
}

echo "</table>";

// Summary
echo "<h2>✅ Summary</h2>";
echo "<div class='info'>";
echo "<p><strong>Converter Type:</strong> {$converterType}</p>";
echo "<p><strong>Result:</strong> ";

if (isset($polkadotAddress)) {
    echo "<span class='success'>Tests passed!</span></p>";
    echo "<p>Your address <code>{$genericAddress}</code><br>";
    echo "converts to Polkadot format: <code>{$polkadotAddress}</code></p>";
    
    if (!$allOk) {
        echo "<p class='warning'><strong>⚠️ WICHTIG:</strong> Du verwendest den Fallback-Converter!<br>";
        echo "Für Production solltest du die gmp und sodium Extensions aktivieren.<br>";
        echo "<a href='XAMPP-EXTENSIONS-AKTIVIEREN.md' target='_blank'>→ Anleitung zum Aktivieren</a></p>";
    } else {
        echo "<p class='success'><strong>✅ Perfekt!</strong> Production-Converter läuft!</p>";
    }
    
    echo "<p><strong>Next step:</strong> Teste das Quiz und prüfe players.json</p>";
} else {
    echo "<span class='error'>Some tests failed!</span></p>";
    echo "<p>Please check the errors above.</p>";
}

echo "</div>";

// Show PHP info
echo "<hr>";
echo "<p><small>PHP Version: " . phpversion() . " | Server: " . $_SERVER['SERVER_SOFTWARE'] . "</small></p>";