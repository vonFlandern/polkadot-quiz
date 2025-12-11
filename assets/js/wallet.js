/**
 * Wallet Management für Polkadot Quiz
 * Verwendet Polkadot.js Extension API
 */

class WalletManager {
    constructor() {
        this.selectedAccount = null;
        this.extension = null;
    }

    /**
     * Prüfe ob Polkadot.js Extension installiert ist
     */
    async isExtensionAvailable() {
        if (typeof window.injectedWeb3 === 'undefined') {
            return false;
        }

        // Warte kurz, da injectedWeb3 asynchron geladen wird
        await new Promise(resolve => setTimeout(resolve, 100));

        return window.injectedWeb3 && 
               (window.injectedWeb3['polkadot-js'] || 
                window.injectedWeb3['talisman'] || 
                window.injectedWeb3['subwallet-js']);
    }

    /**
     * Verbinde mit Polkadot Extension
     */
    async connect() {
        try {
            // Prüfe ob Extension verfügbar
            const available = await this.isExtensionAvailable();
            if (!available) {
                throw new Error('Keine Polkadot Wallet Extension gefunden. Bitte installiere Polkadot.js, Talisman oder SubWallet.');
            }

            // Versuche verschiedene Extensions
            let extension = null;
            
            if (window.injectedWeb3['polkadot-js']) {
                extension = await window.injectedWeb3['polkadot-js'].enable('Polkadot Quiz');
            } else if (window.injectedWeb3['talisman']) {
                extension = await window.injectedWeb3['talisman'].enable('Polkadot Quiz');
            } else if (window.injectedWeb3['subwallet-js']) {
                extension = await window.injectedWeb3['subwallet-js'].enable('Polkadot Quiz');
            }

            if (!extension) {
                throw new Error('Konnte keine Wallet-Extension laden.');
            }

            this.extension = extension;

            // Hole Accounts
            const accounts = await extension.accounts.get();
            
            if (accounts.length === 0) {
                throw new Error('Keine Accounts in der Wallet gefunden.');
            }

            return accounts;
        } catch (error) {
            console.error('Wallet connection error:', error);
            throw error;
        }
    }

    /**
     * Wähle einen Account aus
     */
    selectAccount(account) {
        this.selectedAccount = account;
    }

    /**
     * Hole ausgewählten Account
     */
    getSelectedAccount() {
        return this.selectedAccount;
    }

    /**
     * Signiere eine Message (für zukünftige Verifizierung)
     */
    async signMessage(message) {
        if (!this.selectedAccount || !this.extension) {
            throw new Error('Kein Account ausgewählt');
        }

        try {
            const signature = await this.extension.signer.signRaw({
                address: this.selectedAccount.address,
                data: message,
                type: 'bytes'
            });

            return signature;
        } catch (error) {
            console.error('Signing error:', error);
            throw error;
        }
    }

    /**
     * Formatiere Adresse (kürzen für Display)
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
}

// Globale Instanz
const walletManager = new WalletManager();