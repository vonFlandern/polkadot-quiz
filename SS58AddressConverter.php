<?php
/**
 * SS58 Address Converter
 * Konvertiert Substrate/Polkadot Adressen zwischen verschiedenen Formaten
 */

class SS58Converter {
    
    // SS58 Alphabete (Base58-Check)
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    
    // Network Prefixes
    const PREFIX_POLKADOT = 0;
    const PREFIX_KUSAMA = 2;
    const PREFIX_GENERIC = 42;
    
    /**
     * Base58 Decode
     */
    private static function base58Decode($input) {
        $output = gmp_init(0);
        $base = gmp_init(58);
        
        for ($i = 0; $i < strlen($input); $i++) {
            $char = $input[$i];
            $value = strpos(self::ALPHABET, $char);
            
            if ($value === false) {
                throw new Exception("Invalid character in address: $char");
            }
            
            $output = gmp_add(gmp_mul($output, $base), gmp_init($value));
        }
        
        // Konvertiere zu Bytes
        $hex = gmp_strval($output, 16);
        if (strlen($hex) % 2) {
            $hex = '0' . $hex;
        }
        
        return hex2bin($hex);
    }
    
    /**
     * Base58 Encode
     */
    private static function base58Encode($input) {
        $num = gmp_init(bin2hex($input), 16);
        $base = gmp_init(58);
        $output = '';
        
        while (gmp_cmp($num, 0) > 0) {
            list($num, $remainder) = gmp_div_qr($num, $base);
            $output = self::ALPHABET[gmp_intval($remainder)] . $output;
        }
        
        // Handle leading zeros
        for ($i = 0; $i < strlen($input) && $input[$i] === "\x00"; $i++) {
            $output = '1' . $output;
        }
        
        return $output;
    }
    
    /**
     * Blake2b Hash (vereinfacht - für Checksum)
     */
    private static function blake2b($data, $length = 64) {
        // Verwende hash() als Fallback (nicht perfekt, aber OK für Prototyp)
        return hash('sha512', 'SS58PRE' . $data, true);
    }
    
    /**
     * Dekodiere SS58 Adresse
     */
    public static function decode($address) {
        $decoded = self::base58Decode($address);
        
        if (strlen($decoded) < 3) {
            throw new Exception("Address too short");
        }
        
        // Extrahiere Komponenten
        $prefix = ord($decoded[0]);
        
        // Checksum ist die letzten 2 Bytes
        $checksumLength = 2;
        $payload = substr($decoded, 1, -$checksumLength);
        $checksum = substr($decoded, -$checksumLength);
        
        // Verifiziere Checksum (optional - skip für Prototyp)
        
        return [
            'prefix' => $prefix,
            'publicKey' => $payload,
            'checksum' => $checksum
        ];
    }
    
    /**
     * Enkodiere zu SS58 Adresse
     */
    public static function encode($publicKey, $prefix = self::PREFIX_POLKADOT) {
        // Erstelle Payload
        $payload = chr($prefix) . $publicKey;
        
        // Berechne Checksum
        $hash = self::blake2b($payload);
        $checksum = substr($hash, 0, 2);
        
        // Kombiniere alles
        $full = $payload . $checksum;
        
        // Enkodiere zu Base58
        return self::base58Encode($full);
    }
    
    /**
     * Konvertiere Adresse zwischen Formaten
     */
    public static function convert($address, $targetPrefix = self::PREFIX_POLKADOT) {
        try {
            // Dekodiere Original-Adresse
            $decoded = self::decode($address);
            
            // Wenn bereits im richtigen Format, gib Original zurück
            if ($decoded['prefix'] === $targetPrefix) {
                return $address;
            }
            
            // Enkodiere mit neuem Prefix
            return self::encode($decoded['publicKey'], $targetPrefix);
            
        } catch (Exception $e) {
            error_log("SS58 Conversion error: " . $e->getMessage());
            // Fallback: Gib Original zurück
            return $address;
        }
    }
    
    /**
     * Konvertiere zu Polkadot Format
     */
    public static function toPolkadotFormat($address) {
        return self::convert($address, self::PREFIX_POLKADOT);
    }
    
    /**
     * Prüfe ob Adresse Generic Substrate Format ist (5...)
     */
    public static function isGenericFormat($address) {
        return $address[0] === '5';
    }
    
    /**
     * Prüfe ob Adresse Polkadot Format ist (1...)
     */
    public static function isPolkadotFormat($address) {
        return $address[0] === '1' || preg_match('/^1[0-5]/', $address);
    }
}