/**
 * OnChainService
 * Verwaltet die Verbindung zur Polkadot-Chain und lädt On-Chain-Daten
 * Nutzt @polkadot/api für RPC-Calls und Derive-Funktionen
 */

class OnChainService {
    constructor() {
        // Konfigurierbares Refresh-Intervall (10 Minuten)
        this.REFRESH_INTERVAL_MS = 10 * 60 * 1000;
        
        // API-Instanzen
        this.api = null;
        this.wsProvider = null;
        
        // Status
        this.currentNetwork = null;
        this.isConnected = false;
        
        // Background-Refresh Timer
        this.refreshTimerId = null;
        this.refreshCallback = null;
        
        // Network Registry
        this.networkRegistry = [];
        this.registryLoaded = false;
        
        // Hardcoded minimal Registry als Fallback
        this.MINIMAL_REGISTRY = [
            { network: 'polkadot', displayName: 'Polkadot', prefix: 0, symbol: 'DOT', decimals: 10, rpcEndpoint: 'wss://rpc.polkadot.io', priority: 1 },
            { network: 'kusama', displayName: 'Kusama', prefix: 2, symbol: 'KSM', decimals: 12, rpcEndpoint: 'wss://kusama-rpc.polkadot.io', priority: 2 },
            { network: 'westend', displayName: 'Westend', prefix: 42, symbol: 'WND', decimals: 12, rpcEndpoint: 'wss://westend-rpc.polkadot.io', priority: 3 }
        ];
    }

    /**
     * Lädt Network Registry mit Retry-Strategie und Fallback
     * Versucht zuerst GitHub (mit exponential backoff), dann lokale JSON, dann hardcoded
     * Cache: 24 Stunden in SessionStorage
     * @returns {Promise<Array>} Network Registry
     */
    async loadNetworkRegistry() {
        // Bereits geladen?
        if (this.registryLoaded && this.networkRegistry.length > 0) {
            return this.networkRegistry;
        }

        // Cache-Check: 24 Stunden Gültigkeit
        const cachedRegistry = sessionStorage.getItem('networkRegistry');
        const cachedTimestamp = sessionStorage.getItem('registryLastFetch');
        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        if (cachedRegistry && cachedTimestamp) {
            const age = now - parseInt(cachedTimestamp);
            if (age < ONE_DAY_MS) {
                console.log('📦 Using cached network registry');
                this.networkRegistry = JSON.parse(cachedRegistry);
                this.registryLoaded = true;
                return this.networkRegistry;
            }
        }

        // WICHTIG: GitHub ss58-registry enthält KEINE RPC-Endpoints!
        // Wir laden IMMER unsere lokale Registry mit RPC-Endpoints
        
        let registry = null;
        
        try {
            const response = await fetch('data/ss58-registry.json');
            if (response.ok) {
                const data = await response.json();
                registry = data.registry;
                console.log('✅ Loaded local registry with RPC endpoints');
            }
        } catch (error) {
            console.error('❌ Local registry failed:', error);
        }

        // Fallback: Hardcoded minimal Registry
        if (!registry || !Array.isArray(registry) || registry.length === 0) {
            console.warn('⚠️ Local registry failed, using hardcoded minimal registry');
            registry = this.MINIMAL_REGISTRY;
        }

        // Sortiere nach Priority (falls vorhanden)
        registry.sort((a, b) => (a.priority || 999) - (b.priority || 999));

        // In SessionStorage cachen
        sessionStorage.setItem('networkRegistry', JSON.stringify(registry));
        sessionStorage.setItem('registryLastFetch', now.toString());

        this.networkRegistry = registry;
        this.registryLoaded = true;

        console.log(`✅ Network registry loaded: ${registry.length} networks`);
        return this.networkRegistry;
    }



    /**
     * Konvertiert Generic Address zu Network-Specific Address
     * @param {string} address - Generic Address (Präfix 42)
     * @param {number} networkPrefix - Ziel-Prefix (0=Polkadot, 2=Kusama, etc.)
     * @returns {Object} {generic, networkSpecific}
     */
    convertToNetworkAddress(address, networkPrefix) {
        try {
            // Polkadot.js util-crypto nutzen
            const { encodeAddress, decodeAddress } = polkadotUtilCrypto;
            
            // Decode zu Public Key (entfernt Prefix)
            const publicKey = decodeAddress(address);
            
            // Encode mit neuem Prefix
            const networkSpecific = encodeAddress(publicKey, networkPrefix);
            
            return {
                generic: address,
                networkSpecific: networkSpecific
            };
        } catch (error) {
            console.error('❌ Address conversion failed:', error);
            throw new Error('Could not convert address. Please reconnect your wallet.');
        }
    }

    /**
     * Verbindung zur Chain herstellen
     * @param {string} network - Netzwerk (polkadot, kusama, westend)
     * @returns {Promise<boolean>} Success
     */
    async connect(network = 'polkadot') {
        try {
            // Registry laden falls noch nicht geschehen
            if (!this.registryLoaded) {
                await this.loadNetworkRegistry();
            }

            // Bereits verbunden mit gleichem Netzwerk?
            if (this.isConnected && this.currentNetwork === network) {
                console.log(`✅ Already connected to ${network}`);
                return true;
            }

            // Alte Verbindung trennen falls vorhanden
            if (this.isConnected) {
                await this.disconnect();
            }

            console.log(`🔌 Connecting to ${network}...`);

            // Endpoint aus Registry holen
            const networkConfig = this.networkRegistry.find(n => n.network === network);
            if (!networkConfig) {
                throw new Error(`Unknown network: ${network}`);
            }
            const endpoint = networkConfig.rpcEndpoint;
            
            console.log(`🔗 Using RPC endpoint: ${endpoint}`);
            
            if (!endpoint) {
                throw new Error(`No RPC endpoint configured for network: ${network}`);
            }

            // WebSocket Provider erstellen
            this.wsProvider = new polkadotApi.WsProvider(endpoint);

            // API-Instanz erstellen
            this.api = await polkadotApi.ApiPromise.create({
                provider: this.wsProvider,
                throwOnConnect: true
            });

            // Auf Ready warten
            await this.api.isReady;

            this.currentNetwork = network;
            this.isConnected = true;

            console.log(`✅ Connected to ${network}`);
            
            // Chain-Info loggen
            const chain = await this.api.rpc.system.chain();
            const nodeName = await this.api.rpc.system.name();
            const nodeVersion = await this.api.rpc.system.version();
            console.log(`📡 Chain: ${chain}, Node: ${nodeName} v${nodeVersion}`);

            return true;

        } catch (error) {
            console.error('❌ Connection failed:', error);
            this.isConnected = false;
            this.api = null;
            this.wsProvider = null;
            throw error;
        }
    }

    /**
     * Alle On-Chain-Daten für eine Adresse abrufen
     * @param {string} address - Generic Address (Präfix 42)
     * @returns {Promise<Object>} On-Chain-Daten mit addresses: {generic, networkSpecific}
     */
    async fetchAllOnChainData(address) {
        if (!this.isConnected || !this.api) {
            throw new Error('Not connected to chain');
        }

        console.log(`📥 Fetching on-chain data for ${address.substring(0, 12)}...`);

        try {
            // 1. Hole Network-Prefix aus Registry
            const networkConfig = this.networkRegistry.find(n => n.network === this.currentNetwork);
            if (!networkConfig) {
                throw new Error(`Network configuration not found for: ${this.currentNetwork}`);
            }

            // 2. Konvertiere Generic → Network-Specific Address
            const addresses = this.convertToNetworkAddress(address, networkConfig.prefix);
            
            console.log('🔍 Generic address:', addresses.generic);
            console.log(`🔍 Querying with ${this.currentNetwork} address:`, addresses.networkSpecific);

            // 3. Nutze NETWORK-SPECIFIC Address für API-Queries
            const queryAddress = addresses.networkSpecific;

            // Alle Derives parallel ausführen
            const [
                accountInfo,
                balances,
                stakingInfo,
                votingBalance
            ] = await Promise.all([
                this.api.derive.accounts.info(queryAddress),
                this.api.derive.balances.all(queryAddress),
                this.api.derive.staking.account(queryAddress),
                this.api.derive.balances.votingBalance(queryAddress)
            ]);

            // Hilfsfunktion: Konvertiert Polkadot.js Typen zu primitiven Strings
            const toSafeString = (value) => {
                if (!value) return null;
                if (typeof value === 'string') return value;
                if (typeof value === 'number') return value.toString();
                
                // Polkadot.js Typen haben verschiedene Konvertierungsmethoden
                if (typeof value.toJSON === 'function') {
                    const json = value.toJSON();
                    return typeof json === 'string' ? json : String(json);
                }
                if (typeof value.toHuman === 'function') {
                    return String(value.toHuman());
                }
                if (typeof value.toString === 'function') {
                    const str = value.toString();
                    // Verhindere "[object Object]"
                    return str === '[object Object]' ? null : str;
                }
                return null;
            };

            // Strukturiertes Objekt zurückgeben (mit sicherer String-Konvertierung)
            const data = {
                account: {
                    accountId: toSafeString(accountInfo?.accountId),
                    identity: {
                        display: toSafeString(accountInfo?.identity?.display),
                        legal: toSafeString(accountInfo?.identity?.legal),
                        web: toSafeString(accountInfo?.identity?.web),
                        email: toSafeString(accountInfo?.identity?.email),
                        twitter: toSafeString(accountInfo?.identity?.twitter),
                        hasIdentity: accountInfo?.identity?.display ? true : false
                    },
                    flags: {
                        isCouncil: accountInfo?.flags?.isCouncil || false,
                        isSociety: accountInfo?.flags?.isSociety || false,
                        isTechCommittee: accountInfo?.flags?.isTechCommittee || false
                    }
                },
                balances: {
                    free: toSafeString(balances?.freeBalance) || '0',
                    reserved: toSafeString(balances?.reservedBalance) || '0',
                    frozen: toSafeString(balances?.frozenFee) || '0',
                    total: (balances?.freeBalance && balances?.reservedBalance) 
                        ? toSafeString(balances.freeBalance.add(balances.reservedBalance)) || '0'
                        : '0',
                    locks: balances?.lockedBreakdown?.map(lock => ({
                        id: toSafeString(lock?.id) || '',
                        amount: toSafeString(lock?.amount) || '0',
                        reasons: toSafeString(lock?.reasons) || ''
                    })) || []
                },
                staking: {
                    hasStaking: stakingInfo?.stakingLedger ? true : false,
                    active: toSafeString(stakingInfo?.stakingLedger?.active) || '0',
                    total: toSafeString(stakingInfo?.stakingLedger?.total) || '0',
                    unlocking: stakingInfo?.unlocking?.map(u => ({
                        value: toSafeString(u?.value) || '0',
                        era: toSafeString(u?.era) || '0'
                    })) || [],
                    rewardDestination: toSafeString(stakingInfo?.rewardDestination),
                    nominators: stakingInfo?.nominators?.map(n => toSafeString(n)) || []
                },
                governance: {
                    votingBalance: toSafeString(votingBalance) || '0'
                },
                addresses: {
                    generic: addresses.generic,
                    networkSpecific: addresses.networkSpecific
                },
                lastUpdate: Date.now()
            };

            console.log(`✅ On-chain data fetched successfully`);
            return data;

        } catch (error) {
            console.error('❌ Failed to fetch on-chain data:', error);
            throw error;
        }
    }

    /**
     * Auto-Refresh im Hintergrund starten
     * @param {Function} callback - Wird alle REFRESH_INTERVAL_MS aufgerufen
     */
    startAutoRefresh(callback) {
        // Alten Timer stoppen falls vorhanden
        this.stopAutoRefresh();

        this.refreshCallback = callback;
        
        console.log(`⏰ Auto-refresh started (every ${this.REFRESH_INTERVAL_MS / 1000 / 60} minutes)`);

        this.refreshTimerId = setInterval(() => {
            console.log('🔄 Auto-refresh triggered');
            if (this.refreshCallback) {
                this.refreshCallback();
            }
        }, this.REFRESH_INTERVAL_MS);
    }

    /**
     * Auto-Refresh stoppen
     */
    stopAutoRefresh() {
        if (this.refreshTimerId) {
            clearInterval(this.refreshTimerId);
            this.refreshTimerId = null;
            this.refreshCallback = null;
            console.log('⏸️ Auto-refresh stopped');
        }
    }

    /**
     * Verbindung trennen und Cleanup
     */
    async disconnect() {
        console.log('🔌 Disconnecting from chain...');

        // Auto-Refresh stoppen
        this.stopAutoRefresh();

        // API trennen
        if (this.api) {
            try {
                await this.api.disconnect();
            } catch (error) {
                console.error('Error disconnecting API:', error);
            }
        }

        // Status zurücksetzen
        this.api = null;
        this.wsProvider = null;
        this.isConnected = false;
        this.currentNetwork = null;

        console.log('✅ Disconnected');
    }

    /**
     * Prüft ob Daten refresh benötigen
     * @param {number} lastUpdate - Timestamp des letzten Updates
     * @returns {boolean} True wenn Refresh nötig
     */
    needsRefresh(lastUpdate) {
        if (!lastUpdate) return true;
        const age = Date.now() - lastUpdate;
        return age >= this.REFRESH_INTERVAL_MS;
    }

    /**
     * Formatiert einen Balance-Wert in lesbare Form
     * @param {string} value - Balance als String
     * @param {number} decimals - Dezimalstellen (10 für DOT)
     * @param {string} unit - Einheit (DOT, KSM, WND)
     * @returns {string} Formatierter String
     */
    formatBalance(value, decimals = 10, unit = 'DOT') {
        try {
            // Validierung: Wenn value leer, null oder undefined
            if (!value || value === '0' || value === 0) {
                return `0 ${unit}`;
            }

            // Konvertiere value zu einem numerischen String
            let valueStr;
            if (typeof value === 'object' && value !== null) {
                // Polkadot.js API Typen haben spezielle Methoden
                // Versuche verschiedene Konvertierungsmethoden in Reihenfolge
                if (typeof value.toJSON === 'function') {
                    // toJSON() gibt oft den numerischen Wert zurück
                    const jsonValue = value.toJSON();
                    valueStr = typeof jsonValue === 'string' ? jsonValue : String(jsonValue);
                } else if (typeof value.toHex === 'function') {
                    // toHex() für BN-Objekte
                    const hexValue = value.toHex();
                    valueStr = BigInt(hexValue).toString();
                } else if (typeof value.toBn === 'function') {
                    // toBn() konvertiert zu BN, dann toString()
                    valueStr = value.toBn().toString();
                } else if (typeof value.toString === 'function') {
                    valueStr = value.toString();
                    // Wenn toString() '[object Object]' zurückgibt, ist es ungültig
                    if (valueStr === '[object Object]') {
                        console.warn('Unable to convert balance object:', value, 'Type:', value.constructor?.name);
                        return `0 ${unit}`;
                    }
                } else {
                    console.warn('Invalid balance object (no conversion method):', value);
                    return `0 ${unit}`;
                }
            } else {
                // Primitive Typen direkt zu String konvertieren
                valueStr = String(value);
            }
            
            // Prüfe ob es ein HEX-String ist (z.B. "02c79236085d") und konvertiere zu Decimal
            if (/^[0-9a-fA-F]+$/.test(valueStr) && valueStr.length > 0) {
                try {
                    // Konvertiere Hex zu BigInt dann zu String
                    const hexBigInt = BigInt('0x' + valueStr);
                    valueStr = hexBigInt.toString();
                } catch (hexError) {
                    console.warn('Failed to convert hex balance:', valueStr);
                }
            }
            
            // Prüfe ob es ein gültiger numerischer String ist
            if (!/^\d+$/.test(valueStr)) {
                console.warn('Invalid balance value after conversion:', valueStr, 'Original:', value, 'Type:', typeof value);
                return `0 ${unit}`;
            }

            // Nutzt polkadot-util für korrekte Formatierung
            // WICHTIG: withUnit und forceUnit NICHT zusammen verwenden!
            return polkadotUtil.formatBalance(valueStr, {
                decimals: decimals,
                withUnit: unit
            });
        } catch (error) {
            console.error('Error formatting balance:', error, 'Value:', value);
            // Fallback: Manuelle Formatierung
            try {
                // Versuche value zu konvertieren (kann String oder Number sein)
                let numValue;
                if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
                    numValue = value.toString();
                } else {
                    numValue = value;
                }
                
                const num = BigInt(numValue || 0);
                const divisor = BigInt(10 ** decimals);
                const integerPart = num / divisor;
                const remainder = num % divisor;
                
                // Formatiere mit 4 Dezimalstellen
                const decimalStr = remainder.toString().padStart(decimals, '0').substring(0, 4);
                return `${integerPart}.${decimalStr} ${unit}`;
            } catch (fallbackError) {
                console.error('Fallback formatting failed:', fallbackError);
                return `0 ${unit}`;
            }
        }
    }
}

// Globale Instanz erstellen
window.onChainService = new OnChainService();
