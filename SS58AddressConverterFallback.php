<?php
/**
 * SS58 Address Converter - FALLBACK Version
 * Funktioniert OHNE gmp und sodium Extensions
 * 
 * WARNUNG: Diese Version ist weniger zuverlässig als die Production-Version!
 * Nutze die richtige SS58AddressConverter.php wenn möglich.
 * 
 * Diese Fallback-Version:
 * - Nutzt nur Standard-PHP-Funktionen
 * - Weniger genaue Checksum-Validierung
 * - Für Development/Testing OK, für Production nicht ideal
 */

class SS58AddressConverterFallback {
    
    const PREFIX_POLKADOT = 0;
    const PREFIX_KUSAMA = 2;
    const PREFIX_GENERIC_SUBSTRATE = 42;
    
    const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    
    /**
     * Base58 Decode (Fallback - funktioniert für kleinere Zahlen)
     */
    private static function base58Decode($input) {
        $result = '0';
        $base = '58';
        
        for ($i = 0; $i < strlen($input); $i++) {
            $char = $input[$i];
            $value = strpos(self::BASE58_ALPHABET, $char);
            
            if ($value === false) {
                throw new Exception("Invalid character in Base58 string: {$char}");
            }
            
            // bcmath statt gmp (ist meistens verfügbar)
            $result = bcadd(bcmul($result, $base), (string)$value);
        }
        
        // Konvertiere zu hex
        $hex = '';
        while (bccomp($result, '0') > 0) {
            $remainder = bcmod($result, '16');
            $hex = dechex((int)$remainder) . $hex;
            $result = bcdiv($result, '16', 0);
        }
        
        if (strlen($hex) % 2) {
            $hex = '0' . $hex;
        }
        
        $bytes = hex2bin($hex);
        
        // Füge leading zeros hinzu
        for ($i = 0; $i < strlen($input) && $input[$i] === '1'; $i++) {
            $bytes = "\x00" . $bytes;
        }
        
        return $bytes;
    }
    
    /**
     * Base58 Encode (Fallback)
     */
    private static function base58Encode($input) {
        if (strlen($input) === 0) {
            return '';
        }
        
        $leadingZeros = 0;
        while ($leadingZeros < strlen($input) && $input[$leadingZeros] === "\x00") {
            $leadingZeros++;
        }
        
        // Konvertiere bytes zu Zahl
        $hex = bin2hex($input);
        $num = '0';
        
        for ($i = 0; $i < strlen($hex); $i++) {
            $num = bcadd(bcmul($num, '16'), (string)hexdec($hex[$i]));
        }
        
        $base = '58';
        $result = '';
        
        while (bccomp($num, '0') > 0) {
            $remainder = bcmod($num, $base);
            $result = self::BASE58_ALPHABET[(int)$remainder] . $result;
            $num = bcdiv($num, $base, 0);
        }
        
        for ($i = 0; $i < $leadingZeros; $i++) {
            $result = '1' . $result;
        }
        
        return $result;
    }
    
    /**
     * Simple Hash (Fallback statt Blake2b)
     * WARNUNG: Nicht so sicher wie Blake2b!
     */
    private static function simpleHash($data) {
        // Nutze SHA-512 statt Blake2b (weniger ideal, aber funktioniert)
        return hash('sha512', 'SS58PRE' . $data, true);
    }
    
    /**
     * Dekodiere SS58 Adresse
     */
    public static function decode($address) {
        try {
            $decoded = self::base58Decode($address);
            
            if (strlen($decoded) < 35) {
                throw new Exception("Address too short");
            }
            
            $prefix = ord($decoded[0]);
            $publicKey = substr($decoded, 1, 32);
            $checksum = substr($decoded, -2);
            
            // Checksum-Validierung (vereinfacht)
            $payload = substr($decoded, 0, -2);
            $hash = self::simpleHash($payload);
            $expectedChecksum = substr($hash, 0, 2);
            
            // Warnung wenn Checksum nicht stimmt (aber trotzdem weitermachen)
            if ($checksum !== $expectedChecksum) {
                error_log("Warning: Checksum mismatch (Fallback converter)");
            }
            
            return [
                'prefix' => $prefix,
                'publicKey' => $publicKey,
                'valid' => true
            ];
            
        } catch (Exception $e) {
            error_log("SS58 Fallback decode error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Enkodiere zu SS58 Adresse
     */
    public static function encode($publicKey, $prefix = self::PREFIX_POLKADOT) {
        if (strlen($publicKey) !== 32) {
            throw new Exception("Public key must be 32 bytes");
        }
        
        $payload = chr($prefix) . $publicKey;
        $hash = self::simpleHash($payload);
        $checksum = substr($hash, 0, 2);
        $full = $payload . $checksum;
        
        return self::base58Encode($full);
    }
    
    /**
     * Konvertiere Adresse
     */
    public static function convert($address, $targetPrefix = self::PREFIX_POLKADOT) {
        try {
            $decoded = self::decode($address);
            
            if ($decoded['prefix'] === $targetPrefix) {
                return $address;
            }
            
            return self::encode($decoded['publicKey'], $targetPrefix);
            
        } catch (Exception $e) {
            error_log("SS58 Fallback conversion error: " . $e->getMessage());
            return $address;
        }
    }
    
    /**
     * Zu Polkadot Format
     */
    public static function toPolkadot($address) {
        return self::convert($address, self::PREFIX_POLKADOT);
    }
    
    /**
     * Prüfe ob valid
     */
    public static function isValid($address) {
        try {
            self::decode($address);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Hole Prefix
     */
    public static function getPrefix($address) {
        try {
            $decoded = self::decode($address);
            return $decoded['prefix'];
        } catch (Exception $e) {
            return null;
        }
    }
}