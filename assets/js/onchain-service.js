/**
 * OpenGov Track-Mapping (16 Tracks)
 * Quelle: Polkadot Governance v2 (OpenGov)
 */
const OPENGOV_TRACKS = {
    0: { id: 0, name: 'Root', icon: '👑', description: 'Full system control' },
    1: { id: 1, name: 'WhitelistedCaller', icon: '✅', description: 'Whitelisted operations' },
    10: { id: 10, name: 'StakingAdmin', icon: '🔒', description: 'Staking parameters' },
    11: { id: 11, name: 'Treasurer', icon: '💰', description: 'Treasury spending' },
    12: { id: 12, name: 'LeaseAdmin', icon: '📝', description: 'Parachain lease management' },
    13: { id: 13, name: 'FellowshipAdmin', icon: '🎓', description: 'Fellowship management' },
    14: { id: 14, name: 'ReferendumCanceller', icon: '🚫', description: 'Cancel referenda' },
    15: { id: 15, name: 'ReferendumKiller', icon: '💀', description: 'Kill malicious referenda' },
    20: { id: 20, name: 'GeneralAdmin', icon: '⚙️', description: 'General administration' },
    21: { id: 21, name: 'AuctionAdmin', icon: '🔨', description: 'Auction parameters' },
    30: { id: 30, name: 'SmallTipper', icon: '🪙', description: 'Tips up to 250 DOT' },
    31: { id: 31, name: 'BigTipper', icon: '💸', description: 'Tips up to 1000 DOT' },
    32: { id: 32, name: 'SmallSpender', icon: '💵', description: 'Spend up to 10k DOT' },
    33: { id: 33, name: 'MediumSpender', icon: '💴', description: 'Spend up to 100k DOT' },
    34: { id: 34, name: 'BigSpender', icon: '💶', description: 'Spend up to 1M DOT' },
    40: { id: 40, name: 'WishForChange', icon: '🌟', description: 'Community wishes' }
};

/**
 * Holt Track-Name anhand der ID
 */
function getTrackName(trackId) {
    return OPENGOV_TRACKS[trackId]?.name || `Unknown Track ${trackId}`;
}

/**
 * Holt Track-Icon anhand der ID
 */
function getTrackIcon(trackId) {
    return OPENGOV_TRACKS[trackId]?.icon || '❓';
}

/**
 * Conviction-Multiplier (0-6)
 */
function getConvictionMultiplier(conviction) {
    const multipliers = [0.1, 1, 2, 3, 4, 5, 6];
    return multipliers[conviction] || conviction;
}

/**
 * Identity-Registrar-Mapping (bekannte Registrars)
 * Polkadot Mainnet Registrars
 */
const IDENTITY_REGISTRARS = {
    0: 'Registrar',
    1: 'Web3 Foundation',
    2: 'Certus One',
    3: 'Chevdor'
};

/**
 * Holt Registrar-Name anhand der ID
 */
function getRegistrarName(registrarIndex) {
    return IDENTITY_REGISTRARS[registrarIndex] || `Registrar #${registrarIndex}`;
}

/**
 * OnChainService
 * Verwaltet die Verbindung zur Polkadot-Chain und lädt On-Chain-Daten
 * Nutzt @polkadot/api für RPC-Calls und Derive-Funktionen
 */

class OnChainService {
    constructor() {
        // Konfigurierbares Refresh-Intervall (10 Minuten)
        this.REFRESH_INTERVAL_MS = 10 * 60 * 1000;
        
        // Multi-API-Instanzen (Map: network -> {api, wsProvider, config})
        this.apis = new Map();
        
        // Verbindungsstatus (Map: network -> {connected: boolean, error: string})
        this.connectionStatus = new Map();
        
        // Status
        this.currentNetworkGroup = null;
        this.isConnected = false;
        
        // Background-Refresh Timer
        this.refreshTimerId = null;
        this.refreshCallback = null;
        
        // Network Registry
        this.networkRegistry = [];
        this.networkGroups = [];
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
                this.networkGroups = data.networkGroups || [];
                console.log('✅ Loaded local registry with RPC endpoints');
            }
        } catch (error) {
            console.error('❌ Local registry failed:', error);
        }

        // Fallback: Hardcoded minimal Registry
        if (!registry || !Array.isArray(registry) || registry.length === 0) {
            console.warn('⚠️ Local registry failed, using hardcoded minimal registry');
            registry = this.MINIMAL_REGISTRY;
            this.networkGroups = [
                { id: 'polkadot', displayName: 'Polkadot', chains: ['polkadot'] },
                { id: 'kusama', displayName: 'Kusama', chains: ['kusama'] }
            ];
        }

        // Sortiere nach Priority (falls vorhanden)
        registry.sort((a, b) => (a.priority || 999) - (b.priority || 999));

        // In SessionStorage cachen
        sessionStorage.setItem('networkRegistry', JSON.stringify(registry));
        sessionStorage.setItem('networkGroups', JSON.stringify(this.networkGroups));
        sessionStorage.setItem('registryLastFetch', now.toString());

        this.networkRegistry = registry;
        this.registryLoaded = true;

        console.log(`✅ Network registry loaded: ${registry.length} networks, ${this.networkGroups.length} groups`);
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
     * Verbindet zu allen Chains einer Network-Gruppe (Multi-Chain)
     * Sequenziell: Asset Hub zuerst (required), dann parallel Relay + People
     * @param {string} networkGroup - 'polkadot' oder 'kusama'
     * @returns {Promise<Map>} Map mit network -> api Instanz
     */
    async connectToNetworkGroup(networkGroup) {
        console.log(`🔌 Connecting to ${networkGroup} network group...`);
        
        // Registry laden
        if (!this.registryLoaded) {
            await this.loadNetworkRegistry();
        }
        
        // Alle Chains der Gruppe finden
        const groupChains = this.networkRegistry.filter(n => n.networkGroup === networkGroup);
        
        if (groupChains.length === 0) {
            throw new Error(`No chains found for network group: ${networkGroup}`);
        }
        
        console.log(`Found ${groupChains.length} chains in ${networkGroup} group`);
        
        // Alte Verbindungen dieser Gruppe trennen
        for (const [network, connection] of this.apis.entries()) {
            const chainConfig = this.networkRegistry.find(n => n.network === network);
            if (chainConfig?.networkGroup === networkGroup) {
                console.log(`🔌 Disconnecting old connection: ${network}`);
                try {
                    await connection.api.disconnect();
                } catch (error) {
                    console.warn(`Error disconnecting ${network}:`, error);
                }
                this.apis.delete(network);
                this.connectionStatus.delete(network);
            }
        }
        
        // SCHRITT 1: Asset Hub zuerst verbinden (REQUIRED)
        const assetHubConfig = groupChains.find(c => c.groupRole === 'assetHub' && c.required);
        if (!assetHubConfig) {
            throw new Error(`No required Asset Hub found for ${networkGroup}`);
        }
        
        console.log(`🔗 Step 1: Connecting to ${assetHubConfig.displayName} (required)...`);
        
        try {
            const wsProvider = new polkadotApi.WsProvider(assetHubConfig.rpcEndpoint);
            const api = await polkadotApi.ApiPromise.create({
                provider: wsProvider,
                throwOnConnect: true
            });
            
            await api.isReady;
            
            // 🔍 Debug: Chain Properties (Decimals)
            const properties = api.registry.getChainProperties();
            const chainDecimals = properties?.tokenDecimals?.toJSON?.()?.[0];
            console.log(`🔬 Chain Properties for ${assetHubConfig.displayName}:`, {
                tokenSymbol: properties?.tokenSymbol?.toJSON?.(),
                tokenDecimals: chainDecimals,
                configDecimals: assetHubConfig.decimals
            });
            
            this.apis.set(assetHubConfig.network, { api, wsProvider, config: assetHubConfig });
            this.connectionStatus.set(assetHubConfig.network, { connected: true, error: null });
            
            console.log(`✅ Connected to ${assetHubConfig.displayName}`);
        } catch (error) {
            console.error(`❌ Failed to connect to ${assetHubConfig.displayName}:`, error);
            this.connectionStatus.set(assetHubConfig.network, { connected: false, error: error.message });
            throw new Error(`Asset Hub connection failed: ${error.message}`);
        }
        
        // SCHRITT 2: Relay + People parallel verbinden (OPTIONAL)
        const optionalChains = groupChains.filter(c => c.groupRole !== 'assetHub');
        
        console.log(`🔗 Step 2: Connecting to ${optionalChains.length} optional chains in parallel...`);
        
        const optionalConnections = optionalChains.map(async (chainConfig) => {
            try {
                console.log(`🔗 Connecting to ${chainConfig.displayName}...`);
                
                const wsProvider = new polkadotApi.WsProvider(chainConfig.rpcEndpoint);
                const api = await polkadotApi.ApiPromise.create({
                    provider: wsProvider,
                    throwOnConnect: true
                });
                
                await api.isReady;
                
                this.apis.set(chainConfig.network, { api, wsProvider, config: chainConfig });
                this.connectionStatus.set(chainConfig.network, { connected: true, error: null });
                
                console.log(`✅ Connected to ${chainConfig.displayName}`);
                return { success: true, network: chainConfig.network };
            } catch (error) {
                console.error(`❌ Failed to connect to ${chainConfig.displayName}:`, error);
                this.connectionStatus.set(chainConfig.network, { connected: false, error: error.message });
                return { success: false, network: chainConfig.network, error: error.message };
            }
        });
        
        await Promise.allSettled(optionalConnections);
        
        this.currentNetworkGroup = networkGroup;
        this.isConnected = true;
        
        const connectedCount = Array.from(this.connectionStatus.values()).filter(s => s.connected).length;
        console.log(`✅ Connected to ${connectedCount}/${groupChains.length} chains in ${networkGroup}`);
        
        return this.apis;
    }
    
    /**
     * Trennt Verbindung zu einer Network-Gruppe
     * @param {string} networkGroup - 'polkadot' oder 'kusama'
     */
    async disconnectNetworkGroup(networkGroup) {
        const chainsToDisconnect = [];
        
        for (const [network, connection] of this.apis.entries()) {
            const chainConfig = this.networkRegistry.find(n => n.network === network);
            if (chainConfig?.networkGroup === networkGroup) {
                chainsToDisconnect.push(network);
            }
        }
        
        for (const network of chainsToDisconnect) {
            const connection = this.apis.get(network);
            try {
                await connection.api.disconnect();
                console.log(`✅ Disconnected from ${network}`);
            } catch (error) {
                console.error(`Error disconnecting ${network}:`, error);
            }
            this.apis.delete(network);
            this.connectionStatus.delete(network);
        }
        
        if (this.currentNetworkGroup === networkGroup) {
            this.currentNetworkGroup = null;
            this.isConnected = false;
        }
    }

    /**
     * Hilfsfunktion: Konvertiert Polkadot.js Typen zu primitiven Strings
     */
    toSafeString(value) {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        
        if (typeof value.toJSON === 'function') {
            const json = value.toJSON();
            return typeof json === 'string' ? json : String(json);
        }
        if (typeof value.toHuman === 'function') {
            return String(value.toHuman());
        }
        if (typeof value.toString === 'function') {
            const str = value.toString();
            return str === '[object Object]' ? null : str;
        }
        return null;
    }
    
    /**
     * Aggregiert On-Chain-Daten von mehreren Chains einer Network-Gruppe
     * @param {string} networkGroup - 'polkadot' oder 'kusama'
     * @param {string} address - Generic Address (Präfix 42)
     * @returns {Promise<Object>} Aggregierte Daten mit chains: {relay, assetHub, people}
     */
    async aggregateMultiChainData(networkGroup, address) {
        console.log(`📥 Fetching aggregated data for ${address.substring(0, 12)} from ${networkGroup}...`);
        
        const result = {
            networkGroup: networkGroup,
            chains: {},
            lastUpdate: Date.now()
        };
        
        const groupChains = this.networkRegistry.filter(n => n.networkGroup === networkGroup);
        
        // Daten von allen verfügbaren Chains parallel abrufen
        const fetchPromises = groupChains.map(async (chainConfig) => {
            const connection = this.apis.get(chainConfig.network);
            const status = this.connectionStatus.get(chainConfig.network);
            
            if (!connection || !status?.connected) {
                return {
                    network: chainConfig.network,
                    role: chainConfig.groupRole,
                    error: true,
                    chainName: chainConfig.network,
                    message: status?.error || 'Not connected'
                };
            }
            
            try {
                const data = await this.fetchChainData(
                    connection.api,
                    chainConfig,
                    address
                );
                
                // 🔍 Debug: Inspect raw chain data before aggregation
                console.log(`📊 ${chainConfig.displayName} (${chainConfig.groupRole}) RAW data:`, {
                    balances: data.balances,
                    staking: data.staking,
                    identity: data.identity
                });
                
                return {
                    network: chainConfig.network,
                    role: chainConfig.groupRole,
                    data: data
                };
            } catch (error) {
                console.error(`❌ Failed to fetch data from ${chainConfig.displayName}:`, error);
                return {
                    network: chainConfig.network,
                    role: chainConfig.groupRole,
                    error: true,
                    chainName: chainConfig.network,
                    message: error.message
                };
            }
        });
        
        const results = await Promise.allSettled(fetchPromises);
        
        // Organisiere Daten nach Rolle
        for (const promiseResult of results) {
            if (promiseResult.status === 'fulfilled') {
                const { network, role, data, error, chainName, message } = promiseResult.value;
                
                if (data) {
                    result.chains[role] = data;
                } else if (error) {
                    result.chains[role] = { error: true, chainName, message };
                }
            }
        }
        
        console.log(`✅ Aggregated data fetched from ${Object.keys(result.chains).length} chains`);
        return result;
    }
    
    /**
     * Lädt Daten von einer einzelnen Chain
     * @param {ApiPromise} api - Polkadot.js API Instanz
     * @param {Object} chainConfig - Chain-Konfiguration aus Registry
     * @param {string} address - Generic Address
     * @returns {Promise<Object>} Chain-spezifische Daten
     */
    async fetchChainData(api, chainConfig, address) {
        // Konvertiere Generic → Network-Specific Address
        const addresses = this.convertToNetworkAddress(address, chainConfig.prefix);
        const queryAddress = addresses.networkSpecific;
        
        console.log(`🔍 Querying ${chainConfig.displayName} with address: ${queryAddress.substring(0, 12)}...`);
        
        const data = {
            network: chainConfig.network,
            displayName: chainConfig.displayName,
            addresses: addresses
        };
        
        // Je nach Chain-Rolle verschiedene Daten abrufen
        const role = chainConfig.groupRole;
        
        try {
            if (role === 'assetHub') {
                // Asset Hub: Balances + Staking (seit Migration 04.11.2025)
                const balances = await api.derive.balances.all(queryAddress);
                
                // 🔍 Debug: Raw balance object from API
                console.log(`🔬 Asset Hub RAW balances object:`, {
                    availableBalance: balances?.availableBalance?.toString(),
                    freeBalance: balances?.freeBalance?.toString(),
                    reservedBalance: balances?.reservedBalance?.toString(),
                    frozenFee: balances?.frozenFee?.toString(),
                    lockedBalance: balances?.lockedBalance?.toString(),
                    allKeys: Object.keys(balances || {})
                });
                
                const free = this.toSafeString(balances?.freeBalance) || '0';
                const reserved = this.toSafeString(balances?.reservedBalance) || '0';
                const totalBigInt = BigInt(free) + BigInt(reserved);
                
                // Versuche Staking-Daten abzurufen (direkte Query statt derive)
                let bonded = '0';
                let unbonding = '0';
                
                try {
                    // Prüfe ob Staking-Pallet existiert
                    if (api.query.staking?.ledger) {
                        const ledger = await api.query.staking.ledger(queryAddress);
                        console.log(`🔍 Asset Hub Staking Ledger:`, ledger.toHuman());
                        
                        if (ledger.isSome) {
                            const ledgerData = ledger.unwrap();
                            bonded = this.toSafeString(ledgerData.active) || '0';
                            
                            // Unbonding chunks
                            const unlocking = ledgerData.unlocking || [];
                            if (unlocking.length > 0) {
                                unbonding = unlocking
                                    .filter(u => u?.value && BigInt(this.toSafeString(u.value) || '0') > 0n)
                                    .reduce((sum, u) => {
                                        const value = this.toSafeString(u.value) || '0';
                                        return (BigInt(sum) + BigInt(value)).toString();
                                    }, '0');
                            }
                            
                            console.log(`✅ Asset Hub Staking: bonded=${bonded}, unbonding=${unbonding}`);
                        }
                    }
                } catch (error) {
                    console.log(`ℹ️ Asset Hub staking query failed:`, error.message);
                }
                
                // Referenda Locks via classLocksFor abrufen
                let referenda = '0';
                if (api.query.convictionVoting?.classLocksFor) {
                    try {
                        const classLocks = await api.query.convictionVoting.classLocksFor(queryAddress);
                        console.log(`🔒 Asset Hub ClassLocks:`, classLocks.toHuman());
                        
                        if (classLocks && classLocks.length > 0) {
                            let maxLock = BigInt(0);
                            for (const [classId, amount] of classLocks) {
                                const lockAmount = BigInt(this.toSafeString(amount) || '0');
                                if (lockAmount > maxLock) {
                                    maxLock = lockAmount;
                                }
                                console.log(`  🔍 Asset Hub Track ${classId}: ${lockAmount.toString()}`);
                            }
                            referenda = maxLock.toString();
                            console.log(`  ✅ Asset Hub Max Referenda Lock: ${maxLock.toString()}`);
                        }
                    } catch (error) {
                        console.log(`ℹ️ Asset Hub convictionVoting query failed:`, error.message);
                    }
                }
                
                data.balances = {
                    free,
                    reserved,
                    frozen: this.toSafeString(balances?.frozenFee) || '0',
                    transferable: free,  // Asset Hub: free = transferable (matches polkadot.js.org)
                    locked: this.toSafeString(balances?.lockedBalance) || '0',
                    bonded,
                    unbonding,
                    referenda,
                    total: totalBigInt.toString()
                };
            }
            
            if (role === 'relay') {
                // Relay Chain: Balances + Staking + Governance
                const [balances, stakingInfo, votingBalance] = await Promise.all([
                    api.derive.balances.all(queryAddress),
                    api.derive.staking.account(queryAddress),
                    api.derive.balances.votingBalance(queryAddress)
                ]);
                
                // 🔍 Debug: Raw balance object from API
                console.log(`🔬 Relay Chain RAW balances object:`, {
                    availableBalance: balances?.availableBalance?.toString(),
                    freeBalance: balances?.freeBalance?.toString(),
                    reservedBalance: balances?.reservedBalance?.toString(),
                    frozenFee: balances?.frozenFee?.toString(),
                    lockedBalance: balances?.lockedBalance?.toString(),
                    allKeys: Object.keys(balances || {})
                });
                
                const free = this.toSafeString(balances?.freeBalance) || '0';
                const reserved = this.toSafeString(balances?.reservedBalance) || '0';
                const totalBigInt = BigInt(free) + BigInt(reserved);
                
                // Berechne bonded aus Staking (auch für Controller anzeigen)
                let bonded = '0';
                if (stakingInfo?.stakingLedger?.active) {
                    bonded = this.toSafeString(stakingInfo.stakingLedger.active) || '0';
                }
                
                // Berechne unbonding (filtere remainingEras > 0, redeemable Chunks nicht zählen)
                const unbondingArray = stakingInfo?.unlocking || [];
                const unbonding = unbondingArray.length > 0
                    ? unbondingArray
                        .filter(u => u?.remainingEras && BigInt(this.toSafeString(u.remainingEras) || '0') > 0n)
                        .reduce((sum, u) => {
                            const value = this.toSafeString(u?.value) || '0';
                            return (BigInt(sum) + BigInt(value)).toString();
                        }, '0')
                    : '0';
                
                console.log(`🔍 Staking Status for ${queryAddress.substring(0, 12)}:`, {
                    hasLedger: !!stakingInfo?.stakingLedger,
                    accountId: stakingInfo?.accountId?.toHuman(),
                    stashId: stakingInfo?.stashId?.toHuman(),
                    isStash: stakingInfo?.accountId?.eq(stakingInfo?.stashId),
                    controllerId: stakingInfo?.controllerId?.toHuman(),
                    bonded,
                    unbondingChunks: unbondingArray.length,
                    unbondingDetails: unbondingArray.map(u => ({
                        value: this.toSafeString(u?.value),
                        remainingEras: this.toSafeString(u?.remainingEras)
                    })),
                    unbonding
                });
                
                data.balances = {
                    free,
                    reserved,
                    frozen: this.toSafeString(balances?.frozenFee) || '0',
                    transferable: this.toSafeString(balances?.availableBalance) || '0',
                    locked: this.toSafeString(balances?.lockedBalance) || '0',
                    bonded,
                    unbonding,
                    referenda: '0',  // Wird später gefüllt wenn convictionVoting vorhanden
                    total: totalBigInt.toString()
                };
                
                data.staking = {
                    hasStaking: stakingInfo?.stakingLedger ? true : false,
                    active: this.toSafeString(stakingInfo?.stakingLedger?.active) || '0',
                    total: this.toSafeString(stakingInfo?.stakingLedger?.total) || '0',
                    unlocking: stakingInfo?.unlocking?.map(u => ({
                        value: this.toSafeString(u?.value) || '0',
                        era: this.toSafeString(u?.era) || '0'
                    })) || [],
                    rewardDestination: this.toSafeString(stakingInfo?.rewardDestination),
                    nominators: stakingInfo?.nominators?.map(n => this.toSafeString(n)) || []
                };
                
                data.governance = {
                    votingBalance: this.toSafeString(votingBalance) || '0',
                    votes: []
                };
                
                // OpenGov Votes abrufen (falls verfügbar)
                if (api.query.convictionVoting?.votingFor) {
                    try {
                        const votes = await this.fetchGovernanceVotes(api, queryAddress);
                        data.governance.votes = votes;
                    } catch (error) {
                        console.warn('Failed to fetch governance votes:', error);
                    }
                }
                
                // Referenda Locks via classLocksFor abrufen (wie polkadot-js/apps)
                if (api.query.convictionVoting?.classLocksFor) {
                    try {
                        const classLocks = await api.query.convictionVoting.classLocksFor(queryAddress);
                        console.log(`🔒 ClassLocks:`, classLocks.toHuman());
                        
                        // classLocks ist Vec<(u16, u128)> = Array von [classId, lockedAmount]
                        if (classLocks && classLocks.length > 0) {
                            let maxLock = BigInt(0);
                            for (const [classId, amount] of classLocks) {
                                const lockAmount = BigInt(this.toSafeString(amount) || '0');
                                if (lockAmount > maxLock) {
                                    maxLock = lockAmount;
                                }
                                console.log(`  🔍 Track ${classId}: ${lockAmount.toString()}`);
                            }
                            data.balances.referenda = maxLock.toString();
                            console.log(`  ✅ Max Referenda Lock: ${maxLock.toString()}`);
                        }
                    } catch (error) {
                        console.warn('Failed to fetch classLocksFor:', error);
                    }
                }
            }
            
            if (role === 'people') {
                // People Chain: Identity + Balances
                // WICHTIG: Auf People Chain existiert api.derive.accounts.info() NICHT!
                // Direkte Identity-Pallet-Queries verwenden (query.identity.identityOf/superOf)
                try {
                    // Hilfsfunktion: Parse Identity Data-Type zu UTF-8 String
                    const parseIdentityData = (dataField) => {
                        if (!dataField || dataField.isNone) return null;
                        try {
                            // Data-Type kann Raw oder andere Varianten sein
                            if (dataField.isRaw) {
                                return dataField.asRaw.toUtf8();
                            }
                            // Fallback: toHuman() für andere Types
                            const human = dataField.toHuman();
                            return human?.Raw || human || null;
                        } catch (e) {
                            return null;
                        }
                    };
                    
                    // 1. Prüfe ob Sub-Identity
                    const superOf = await api.query.identity.superOf(queryAddress);
                    let parentIdentity = null;
                    let isSubIdentity = false;
                    let subIdentityData = null;
                    
                    if (superOf.isSome) {
                        isSubIdentity = true;
                        const [parentAddress, subData] = superOf.unwrap();
                        const parentAddressStr = parentAddress.toString();
                        
                        // WICHTIG: subData enthält die Sub-Identity-Info (Data-Type)
                        subIdentityData = parseIdentityData(subData);
                        console.log(`✅ Sub-Identity detected: "${subIdentityData}" (Parent: ${parentAddressStr.substring(0, 12)}...)`);
                        
                        // Lade Parent-Identity
                        const parentIdentityOf = await api.query.identity.identityOf(parentAddressStr);
                        if (parentIdentityOf.isSome) {
                            const parentData = parentIdentityOf.unwrap();
                            parentIdentity = {
                                address: parentAddressStr,
                                display: parseIdentityData(parentData.info.display),
                                judgements: parentData.judgements.map(([registrarIndex, judgement]) => ({
                                    registrarIndex: registrarIndex.toNumber(),
                                    registrarName: getRegistrarName(registrarIndex.toNumber()),
                                    judgement: judgement.toString(),
                                    judgementType: judgement.type
                                }))
                            };
                        }
                    }
                    
                    // 2. Lade Haupt-Identity ODER verwende Sub-Identity-Daten
                    if (isSubIdentity && subIdentityData) {
                        // Sub-Identity: Verwende die Sub-Identity-Daten (nur Display-Name verfügbar)
                        // Alle anderen Felder kommen vom Parent
                        const parentInfo = parentIdentity ? await api.query.identity.identityOf(parentIdentity.address).then(r => r.isSome ? r.unwrap().info : null) : null;
                        
                        data.identity = {
                            hasIdentity: true,
                            display: subIdentityData, // Sub-Identity Name (z.B. "VFDA")
                            legal: parentInfo ? parseIdentityData(parentInfo.legal) : null,
                            web: parentInfo ? parseIdentityData(parentInfo.web) : null,
                            email: parentInfo ? parseIdentityData(parentInfo.email) : null,
                            twitter: parentInfo ? parseIdentityData(parentInfo.twitter) : null,
                            riot: parentInfo ? parseIdentityData(parentInfo.riot) : null,
                            github: parentInfo ? parseIdentityData(parentInfo.github) : null,
                            discord: parentInfo ? parseIdentityData(parentInfo.discord) : null,
                            matrix: parentInfo ? parseIdentityData(parentInfo.matrix) : null,
                            pgpFingerprint: parentInfo && parentInfo.pgpFingerprint && !parentInfo.pgpFingerprint.isNone 
                                ? parentInfo.pgpFingerprint.unwrap().toHex() 
                                : null,
                            judgements: parentIdentity ? parentIdentity.judgements : [], // Judgements vom Parent
                            isSubIdentity: true,
                            parent: parentIdentity
                        };
                    } else {
                        // Standard-Identity (kein Sub)
                        const identityOf = await api.query.identity.identityOf(queryAddress);
                        
                        if (identityOf.isNone) {
                            // Keine Identity gesetzt
                            data.identity = {
                                hasIdentity: false,
                                display: null,
                                legal: null,
                                web: null,
                                email: null,
                                twitter: null,
                                riot: null,
                                github: null,
                                discord: null,
                                matrix: null,
                                pgpFingerprint: null,
                                judgements: [],
                                isSubIdentity: false,
                                parent: null
                            };
                        } else {
                            const identity = identityOf.unwrap();
                            const info = identity.info;
                            
                            // Parse alle Identity-Felder
                            data.identity = {
                                hasIdentity: true,
                                display: parseIdentityData(info.display),
                                legal: parseIdentityData(info.legal),
                                web: parseIdentityData(info.web),
                                email: parseIdentityData(info.email),
                                twitter: parseIdentityData(info.twitter),
                                riot: parseIdentityData(info.riot),
                                github: parseIdentityData(info.github),
                                discord: parseIdentityData(info.discord),
                                matrix: parseIdentityData(info.matrix),
                                pgpFingerprint: info.pgpFingerprint && !info.pgpFingerprint.isNone 
                                    ? info.pgpFingerprint.unwrap().toHex() 
                                    : null,
                                judgements: identity.judgements.map(([registrarIndex, judgement]) => ({
                                    registrarIndex: registrarIndex.toNumber(),
                                    registrarName: getRegistrarName(registrarIndex.toNumber()),
                                    judgement: judgement.toString(),
                                    judgementType: judgement.type
                                })),
                                isSubIdentity: false,
                                parent: null
                            };
                        }
                    }
                    
                    // 3. Balances abrufen
                    const balances = await api.derive.balances.all(queryAddress).catch(error => {
                        console.warn(`⚠️ Balance query failed for ${queryAddress.substring(0, 12)}...:`, error.message);
                        return null;
                    });
                    
                    if (balances) {
                        data.balances = {
                            free: this.toSafeString(balances?.freeBalance) || '0',
                            reserved: this.toSafeString(balances?.reservedBalance) || '0',
                            transferable: this.toSafeString(balances?.availableBalance) || '0',
                            total: (balances?.freeBalance && balances?.reservedBalance)
                                ? this.toSafeString(balances.freeBalance.add(balances.reservedBalance)) || '0'
                                : '0'
                        };
                    }
                    
                } catch (error) {
                    console.warn(`⚠️ Identity extraction failed for ${queryAddress.substring(0, 12)}...:`, error.message);
                    // Werfe Fehler, damit fetchChainData() fehlschlägt und aggregateMultiChainData() die Chain als fehlgeschlagen markiert
                    // Dies führt dazu, dass die gecachten People-Daten beibehalten werden statt mit leeren Daten überschrieben zu werden
                    throw new Error(`Identity API failed: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.error(`Error fetching data from ${chainConfig.displayName}:`, error);
            throw error;
        }
        
        return data;
    }
    
    /**
     * Lädt Governance-Votes von OpenGov
     * @param {ApiPromise} api - Polkadot.js API Instanz
     * @param {string} address - Network-Specific Address
     * @returns {Promise<Array>} Liste von Votes
     */
    async fetchGovernanceVotes(api, address) {
        const votes = [];
        
        try {
            // Alle Tracks basierend auf OPENGOV_TRACKS abfragen (nicht-sequenzielle IDs)
            const availableTracks = Object.keys(OPENGOV_TRACKS).map(Number);
            console.log(`🎯 Querying ${availableTracks.length} OpenGov tracks:`, availableTracks);
            console.log(`🎯 Address: ${address.substring(0, 12)}...`);
            
            const trackPromises = [];
            for (const trackId of availableTracks) {
                trackPromises.push(
                    api.query.convictionVoting.votingFor(address, trackId)
                        .then(voting => {
                            console.log(`  ✅ Track ${trackId} (${getTrackName(trackId)}): ${voting.type}`);
                            return { trackId, voting };
                        })
                        .catch(err => {
                            console.warn(`  ❌ Track ${trackId} query failed:`, err.message);
                            return { trackId, voting: null };
                        })
                );
            }
            
            const trackResults = await Promise.all(trackPromises);
            
            // Count nach Type für Debug
            const typeCounts = { standard: 0, split: 0, splitAbstain: 0, delegating: 0 };
            
            for (const { trackId, voting } of trackResults) {
                if (!voting) continue;
                
                // DELEGATING VOTES
                if (voting.isDelegating) {
                    const delegation = voting.asDelegating;
                    console.log(`  🔗 Track ${trackId}: Delegating to ${this.toSafeString(delegation.target).substring(0, 12)}...`);
                    
                    votes.push({
                        type: 'delegating',
                        trackId: trackId,
                        trackName: getTrackName(trackId),
                        trackIcon: getTrackIcon(trackId),
                        target: this.toSafeString(delegation.target),
                        balance: this.toSafeString(delegation.balance),
                        conviction: delegation.conviction.toNumber(),
                        convictionMultiplier: getConvictionMultiplier(delegation.conviction.toNumber())
                    });
                    typeCounts.delegating++;
                    continue;
                }
                
                // CASTING VOTES (Standard/Split/SplitAbstain)
                if (voting.isCasting) {
                    const castingVotes = voting.asCasting.votes;
                    console.log(`  🗳️ Track ${trackId}: ${castingVotes.length} casting votes`);
                    
                    for (const [refIndex, voteData] of castingVotes) {
                        
                        // STANDARD VOTE
                        if (voteData.isStandard) {
                            const vote = voteData.asStandard;
                            
                            votes.push({
                                type: 'standard',
                                referendumIndex: this.toSafeString(refIndex),
                                trackId: trackId,
                                trackName: getTrackName(trackId),
                                trackIcon: getTrackIcon(trackId),
                                aye: vote.vote.isAye,
                                conviction: vote.vote.conviction.toNumber(),
                                convictionMultiplier: getConvictionMultiplier(vote.vote.conviction.toNumber()),
                                balance: this.toSafeString(vote.balance)
                            });
                            typeCounts.standard++;
                        }
                        
                        // SPLIT VOTE
                        else if (voteData.isSplit) {
                            const vote = voteData.asSplit;
                            console.log(`    ⚖️ Ref #${refIndex}: Split vote (AYE: ${vote.aye.toString()}, NAY: ${vote.nay.toString()})`);
                            
                            votes.push({
                                type: 'split',
                                referendumIndex: this.toSafeString(refIndex),
                                trackId: trackId,
                                trackName: getTrackName(trackId),
                                trackIcon: getTrackIcon(trackId),
                                ayeBalance: this.toSafeString(vote.aye),
                                nayBalance: this.toSafeString(vote.nay)
                            });
                            typeCounts.split++;
                        }
                        
                        // SPLITABSTAIN VOTE
                        else if (voteData.isSplitAbstain) {
                            const vote = voteData.asSplitAbstain;
                            console.log(`    🎭 Ref #${refIndex}: SplitAbstain vote`);
                            
                            votes.push({
                                type: 'splitAbstain',
                                referendumIndex: this.toSafeString(refIndex),
                                trackId: trackId,
                                trackName: getTrackName(trackId),
                                trackIcon: getTrackIcon(trackId),
                                ayeBalance: this.toSafeString(vote.aye),
                                nayBalance: this.toSafeString(vote.nay),
                                abstainBalance: this.toSafeString(vote.abstain)
                            });
                            typeCounts.splitAbstain++;
                        }
                    }
                }
            }
            
            console.log(`📊 Found ${votes.length} total votes:`, typeCounts);
        } catch (error) {
            console.error('Error fetching governance votes:', error);
        }
        
        return votes;
    }
    
    /**
     * LEGACY: Alle On-Chain-Daten für eine Adresse abrufen (Single-Chain-Modus)
     * @deprecated Verwende aggregateMultiChainData() für Multi-Chain
     * @param {string} address - Generic Address (Präfix 42)
     * @returns {Promise<Object>} On-Chain-Daten mit addresses: {generic, networkSpecific}
     */
    async fetchAllOnChainData(address) {
        if (!this.isConnected || this.apis.size === 0) {
            throw new Error('Not connected to any chain');
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
     * Trennt alle Verbindungen
     */
    async disconnect() {
        console.log('🔌 Disconnecting from all chains...');

        // Auto-Refresh stoppen
        this.stopAutoRefresh();

        // Alle APIs trennen
        for (const [network, connection] of this.apis.entries()) {
            try {
                await connection.api.disconnect();
                console.log(`✅ Disconnected from ${network}`);
            } catch (error) {
                console.error(`Error disconnecting ${network}:`, error);
            }
        }

        // Status zurücksetzen
        this.apis.clear();
        this.connectionStatus.clear();
        this.isConnected = false;
        this.currentNetworkGroup = null;

        console.log('✅ All connections closed');
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
            // WICHTIG: Nur wenn tatsächlich Hex-Chars (a-f) vorhanden sind
            const hasHexChars = /[a-fA-F]/.test(valueStr);
            if (hasHexChars && /^[0-9a-fA-F]+$/.test(valueStr) && valueStr.length > 0) {
                try {
                    // Konvertiere Hex zu BigInt dann zu String
                    console.log('🔬 Converting HEX balance:', valueStr);
                    const hexBigInt = BigInt('0x' + valueStr);
                    valueStr = hexBigInt.toString();
                    console.log('🔬 Converted to decimal:', valueStr);
                } catch (hexError) {
                    console.warn('Failed to convert hex balance:', valueStr);
                }
            }
            
            // Prüfe ob es ein gültiger numerischer String ist
            if (!/^\d+$/.test(valueStr)) {
                console.warn('Invalid balance value after conversion:', valueStr, 'Original:', value, 'Type:', typeof value);
                return `0 ${unit}`;
            }

            // Manuelle Formatierung (polkadotUtil.formatBalance hat Bugs mit verschiedenen Decimals)
            // Konvertiere Plancks zu Token: value / 10^decimals
            const divisor = BigInt(10) ** BigInt(decimals);
            const valueBigInt = BigInt(valueStr);
            
            // Integer Teil
            const integerPart = valueBigInt / divisor;
            
            // Dezimal Teil (mit führenden Nullen)
            const remainder = valueBigInt % divisor;
            const decimalStr = remainder.toString().padStart(decimals, '0');
            
            // Zeige immer genau 4 Dezimalstellen
            const displayDecimal = decimalStr.substring(0, 4);
            
            const result = `${integerPart}.${displayDecimal} ${unit}`;
            
            // 🔍 Debug: Nur bei großen Werten loggen
            if (BigInt(valueStr) > BigInt(1000000000)) {
                console.log(`🔬 formatBalance: ${valueStr} (dec:${decimals}) -> ${result}`);
            }
            
            return result;
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
