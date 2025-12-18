/**
 * UI Management für Polkadot Quiz
 */

class QuizUI {
    constructor() {
        this.currentScreen = 'start';
        this.currentHintUsedThisQuestion = false;
        this.currentTimeAddUsedThisQuestion = false;
        this.eventListenersInitialized = false; // Verhindert Mehrfach-Registrierung
        this.countdownInterval = null; // Speichere Interval-ID für Cleanup
    }

    /**
     * Räumt alte Cache-Einträge auf (einmalig pro Session)
     * Entfernt Session Storage Keys mit altem Format: onchain_data_*
     */
    cleanupLegacyCache() {
        // Prüfe ob bereits durchgeführt
        if (sessionStorage.getItem('cacheCleanupDone')) {
            return;
        }

        let cleanedCount = 0;
        const keysToRemove = [];

        // Finde alle Keys mit altem Format (ohne Netzwerk-Präfix)
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.match(/^onchain_data_[^_]/)) {
                // Altes Format: onchain_data_5Dyv...
                // Neues Format: onchain_polkadot_5Dyv...
                keysToRemove.push(key);
            }
        }

        // Entferne gefundene Keys
        keysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
            cleanedCount++;
        });

        // Setze Flag
        sessionStorage.setItem('cacheCleanupDone', 'true');

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} legacy cache entries`);
        }
    }

    /**
     * Zeige spezifischen Screen
     */
    showScreen(screenName) {
        // Verstecke alle Screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });

        // Zeige gewünschten Screen
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.style.display = 'block';
            this.currentScreen = screenName;
        }
    }

    /**
     * Zeige Start-Screen
     */
    showStartScreen() {
        this.showScreen('start');
    }

    /**
     * Zeige Anleitung-Screen
     */
    showAnleitung() {
        this.showScreen('anleitung');

        // Zeige dynamische Levelanzahl
        const totalLevelsEl = document.getElementById('total-levels-count');
        if (totalLevelsEl && quizEngine.totalLevels) {
            totalLevelsEl.textContent = quizEngine.totalLevels;
        }

        // Event Listener für Zurück-Button
        const backBtn = document.getElementById('back-from-anleitung-btn');
        if (backBtn && !backBtn.hasAttribute('data-listener-added')) {
            backBtn.setAttribute('data-listener-added', 'true');
            backBtn.addEventListener('click', () => {
                // Wenn von Level-Übersicht aufgerufen, zurück zur Übersicht
                if (sessionStorage.getItem('walletAddress')) {
                    this.showLevelOverview();
                } else {
                    this.showWalletConnect();
                }
            });
        }
    }

    /**
     * Zeige Wallet-Connect Screen
     */
    async showWalletConnect() {
        this.showScreen('wallet-connect');

        // Verhindere Mehrfach-Registrierung von Event Listeners
        if (this.eventListenersInitialized) {
            console.log('✅ Event listeners already initialized, skipping re-registration');
            return;
        }

        console.log('🔧 Initializing event listeners (first time only)');
        this.eventListenersInitialized = true;

        // Auto-Cleanup alter Cache-Einträge (einmalig pro Session)
        this.cleanupLegacyCache();

        const connectBtn = document.getElementById('connect-wallet-btn');
        const statusDiv = document.getElementById('wallet-status');
        const accountsDiv = document.getElementById('accounts-list');
        const playerNameInput = document.getElementById('player-name-input');
        const continueBtn = document.getElementById('continue-to-quiz-btn');

        connectBtn.addEventListener('click', async () => {
            try {
                // Show status div now
                statusDiv.style.display = 'block';
                statusDiv.innerHTML = '<p>Connecting to wallet...</p>';

                const accounts = await walletManager.connect();

                statusDiv.innerHTML = '<p class="success">✅ Wallet connected! Choose an account:</p>';

                // Show accounts with converted addresses
                accountsDiv.innerHTML = '<p>🔄 Loading accounts...</p>';
                
                // Für jeden Account: Prüfe ob bekannt und konvertiere für Anzeige
                const accountsWithInfo = await Promise.all(
                    accounts.map(async (account) => {
                        const genericAddress = account.address; // Original = Primary Key
                        let polkadotAddress = genericAddress;
                        let existingPlayer = null;
                        
                        // Versuche zu konvertieren für Anzeige
                        try {
                            const convertResponse = await fetch('api/convert-address.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ address: genericAddress })
                            });
                            
                            const convertResult = await convertResponse.json();
                            if (convertResult.success) {
                                polkadotAddress = convertResult.polkadot.address;
                            }
                        } catch (error) {
                            console.warn('Conversion failed for', account.name);
                        }
                        
                        // Prüfe ob Account schon existiert
                        try {
                            const playerResponse = await fetch('api/get-player.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ walletAddress: genericAddress })
                            });
                            
                            const playerResult = await playerResponse.json();
                            if (playerResult.found && playerResult.player) {
                                existingPlayer = playerResult.player;
                            }
                        } catch (error) {
                            console.warn('Player lookup failed');
                        }
                        
                        return {
                            ...account,
                            genericAddress: genericAddress,      // Primary Key
                            polkadotAddress: polkadotAddress,    // Für Anzeige
                            existingPlayer: existingPlayer       // Wenn bekannt
                        };
                    })
                );
                
                // Zeige Accounts
                accountsDiv.innerHTML = '';
                accountsWithInfo.forEach(account => {
                    const accountBtn = document.createElement('button');
                    accountBtn.className = 'account-btn';
                    
                    // Zeige nur erste 12 Zeichen der Polkadot-Adresse
                    const shortAddress = account.polkadotAddress.substring(0, 12) + '...';
                    
                    accountBtn.innerHTML = `
                        <strong>${account.name || 'Unnamed'}</strong><br>
                        <small style="color: var(--primary-color);">${shortAddress}</small>
                    `;
                    
                    accountBtn.addEventListener('click', async () => {
                        // Markiere als ausgewählt
                        document.querySelectorAll('.account-btn').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        accountBtn.classList.add('selected');
                        
                        // Speichere Account mit GENERIC-Adresse
                        walletManager.selectAccount({
                            ...account,
                            address: account.genericAddress,           // Generic für Backend
                            polkadotAddress: account.polkadotAddress  // Polkadot für UI
                        });
                        
                        playerNameInput.style.display = 'block';
                        
                        // Entferne alte Buttons falls vorhanden
                        const oldButtons = document.getElementById('action-buttons');
                        if (oldButtons) oldButtons.remove();
                        
                        // If known player
                        if (account.existingPlayer) {
                            // Hide label and input (player is already known)
                            const nameLabel = document.querySelector('label[for="player-name"]');
                            if (nameLabel) {
                                nameLabel.style.display = 'none';
                            }

                            const nameInput = document.getElementById('player-name');
                            nameInput.style.display = 'none';
                            nameInput.value = account.existingPlayer.playerName;

                            // REMOVE original submit button completely
                            const originalSubmitBtn = document.getElementById('continue-to-quiz-btn');
                            if (originalSubmitBtn) {
                                originalSubmitBtn.remove();
                            }

                            // Single "Continue to Quiz" button (centered, full width)
                            const buttonsDiv = document.createElement('div');
                            buttonsDiv.id = 'action-buttons';
                            buttonsDiv.style.cssText = 'margin-top: 20px;';
                            buttonsDiv.innerHTML = `
                                <button id="continue-quiz-btn" type="button" style="width: 100%; padding: 15px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Continue to Quiz
                                </button>
                            `;

                            playerNameInput.appendChild(buttonsDiv);

                            // Event Listener
                            setTimeout(() => {
                                document.getElementById('continue-quiz-btn').addEventListener('click', async () => {
                                    // WICHTIG: Setze Session-Daten
                                    sessionStorage.setItem('walletAddress', account.genericAddress);
                                    sessionStorage.setItem('playerName', account.existingPlayer.playerName);
                                    sessionStorage.setItem('polkadotAddress', account.polkadotAddress);

                                    // Pre-Load On-Chain-Daten (Fire-and-Forget, blockiert nicht)
                                    this.loadOnChainData(account.genericAddress, false, 'polkadot').catch(err => {
                                        console.warn('On-chain data pre-loading failed:', err);
                                    });

                                    // Zeige Level-Übersicht
                                    this.showLevelOverview();
                                });
                            }, 0);
                            
                        } else {
                            // Neuer Spieler: Kein Name-Input, nur "Continue to Quiz" Button
                            // Name wird im Level Overview eingetragen
                            const nameLabel = document.querySelector('label[for="player-name"]');
                            if (nameLabel) {
                                nameLabel.style.display = 'none';
                            }

                            const nameInput = document.getElementById('player-name');
                            nameInput.style.display = 'none';

                            // ENTFERNE originalen Submit-Button komplett
                            const originalSubmitBtn = document.getElementById('continue-to-quiz-btn');
                            if (originalSubmitBtn) {
                                originalSubmitBtn.remove();
                            }

                            // NUR ein Button: "Continue to Quiz" (identisch zu bekannten Spielern)
                            const buttonsDiv = document.createElement('div');
                            buttonsDiv.id = 'action-buttons';
                            buttonsDiv.style.cssText = 'margin-top: 20px;';
                            buttonsDiv.innerHTML = `
                                <button id="continue-quiz-btn" type="button" style="width: 100%; padding: 15px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Continue to Quiz
                                </button>
                            `;

                            playerNameInput.appendChild(buttonsDiv);

                            // Event Listener OHNE Validierung/Registrierung
                            setTimeout(() => {
                                document.getElementById('continue-quiz-btn').addEventListener('click', async () => {
                                    // WICHTIG: Setze Session-Daten OHNE playerName
                                    sessionStorage.setItem('walletAddress', account.genericAddress);
                                    sessionStorage.setItem('polkadotAddress', account.polkadotAddress);
                                    // playerName wird NICHT gesetzt → Level Overview zeigt Name-Eingabe an

                                    // Pre-Load On-Chain-Daten (Fire-and-Forget, blockiert nicht)
                                    this.loadOnChainData(account.genericAddress, false, 'polkadot').catch(err => {
                                        console.warn('On-chain data pre-loading failed:', err);
                                    });

                                    // Zeige Level-Übersicht
                                    this.showLevelOverview();
                                });
                            }, 0);
                        }
                    });
                    accountsDiv.appendChild(accountBtn);
                });

            } catch (error) {
                statusDiv.innerHTML = `<p class="error">❌ ${error.message}</p>`;
            }
        });

        // Note: continueBtn wird in Account-Click-Handlern entfernt und durch continue-quiz-btn ersetzt
        // Der ursprüngliche Event-Handler ist nicht mehr erforderlich
    }

    /**
     * Rendere Player-Info mit Category-Badge (Account-Container)
     */
    renderPlayerInfo(playerData, playerName, walletAddress) {
        let displayAddress = walletAddress ? walletAddress.substring(0, 12) + '...' : '';

        if (playerData.polkadotAddress) {
            displayAddress = playerData.polkadotAddress.substring(0, 12) + '...';
        } else if (playerData.found && playerData.player && playerData.player.polkadotAddress) {
            displayAddress = playerData.player.polkadotAddress.substring(0, 12) + '...';
        }

        // Hole Badge (Shiro als Fallback für neue Spieler)
        const categoryObj = this.getPlayerBadge(playerData);

        // Badge HTML
        const badgeHTML = categoryObj
            ? `<img src="assets/img/categories/${categoryObj.catSymbol}"
                   alt="${categoryObj.catDescription}"
                   class="category-avatar-badge"
                   title="${categoryObj.catDescription}">`
            : '';

        // === vonFlandern Account Container ===
        document.getElementById('player-account-info').innerHTML = `
            <div class="vonflandern-account">
                <div class="account-badge-circle">
                    ${badgeHTML}
                </div>
                <div class="account-info-right">
                    <div class="player-name-display">${playerName || walletManager.selectedAccount?.name || 'Guest'}</div>
                    <div class="player-wallet-display">${displayAddress}</div>
                </div>
                <div class="account-menu">
                    <a href="#" id="account-menu-trigger">☰</a>
                    <div id="account-menu-dropdown" class="menu-dropdown" style="display: none;">
                        <a href="#" id="menu-logout">Log Out</a>
                        <a href="#" id="menu-change-name">Change Name</a>
                        <a href="#" id="menu-account-overview">Account Overview</a>
                        <a href="#" id="menu-anleitung">Instructions</a>
                    </div>
                </div>
            </div>
        `;

        // Badge-Container leeren (wird nicht mehr benötigt)
        const badgeContainer = document.getElementById('player-badge-container');
        if (badgeContainer) {
            badgeContainer.innerHTML = '';
        }

        // Rang-Info wird separat in showLevelOverview() durch renderLeaderboardInfo() gerendert
    }

    /**
     * Rendere Begrüßungstext oder Spielernamen-Eingabe
     */
    renderWelcomeSection(playerData, playerName) {
        const welcomeContainer = document.getElementById('welcome-section');
        if (!welcomeContainer) return;

        // FALL 1: Neuer Spieler (playerName ist null oder startet mit "Player_")
        if (!playerName || playerName.startsWith('Player_')) {
            welcomeContainer.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <label for="welcome-name-input" style="display: block; margin-bottom: 15px; font-size: 1.1em; font-weight: 600;">
                        Welcome! Please enter your player name:
                    </label>
                    <input
                        type="text"
                        id="welcome-name-input"
                        placeholder="Your name"
                        maxlength="20"
                        style="width: 100%; max-width: 300px; padding: 12px; font-size: 1em; border: 2px solid var(--border-color); border-radius: 6px; margin-bottom: 15px;"
                    />
                    <button id="welcome-save-name-btn" style="padding: 12px 30px; background: var(--primary-color); color: white; border: none; border-radius: 6px; font-size: 1em; font-weight: 600; cursor: pointer;">
                        Save Name
                    </button>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #6b7280;">
                        3-20 characters, must be unique
                    </p>
                </div>
            `;

            // Event-Handler für Speichern-Button
            this.initWelcomeNameSave();
            return;
        }

        // FALL 2: Bestehender Spieler
        const categoryObj = this.getPlayerBadge(playerData);
        const isSensei = categoryObj && categoryObj.catId === 8;

        const greeting = isSensei
            ? `Welcome, Sensei ${playerName}!`
            : `Welcome, ${playerName}!`;

        welcomeContainer.innerHTML = `
            <div style="text-align: center; font-size: 1.3em; font-weight: 600; margin-bottom: 20px;">
                ${greeting}
            </div>
        `;
    }

    /**
     * Initialisiere Event-Handler für Willkommens-Namenseingabe
     */
    initWelcomeNameSave() {
        const saveBtn = document.getElementById('welcome-save-name-btn');
        const nameInput = document.getElementById('welcome-name-input');

        if (!saveBtn || !nameInput) return;

        const handleSave = async () => {
            const newName = nameInput.value.trim();

            // Validierung
            if (!newName || newName.length < 3) {
                alert('❌ Name must be at least 3 characters!');
                return;
            }

            if (newName.length > 20) {
                alert('❌ Name must not exceed 20 characters!');
                return;
            }

            // Prüfe Eindeutigkeit
            try {
                const account = walletManager.selectedAccount;
                const checkResponse = await fetch('api/check-name.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playerName: newName,
                        walletAddress: account.address
                    })
                });

                const checkResult = await checkResponse.json();

                if (!checkResult.available) {
                    alert(`❌ The name "${newName}" is already taken!\n\nPlease choose a different name.`);
                    return;
                }

                // Speichere Namen
                const registerResponse = await fetch('api/register-player.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: account.address,
                        playerName: newName
                    })
                });

                if (!registerResponse.ok) {
                    const errorData = await registerResponse.json();
                    throw new Error(errorData.error || 'Update failed');
                }

                console.log('✅ Player name updated');

                // Update Session Storage
                sessionStorage.setItem('playerName', newName);

                // Update im Wallet Manager (WICHTIG: Auch für neue Spieler setzen!)
                if (walletManager.selectedAccount) {
                    if (!walletManager.selectedAccount.existingPlayer) {
                        // Neuer Spieler: Erstelle existingPlayer-Objekt
                        walletManager.selectedAccount.existingPlayer = {
                            playerName: newName,
                            genericAddress: walletManager.selectedAccount.address,
                            polkadotAddress: walletManager.selectedAccount.polkadotAddress || walletManager.selectedAccount.address
                        };
                    } else {
                        // Bestehender Spieler: Update Name
                        walletManager.selectedAccount.existingPlayer.playerName = newName;
                    }
                }

                // Reload Level-Übersicht
                this.showLevelOverview();

            } catch (error) {
                console.error('Name save error:', error);
                alert(`❌ Error saving: ${error.message}\n\nPlease try again.`);
            }
        };

        // Event-Listener
        saveBtn.addEventListener('click', handleSave);
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        });
    }

    /**
     * Rendere Leaderboard-Info (mit Link statt Button)
     */
    renderLeaderboardInfo(leaderboard, playerName, walletAddress) {
        const rankContainer = document.getElementById('player-rank-info');
        if (!rankContainer) return;

        // Wenn kein Leaderboard vorhanden, nichts anzeigen
        if (!leaderboard || leaderboard.length === 0) {
            rankContainer.innerHTML = '';
            return;
        }

        // Finde Spieler im Leaderboard
        const playerRank = leaderboard.find(p =>
            p.genericAddress === walletAddress ||
            p.polkadotAddress === walletAddress ||
            p.playerName === playerName
        );

        if (!playerRank) {
            rankContainer.innerHTML = '';
            return;
        }

        const rank = playerRank.rank;
        let rankEmoji = '';
        if (rank === 1) rankEmoji = '🥇 ';
        else if (rank === 2) rankEmoji = '🥈 ';
        else if (rank === 3) rankEmoji = '🥉 ';

        const formattedScore = new Intl.NumberFormat('en-US').format(playerRank.totalScore || 0);

        rankContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.1);">
                <div>
                    <strong style="color: var(--primary-color); font-size: 1.1em;">
                        ${rankEmoji}You are currently ranked ${rank} on the
                        <a href="leaderboard.php" target="_blank" style="color: var(--primary-color); text-decoration: underline; font-weight: 600;">
                            Leaderboard
                        </a>
                    </strong>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.5em; font-weight: bold; color: var(--primary-color);">${formattedScore} Points</div>
                    <div style="font-size: 0.9em; color: var(--text-color); margin-top: 5px;">Leaderboard Score</div>
                </div>
            </div>
        `;
    }

    /**
     * Hole Badge-Objekt für Spieler (mit Shiro als Fallback)
     */
    getPlayerBadge(playerData) {
        const currentCategory = playerData.player?.currentCategory || 0;

        // Fallback: Neue Spieler (currentCategory = 0) erhalten Shiro-Badge (catId 1)
        const badgeCatId = currentCategory > 0 ? currentCategory : 1;

        return quizEngine.getCategoryById(badgeCatId);
    }

    /**
     * Wende kategorie-spezifisches Design auf Account-Bereich an
     * Setzt CSS-Variablen basierend auf der aktuellen Spieler-Kategorie
     * @param {Object} playerData - Spielerdaten mit currentCategory
     */
    applyAccountDesign(playerData) {
        // Ermittle aktuelle Kategorie (Fallback: Shiro für neue Spieler)
        const currentCategory = playerData.player?.currentCategory || 0;
        const categoryId = currentCategory > 0 ? currentCategory : 1;

        // Lade Kategorie-Objekt
        const categoryObj = quizEngine.getCategoryById(categoryId);

        if (!categoryObj || !categoryObj.designSettings || !categoryObj.designSettings.account) {
            console.warn(`[UI] No design settings found for category ${categoryId}, using fallback`);
            return; // Verwende CSS-Fallback-Werte
        }

        const accountDesign = categoryObj.designSettings.account;
        const root = document.documentElement;

        try {
            // Header-Design
            if (accountDesign.header) {
                root.style.setProperty('--account-header-color-left', accountDesign.header.colorLeft);
                root.style.setProperty('--account-header-color-right', accountDesign.header.colorRight);
                root.style.setProperty('--account-header-border', accountDesign.header.colorBorder);
            }

            // Header-Text
            if (accountDesign.headerText) {
                root.style.setProperty('--account-text-name', accountDesign.headerText.colorName);
                root.style.setProperty('--account-text-wallet', accountDesign.headerText.colorWallet);
            }

            // Badge-Hintergrund
            if (accountDesign.headerBadge) {
                root.style.setProperty('--account-badge-background', accountDesign.headerBadge.colorBackground);
            }

            // Hamburger-Menü
            if (accountDesign.headerMenu) {
                root.style.setProperty('--account-menu-hamburger', accountDesign.headerMenu.colorHamburger);
            }

            // Body-Design (vorbereitet für zukünftige Erweiterung)
            if (accountDesign.body) {
                root.style.setProperty('--account-body-background', accountDesign.body.colorBackground);
                root.style.setProperty('--account-body-border', accountDesign.body.colorBorder);
            }

            console.log(`[UI] Account design applied for category "${categoryObj.catDescription}"`);
        } catch (error) {
            console.error('[UI] Error applying account design:', error);
        }
    }

    /**
     * Initialisiere Account-Menü (Hamburger-Dropdown)
     */
    initAccountMenu() {
        const menuTrigger = document.getElementById('account-menu-trigger');
        const menuDropdown = document.getElementById('account-menu-dropdown');

        if (!menuTrigger || !menuDropdown) return;

        // Toggle Menü
        menuTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            const isVisible = menuDropdown.style.display === 'block';
            menuDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Click außerhalb schließt Menü
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.account-menu')) {
                menuDropdown.style.display = 'none';
            }
        });

        // Menü-Optionen
        document.getElementById('menu-logout').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        document.getElementById('menu-change-name').addEventListener('click', (e) => {
            e.preventDefault();
            menuDropdown.style.display = 'none';
            const account = walletManager.selectedAccount;
            this.openChangeNameModal(account);
        });

        document.getElementById('menu-account-overview').addEventListener('click', (e) => {
            e.preventDefault();
            menuDropdown.style.display = 'none';
            this.showAccountOverview();
        });

        document.getElementById('menu-anleitung').addEventListener('click', (e) => {
            e.preventDefault();
            menuDropdown.style.display = 'none';
            this.showAnleitung();
        });
    }

    /**
     * Gruppiere Level nach Kategorien
     */
    groupLevelsByCategory(questions) {
        const grouped = {};

        Object.keys(questions).forEach(levelKey => {
            const levelData = questions[levelKey];
            const levelNum = parseInt(levelKey.replace('level', ''));
            const catId = levelData.catId;

            if (!grouped[catId]) {
                grouped[catId] = [];
            }
            grouped[catId].push(levelNum);
        });

        // Sortiere Level innerhalb jeder Kategorie
        Object.keys(grouped).forEach(catId => {
            grouped[catId].sort((a, b) => a - b);
        });

        return grouped;
    }

    /**
     * Erstelle Level-Button
     */
    createLevelButton(levelNum, questions, playerLevels, highestUnlockedLevel) {
        const levelKey = `level${levelNum}`;
        const levelData = questions[levelKey];

        if (!levelData) {
            const emptyBtn = document.createElement('button');
            emptyBtn.className = 'level-btn level-btn-locked';
            emptyBtn.disabled = true;
            emptyBtn.innerHTML = `<h3>🔒 Level ${levelNum}: Coming Soon</h3>`;
            return emptyBtn;
        }

        const isUnlocked = levelNum === 1 || highestUnlockedLevel >= (levelNum - 1);
        const levelStats = playerLevels[levelNum] || playerLevels[levelNum.toString()];
        const isLevelUnlocked = levelStats?.unlocked || levelStats?.firstAttempt?.passed || false;

        const levelTitle = this.getLevelTitle(levelNum, levelData);
        const questionCount = levelData.questions?.length || 0;

        // Score-Info
        let scoreInfo = '';
        if (levelStats) {
            const firstScore = levelStats.firstAttempt?.score;
            const bestScore = levelStats.bestAttempt?.score;
            const attempts = levelStats.attempts || 1;

            if (firstScore !== undefined) {
                scoreInfo = `<br><small>`;
                if (levelStats.unlocked || levelStats.firstAttempt?.passed) {
                    scoreInfo += `✓ Passed (1st attempt) • ${firstScore} Points`;
                } else {
                    scoreInfo += `✗ Not passed (1st attempt) • ${firstScore} Points`;
                }

                if (attempts > 1 && bestScore !== firstScore) {
                    scoreInfo += `<br>🔄 ${attempts} Attempts • Best: ${bestScore} Points`;
                }
                scoreInfo += `</small>`;
            }
        }

        const levelBtn = document.createElement('button');

        if (!isUnlocked) {
            levelBtn.className = 'level-btn level-btn-locked';
            levelBtn.disabled = true;
            levelBtn.innerHTML = `
                <h3>🔒 Level ${levelNum}: ${levelTitle}</h3>
                <p>${questionCount} Questions • Complete Level ${levelNum - 1}</p>
            `;
        } else {
            levelBtn.className = `level-btn ${isLevelUnlocked ? 'level-btn-completed' : ''}`;
            levelBtn.innerHTML = `
                <h3>${isLevelUnlocked ? '✓' : '○'} Level ${levelNum}: ${levelTitle}</h3>
                <p>${questionCount} Questions${scoreInfo}</p>
            `;
            levelBtn.addEventListener('click', () => {
                this.showLevelIntro(levelNum);
            });
        }

        return levelBtn;
    }

    /**
     * Toggle Category Expand/Collapse
     */
    toggleCategory(catId) {
        const container = document.querySelector(`[data-cat-id="${catId}"]`);
        if (!container) return;

        const isExpanded = container.classList.contains('expanded');

        if (isExpanded) {
            container.classList.remove('expanded');
            container.classList.add('collapsed');

            const icon = container.querySelector('.category-toggle-icon');
            if (icon) icon.textContent = '▶';
        } else {
            container.classList.remove('collapsed');
            container.classList.add('expanded');

            const icon = container.querySelector('.category-toggle-icon');
            if (icon) icon.textContent = '▼';
        }
    }

    /**
     * Rendere Level gruppiert nach Kategorien
     */
    renderLevelsByCategory(playerData, totalLevels, questions) {
        const levelsContainer = document.getElementById('levels-list');
        levelsContainer.innerHTML = '';

        const playerLevels = playerData.player?.levels || {};

        // Bestimme höchstes freigeschaltetes Level
        const unlockedLevels = [];
        Object.keys(playerLevels).forEach(levelKey => {
            const levelNum = parseInt(levelKey);
            const levelStats = playerLevels[levelKey];

            if (levelStats.unlocked || levelStats.firstAttempt?.passed) {
                unlockedLevels.push(levelNum);
            }
        });
        const highestUnlockedLevel = unlockedLevels.length > 0
            ? Math.max(...unlockedLevels)
            : 0;

        // Finde Kategorie die standardmäßig aufgeklappt sein soll
        // = Kategorie des nächsten spielbaren Levels
        let expandedCategoryId = null;
        let nextPlayableLevel = highestUnlockedLevel + 1;

        // Für neue Spieler (keine bestandenen Level) ist Level 1 das nächste
        if (nextPlayableLevel < 1) {
            nextPlayableLevel = 1;
        }

        // Hole Kategorie des nächsten spielbaren Levels
        const categoryForNextLevel = quizEngine.getCategoryForLevel(nextPlayableLevel);
        expandedCategoryId = categoryForNextLevel?.catId || null;

        // Fallback: Wenn kein nächstes Level existiert, nutze Kategorie des letzten bestandenen
        if (!expandedCategoryId && highestUnlockedLevel > 0) {
            const categoryForHighestLevel = quizEngine.getCategoryForLevel(highestUnlockedLevel);
            expandedCategoryId = categoryForHighestLevel?.catId || null;
        }

        // Fallback 2: Wenn immer noch keine Kategorie, öffne die erste (Shiro)
        if (!expandedCategoryId) {
            expandedCategoryId = 1;
        }

        // Gruppiere Level nach Kategorien
        const levelsByCategory = this.groupLevelsByCategory(questions);

        // Bestimme welche Kategorien angezeigt werden sollen
        const visibleCategoryIds = this.getVisibleCategories(
            levelsByCategory,
            playerLevels,
            nextPlayableLevel
        );

        // Für jede Kategorie: Erstelle Container (nur wenn sichtbar)
        quizEngine.categories.forEach(category => {
            const levelsInCategory = levelsByCategory[category.catId] || [];

            if (levelsInCategory.length === 0) {
                return; // Kategorie hat keine Level
            }

            // Überspringe nicht-sichtbare Kategorien
            if (!visibleCategoryIds.includes(category.catId)) {
                return;
            }

            // Prüfe ob Kategorie standardmäßig aufgeklappt sein soll
            const isExpanded = category.catId === expandedCategoryId;

            // Erstelle Category-Container
            const categoryContainer = document.createElement('div');
            categoryContainer.className = `category-container ${isExpanded ? 'expanded' : 'collapsed'}`;
            categoryContainer.setAttribute('data-cat-id', category.catId);

            // Category Header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.style.background = `linear-gradient(90deg, ${category.catColor}20 0%, ${category.catColor}10 100%)`;
            categoryHeader.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="assets/img/categories/${category.catSymbol}"
                         alt="${category.catDescription}"
                         class="category-icon">
                    <strong>${category.catDescription}</strong>
                    <span class="category-level-count">${levelsInCategory.length} Level</span>
                </div>
                <span class="category-toggle-icon">${isExpanded ? '▼' : '▶'}</span>
            `;

            // Click-Handler für Toggle
            categoryHeader.addEventListener('click', () => {
                this.toggleCategory(category.catId);
            });

            // Category Content (Level-Liste)
            const categoryContent = document.createElement('div');
            categoryContent.className = 'category-content';

            // Level-Buttons rendern
            levelsInCategory.forEach(levelNum => {
                const levelBtn = this.createLevelButton(
                    levelNum,
                    questions,
                    playerLevels,
                    highestUnlockedLevel
                );
                categoryContent.appendChild(levelBtn);
            });

            // Zusammenbauen
            categoryContainer.appendChild(categoryHeader);
            categoryContainer.appendChild(categoryContent);
            levelsContainer.appendChild(categoryContainer);
        });
    }

    /**
     * Bestimme welche Kategorien sichtbar sein sollen
     * Regel: Abgeschlossene + Aktuelle + Nächste Kategorie
     */
    getVisibleCategories(levelsByCategory, playerLevels, nextPlayableLevel) {
        const visibleCategories = new Set();

        // Hole Kategorie des nächsten spielbaren Levels (= aktuelle Kategorie)
        const currentCategory = quizEngine.getCategoryForLevel(nextPlayableLevel);
        const currentCatId = currentCategory?.catId || 1;

        // Durchlaufe alle Kategorien und prüfe ihren Status
        quizEngine.categories.forEach(category => {
            const catId = category.catId;
            const levelsInCategory = levelsByCategory[catId] || [];

            if (levelsInCategory.length === 0) {
                return; // Kategorie hat keine Level
            }

            // Prüfe ob Kategorie komplett abgeschlossen ist
            const allLevelsCompleted = levelsInCategory.every(levelNum => {
                const levelKey = levelNum.toString();
                const levelStats = playerLevels[levelNum] || playerLevels[levelKey];
                return levelStats?.unlocked || levelStats?.firstAttempt?.passed || false;
            });

            // Kategorie anzeigen wenn:
            // 1. Komplett abgeschlossen
            // 2. Ist aktuelle Kategorie (enthält nächstes spielbares Level)
            // 3. Ist die Kategorie nach der aktuellen
            if (allLevelsCompleted) {
                visibleCategories.add(catId); // Abgeschlossene Kategorie
            } else if (catId === currentCatId) {
                visibleCategories.add(catId); // Aktuelle Kategorie
            } else if (catId === currentCatId + 1) {
                visibleCategories.add(catId); // Nächste Kategorie
            }
        });

        return Array.from(visibleCategories);
    }

    /**
     * Zeige Level-Übersicht
     */
    async showLevelOverview() {
        this.showScreen('level-overview');

        const walletAddress = sessionStorage.getItem('walletAddress');
        const playerName = sessionStorage.getItem('playerName');

        // Background-Refresh für On-Chain-Daten starten (nur einmal)
        if (onChainService.isConnected && !onChainService.refreshTimerId) {
            onChainService.startAutoRefresh(() => {
                const address = sessionStorage.getItem('walletAddress');
                if (address) {
                    this.loadOnChainData(address, true, 'polkadot').catch(err => {
                        console.warn('Background refresh failed:', err);
                    });
                }
            });
        }

        try {
            const playerData = await quizEngine.loadPlayer(walletAddress);

            // Lade Leaderboard für Rang
            const leaderboardData = await quizEngine.loadLeaderboard(100);
            const leaderboard = leaderboardData?.leaderboard || [];

            // === WICHTIG: Design ZUERST anwenden, DANN rendern ===
            // CSS-Variablen müssen gesetzt sein, bevor HTML eingefügt wird
            this.applyAccountDesign(playerData);

            // Player-Info mit Badge rendern (Account-Container)
            this.renderPlayerInfo(playerData, playerName, walletAddress);

            // Account-Menü initialisieren
            this.initAccountMenu();

            // Begrüßungstext oder Namenseingabe rendern
            this.renderWelcomeSection(playerData, playerName);

            // Leaderboard-Info separat rendern (mit Link statt Button)
            this.renderLeaderboardInfo(leaderboard, playerName, walletAddress);

            // Questions laden (totalLevels wird aus quizEngine geholt)
            const questionsResponse = await fetch('data/questions.json');
            const questions = await questionsResponse.json();

            // Level nach Kategorien gruppiert rendern
            this.renderLevelsByCategory(playerData, quizEngine.totalLevels, questions);

        } catch (error) {
            console.error('Error loading player:', error);
            document.getElementById('player-info').innerHTML = `
                <div style="color: #ef4444;">
                    Error loading player data. Please log in again.
                </div>
            `;
        }
    }

    /**
     * Logout
     */
    async logout() {
        // OnChain-Service disconnecten und Background-Refresh stoppen
        if (onChainService && onChainService.isConnected) {
            await onChainService.disconnect();
        }

        // Lösche Session Storage (inkl. On-Chain-Daten)
        sessionStorage.clear();
        walletManager.selectedAccount = null;
        walletManager.extension = null;
        
        // Hard Reload (wie Strg+Shift+R)
        location.reload(true);
    }

    /**
     * Extrahiere Level-Titel aus Level-Daten
     */
    getLevelTitle(levelNumber, levelData) {
        // Prüfe zuerst ob levelTitle in levelData vorhanden ist
        if (levelData && levelData.levelTitle) {
            return levelData.levelTitle;
        }

        // Fallback zu generischem Titel
        return `Level ${levelNumber}`;
    }

    /**
     * Zeige Level-Intro
     */
    showLevelIntro(levelNumber) {
        this.showScreen('level-intro');

        const level = quizEngine.questions[`level${levelNumber}`];
        
        document.getElementById('level-intro-title').textContent = `Level ${levelNumber}`;
        document.getElementById('level-intro-info').textContent = level.levelInfo;
        document.getElementById('level-questions-count').textContent = level.questions.length;
        document.getElementById('level-min-correct').textContent = level.minCorrect;
        document.getElementById('level-hints-count').textContent = level.hintCount;
        document.getElementById('level-timeadds-count').textContent = level.timeAddCount;

        // PDF-Download anzeigen wenn verfügbar
        const pdfDownloadDiv = document.getElementById('level-pdf-download');
        const pdfLink = document.getElementById('level-pdf-link');
        const pdfTitle = document.getElementById('level-pdf-title');

        if (level.pdfUrl && level.pdfTitle) {
            pdfDownloadDiv.style.display = 'block';
            pdfLink.href = level.pdfUrl;
            pdfTitle.textContent = level.pdfTitle;
        } else {
            pdfDownloadDiv.style.display = 'none';
        }

        // WICHTIG: Entferne alte Event Listener durch Klonen
        const startBtn = document.getElementById('start-level-btn');
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);
        
        // Setze neuen Event Listener
        newStartBtn.onclick = () => {
            console.log('🎮 Level start button clicked');
            this.startCountdown(levelNumber);
        };
    }

    /**
     * Countdown vor Level-Start (ROBUST)
     */
    startCountdown(levelNumber) {
        console.log('🎬 Starting countdown for level', levelNumber);

        // KRITISCH: Cleane ALLE bestehenden Intervals
        // Manchmal können mehrere Intervals existieren durch Doppelklicks
        if (this.countdownInterval) {
            console.log('⚠️ Clearing existing countdown interval');
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // Zeige Countdown-Screen
        this.showScreen('countdown');

        // Starte bei 5
        let count = 5;

        // Hole Element
        const countdownEl = document.getElementById('countdown-number');

        // Funktion zum Aktualisieren der Zahl
        const updateCountdown = () => {
            countdownEl.textContent = count;
            console.log(`⏱️ Countdown: ${count}`);
        };

        // Zeige initiale "5" SOFORT
        updateCountdown();

        // Starte Interval mit exakt 1 Sekunde
        this.countdownInterval = setInterval(() => {
            count--;

            if (count > 0) {
                // Zeige nächste Zahl
                updateCountdown();

            } else {
                // Bei 0: Cleanup und Start
                console.log('🚀 Countdown finished, starting level');
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                this.startLevel(levelNumber);
            }
        }, 1000);
    }

    /**
     * Starte Level
     */
    async startLevel(levelNumber) {
        quizEngine.startLevel(levelNumber);
        this.currentLevelNumber = levelNumber;
        this.showQuestion();
    }

    /**
     * Zeige Frage
     */
    showQuestion() {
        this.showScreen('question');

        this.currentHintUsedThisQuestion = false;
        this.currentTimeAddUsedThisQuestion = false;

        const question = quizEngine.getCurrentQuestion();
        const questionNumber = quizEngine.currentQuestionIndex + 1;
        const totalQuestions = quizEngine.currentLevel.questions.length;

        // Hint-Box verstecken (wichtig für nächste Frage!)
        const hintBox = document.getElementById('hint-box');
        hintBox.style.display = 'none';
        hintBox.innerHTML = '';

        // Update Header
        document.getElementById('question-number').textContent =
            `Question ${questionNumber}/${totalQuestions}`;
        document.getElementById('current-score').textContent =
            `Points: ${quizEngine.levelState.score}`;

        // Frage anzeigen
        document.getElementById('question-text').textContent = question.question;

        // Antworten anzeigen
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = '';
        question.answers.forEach((answer, index) => {
            const answerBtn = document.createElement('button');
            answerBtn.className = 'answer-btn';
            answerBtn.textContent = answer;
            answerBtn.addEventListener('click', () => {
                this.selectAnswer(index);
            });
            answersContainer.appendChild(answerBtn);
        });

        // Power-Ups anzeigen
        document.getElementById('hints-remaining').textContent = 
            quizEngine.levelState.hintsRemaining;
        document.getElementById('timeadds-remaining').textContent = 
            quizEngine.levelState.timeAddsRemaining;

        // Hint Button
        const hintBtn = document.getElementById('hint-btn');
        hintBtn.disabled = quizEngine.levelState.hintsRemaining === 0 || this.currentHintUsedThisQuestion;
        hintBtn.onclick = () => this.showHint();

        // TimeAdd Button
        const timeAddBtn = document.getElementById('timeadd-btn');
        timeAddBtn.disabled = quizEngine.levelState.timeAddsRemaining === 0;
        timeAddBtn.onclick = () => this.useTimeAdd();

        // Timer starten
        this.startTimer();
    }

    /**
     * Starte Timer
     */
    startTimer() {
        const timerDisplay = document.getElementById('timer-display');
        
        quizEngine.startQuestionTimer(
            (elapsed, remaining) => {
                // Update Timer Display
                timerDisplay.textContent = quizEngine.timer.formatTimeShort(remaining);
                
                // Warnung bei wenig Zeit
                if (remaining < 5000) {
                    timerDisplay.classList.add('warning');
                } else {
                    timerDisplay.classList.remove('warning');
                }
            },
            () => {
                // Timeout
                this.selectAnswer(-1); // -1 = Timeout
            }
        );
    }

    /**
     * Zeige Hint
     */
    showHint() {
        const result = quizEngine.useHint();
        
        if (result.success) {
            this.currentHintUsedThisQuestion = true;
            const hintBox = document.getElementById('hint-box');
            hintBox.innerHTML = `<strong>💡 Hint:</strong> ${result.hint}`;
            hintBox.style.display = 'block';
            
            document.getElementById('hints-remaining').textContent = result.remaining;
            // Button deaktivieren (kein weiterer Hint für diese Frage)
            document.getElementById('hint-btn').disabled = true;
        } else {
            alert(result.message);
        }
    }

    /**
     * Nutze TimeAdd
     */
    useTimeAdd() {
        const result = quizEngine.useTimeAdd();
        
        if (result.success) {
            this.currentTimeAddUsedThisQuestion = true;
            
            // Visuelles Feedback statt Alert (nicht blockierend!)
            this.showTimeAddFeedback(result.bonusTime);
            
            document.getElementById('timeadds-remaining').textContent = result.remaining;
            document.getElementById('timeadd-btn').disabled = result.remaining === 0;
        } else {
            // Nur bei Fehler kurze Meldung
            this.showTimeAddFeedback(result.message, true);
        }
    }
    
    /**
     * Zeige visuelles Feedback für TimeAdd (nicht blockierend)
     */
    showTimeAddFeedback(message, isError = false) {
        // Erstelle Feedback-Element
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: ${isError ? '#ef4444' : 'var(--success-color)'};
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        feedback.textContent = isError ? message : `⏰ +${message} Seconds!`;
        
        document.body.appendChild(feedback);
        
        // Animation: Fade in + scale up
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
        
        // Animation: Fade out nach 1.5s
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translate(-50%, -50%) scale(0.8)';
        }, 1500);
        
        // Entfernen nach Animation
        setTimeout(() => {
            feedback.remove();
        }, 1800);
    }

    /**
     * Antwort auswählen
     */
    selectAnswer(answerIndex) {
        // Deaktiviere alle Buttons
        document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
        document.getElementById('hint-btn').disabled = true;
        document.getElementById('timeadd-btn').disabled = true;

        // Pass hint/timeAdd usage flags to quiz engine for accurate point calculation
        const result = quizEngine.answerQuestion(
            answerIndex,
            this.currentHintUsedThisQuestion,
            this.currentTimeAddUsedThisQuestion
        );
        this.showFeedback(result);
    }

    /**
     * Zeige Feedback
     */
    showFeedback(result) {
        this.showScreen('feedback');

        const feedbackEl = document.getElementById('feedback-message');
        const pointsEl = document.getElementById('feedback-points');
        const timeEl = document.getElementById('feedback-time');
        const explanationEl = document.getElementById('feedback-explanation');

        // Entferne alte Breakdown falls vorhanden
        const oldBreakdown = document.getElementById('points-breakdown');
        if (oldBreakdown) {
            oldBreakdown.remove();
        }

        if (result.timeout) {
            feedbackEl.innerHTML = '⏱️ <strong>Time\'s up!</strong>';
            feedbackEl.className = 'feedback-message timeout';
            pointsEl.textContent = '0 Points';
        } else if (result.correct) {
            feedbackEl.innerHTML = '✅ <strong>Correct!</strong>';
            feedbackEl.className = 'feedback-message correct';
            pointsEl.textContent = `+${result.points} Points`;
        } else {
            feedbackEl.innerHTML = '❌ <strong>Unfortunately wrong!</strong>';
            feedbackEl.className = 'feedback-message incorrect';
            // Zeige auch negative Punkte korrekt
            pointsEl.textContent = result.points >= 0 ? `${result.points} Points` : `${result.points} Points`;
        }

        // Zeige detaillierte Punkt-Aufschlüsselung (bei ALLEN Antworten, falls Power-Ups verwendet wurden)
        if (result.pointsBreakdown && !result.timeout) {
            const breakdown = result.pointsBreakdown;

            // Zeige Breakdown wenn: Power-Ups verwendet ODER Basis-Punkte > 0
            const showBreakdown = breakdown.hintUsed || breakdown.timeAddUsed || breakdown.basePoints > 0;

            if (showBreakdown) {
                const breakdownEl = document.createElement('div');
                breakdownEl.id = 'points-breakdown';

                // Unterschiedliche Border-Farbe für korrekt/falsch
                const borderColor = result.correct ? 'var(--success-color)' : '#ef4444';

                breakdownEl.style.cssText = `
                    margin: 20px auto;
                    max-width: 500px;
                    padding: 15px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9));
                    border-left: 4px solid ${borderColor};
                    border-radius: 8px;
                    font-size: 0.95em;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                `;

                let html = '<div style="font-weight: 600; color: #1f2937; margin-bottom: 10px;">📊 Points Breakdown:</div>';
                html += '<div style="display: flex; flex-direction: column; gap: 8px;">';

                // Basis-Punkte (kann 0 sein bei falscher Antwort)
                const baseColor = breakdown.basePoints > 0 ? 'var(--success-color)' : '#6b7280';
                html += `<div style="display: flex; justify-content: space-between; padding: 6px 0;">
                    <span>Question Base Points:</span>
                    <span style="font-weight: 600; color: ${baseColor};">${breakdown.basePoints > 0 ? '+' : ''}${breakdown.basePoints}</span>
                </div>`;

                // Hint-Penalty (falls verwendet)
                if (breakdown.hintUsed) {
                    html += `<div style="display: flex; justify-content: space-between; padding: 6px 0;">
                        <span>Used Hints (1x):</span>
                        <span style="font-weight: 600; color: #f97316;">-${breakdown.hintPenalty}</span>
                    </div>`;
                }

                // TimeAdd-Penalty (falls verwendet)
                if (breakdown.timeAddUsed) {
                    html += `<div style="display: flex; justify-content: space-between; padding: 6px 0;">
                        <span>Added Time (1x):</span>
                        <span style="font-weight: 600; color: #f97316;">-${breakdown.timeAddPenalty}</span>
                    </div>`;
                }

                // Trennlinie + Finalsumme
                const resultColor = result.points >= 0 ? 'var(--primary-color)' : '#ef4444';
                const resultSign = result.points > 0 ? '+' : '';
                html += `<div style="border-top: 2px solid rgba(0,0,0,0.1); margin-top: 8px; padding-top: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 1.1em;">
                        <span style="font-weight: 700;">RESULT:</span>
                        <span style="font-weight: 700; color: ${resultColor};">${resultSign}${result.points} Points</span>
                    </div>
                </div>`;

                html += '</div>';
                breakdownEl.innerHTML = html;

                // Füge nach pointsEl ein
                pointsEl.parentNode.insertBefore(breakdownEl, pointsEl.nextSibling);
            }
        }

        timeEl.textContent = `Time: ${(result.elapsedTimeMs / 1000).toFixed(3)}s`;

        const question = quizEngine.getCurrentQuestion();
        const correctAnswerText = question.answers[result.correctAnswer];
        explanationEl.innerHTML = `
            <p><strong>Correct Answer:</strong> ${correctAnswerText}</p>
            <p>${result.explanation}</p>
        `;

        const nextBtn = document.getElementById('next-question-btn');
        nextBtn.onclick = () => {
            if (quizEngine.nextQuestion()) {
                this.showQuestion();
            } else {
                this.showLevelComplete();
            }
        };
    }

    /**
     * Zeige Level-Abschluss
     */
    async showLevelComplete() {
        this.showScreen('level-complete');

        const result = quizEngine.calculateLevelResult();

        document.getElementById('result-correct').textContent = 
            `${result.correctAnswers}/${result.totalQuestions}`;
        document.getElementById('result-score').textContent = result.score;
        document.getElementById('result-time').textContent = 
            `${Math.floor(result.time / 60)}:${String(result.time % 60).padStart(2, '0')}`;

        const statusEl = document.getElementById('result-status');
        if (result.passed) {
            statusEl.innerHTML = '✅ <strong>Level passed!</strong>';
            statusEl.className = 'result-status passed';
        } else {
            statusEl.innerHTML = '❌ <strong>Level not passed</strong>';
            statusEl.className = 'result-status failed';
        }

        // Speichere Ergebnis
        try {
            const walletAddress = sessionStorage.getItem('walletAddress');
            const playerName = sessionStorage.getItem('playerName');
            
            await quizEngine.saveLevelResult(walletAddress, playerName, this.currentLevelNumber);
            
            console.log('✅ Level result saved successfully');
            
        } catch (error) {
            console.error('Error saving result:', error);
            
            // Zeige Fehler dem User
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background:#fee2e2;padding:15px;border-left:4px solid #ef4444;margin:20px 0;border-radius:4px;';
            errorDiv.innerHTML = `
                <strong>⚠️ Error saving</strong><br>
                <small>Your result could not be saved. Please try again.</small>
            `;
            statusEl.parentNode.insertBefore(errorDiv, statusEl.nextSibling);
        }

        const backBtn = document.getElementById('back-to-overview-btn');
        backBtn.onclick = () => {
            this.showLevelOverview();
        };
    }

    /**
     * Öffne Modal zum Ändern des Spielernamens
     */
    openChangeNameModal(account) {
        const modal = document.getElementById('change-name-modal');
        const input = document.getElementById('modal-player-name-input');
        const saveBtn = document.getElementById('modal-save-name-btn');
        const cancelBtn = document.getElementById('modal-cancel-name-btn');
        
        // Setze aktuellen Namen
        input.value = account.existingPlayer.playerName;
        
        // Zeige Modal
        modal.style.display = 'flex';
        input.focus();
        input.select();
        
        // Speichern Button
        const handleSave = async () => {
            const newName = input.value.trim();
            
            // Validierung: 3-20 Zeichen
            if (!newName || newName.length < 3) {
                alert('❌ Name must be at least 3 characters!');
                return;
            }

            if (newName.length > 20) {
                alert('❌ Name must not exceed 20 characters!');
                return;
            }
            
            // Prüfe ob Name geändert wurde
            if (newName === account.existingPlayer.playerName) {
                modal.style.display = 'none';
                return;
            }
            
            // Prüfe Eindeutigkeit
            try {
                const checkResponse = await fetch('api/check-name.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        playerName: newName,
                        walletAddress: account.genericAddress
                    })
                });
                
                const checkResult = await checkResponse.json();
                
                if (!checkResult.available) {
                    alert(`❌ The name "${newName}" is already taken!\n\nPlease choose a different name.`);
                    return;
                }
            } catch (error) {
                console.error('Name check failed:', error);
                alert('⚠️ Could not check name availability. Try again when saving the level.');
            }
            
            // Speichere Namensänderung
            try {
                const registerResponse = await fetch('api/register-player.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: account.genericAddress,
                        playerName: newName
                    })
                });
                
                if (!registerResponse.ok) {
                    const errorData = await registerResponse.json();
                    throw new Error(errorData.error || 'Update failed');
                }
                
                console.log('✅ Player name updated');
                
                // Update überall
                document.getElementById('player-name').value = newName;
                sessionStorage.setItem('playerName', newName);
                
                // Update Label
                const nameLabel = document.querySelector('label[for="player-name"]');
                if (nameLabel) {
                    nameLabel.innerHTML = `<strong style="color: #374151; font-size: 1.3em;">Welcome back, ${newName}!</strong>`;
                }
                
                // Update im Wallet Manager
                if (walletManager.selectedAccount) {
                    walletManager.selectedAccount.existingPlayer.playerName = newName;
                }

                // Schließe Modal
                modal.style.display = 'none';

                // Aktualisiere Level-Übersicht (damit neuer Name angezeigt wird)
                this.showLevelOverview();
                
            } catch (error) {
                console.error('Player name update error:', error);
                alert(`❌ Error saving: ${error.message}\n\nPlease try again.`);
            }
        };
        
        // Abbrechen Button
        const handleCancel = () => {
            modal.style.display = 'none';
        };
        
        // ESC-Taste
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
            }
        };
        
        // Enter-Taste im Input
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        };
        
        // Entferne alte Event Listener
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        
        // Neue Referenzen holen
        const newSaveBtn = document.getElementById('modal-save-name-btn');
        const newCancelBtn = document.getElementById('modal-cancel-name-btn');
        
        // Event Listeners hinzufügen
        newSaveBtn.addEventListener('click', handleSave);
        newCancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keydown', handleEnter);
        document.addEventListener('keydown', handleEsc);
        
        // Cleanup wenn Modal geschlossen wird
        const cleanup = () => {
            document.removeEventListener('keydown', handleEsc);
            input.removeEventListener('keydown', handleEnter);
        };
        
        // Cleanup nach Modal-Schließung
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                cleanup();
            }
        });
    }

    /**
     * Zeigt Account Overview Screen mit On-Chain-Daten
     */
    async showAccountOverview() {
        this.showScreen('account-overview');

        const walletAddress = sessionStorage.getItem('walletAddress');
        const playerName = sessionStorage.getItem('playerName');
        const polkadotAddress = sessionStorage.getItem('polkadotAddress');
        const network = 'polkadot'; // Aktuell nur Polkadot

        if (!walletAddress) {
            console.error('No wallet address in session');
            return;
        }

        try {
            // Player-Daten laden für Header
            const playerData = await quizEngine.loadPlayer(walletAddress);

            // Design anwenden
            this.applyAccountDesign(playerData);

            // Header rendern (gleiche Struktur wie Level Overview)
            const displayAddress = polkadotAddress ? 
                `${polkadotAddress.substring(0, 6)}...${polkadotAddress.substring(polkadotAddress.length - 6)}` : 
                walletAddress.substring(0, 12);

            const categoryObj = this.getPlayerBadge(playerData);
            const badgeHTML = categoryObj
                ? `<img src="assets/img/categories/${categoryObj.catSymbol}"
                       alt="${categoryObj.catDescription}"
                       class="category-avatar-badge"
                       title="${categoryObj.catDescription}">`
                : '';

            document.getElementById('account-overview-header').innerHTML = `
                <div class="vonflandern-account">
                    <div class="account-badge-circle">
                        ${badgeHTML}
                    </div>
                    <div class="account-info-right">
                        <div class="player-name-display">${playerName || 'Guest'}</div>
                        <div class="player-wallet-display">${displayAddress}</div>
                    </div>
                    <div class="account-menu">
                        <a href="#" id="account-menu-trigger-overview">☰</a>
                        <div id="account-menu-dropdown-overview" class="menu-dropdown" style="display: none;">
                            <a href="#" id="menu-logout-overview">Log Out</a>
                            <a href="#" id="menu-change-name-overview">Change Name</a>
                            <a href="#" id="menu-back-level">Back to Levels</a>
                            <a href="#" id="menu-anleitung-overview">Instructions</a>
                        </div>
                    </div>
                </div>
            `;

            // Hamburger-Menü Event-Listener für Overview-Screen
            const menuTrigger = document.getElementById('account-menu-trigger-overview');
            const menuDropdown = document.getElementById('account-menu-dropdown-overview');

            menuTrigger?.addEventListener('click', (e) => {
                e.preventDefault();
                const isVisible = menuDropdown.style.display === 'block';
                menuDropdown.style.display = isVisible ? 'none' : 'block';
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.account-menu') && menuDropdown) {
                    menuDropdown.style.display = 'none';
                }
            });

            document.getElementById('menu-logout-overview')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });

            document.getElementById('menu-change-name-overview')?.addEventListener('click', (e) => {
                e.preventDefault();
                menuDropdown.style.display = 'none';
                this.openChangeNameModal(walletManager.selectedAccount);
            });

            document.getElementById('menu-back-level')?.addEventListener('click', (e) => {
                e.preventDefault();
                menuDropdown.style.display = 'none';
                this.showLevelOverview();
            });

            document.getElementById('menu-anleitung-overview')?.addEventListener('click', (e) => {
                e.preventDefault();
                menuDropdown.style.display = 'none';
                this.showAnleitung();
            });

            // Network Selector initialisieren
            await this.initializeNetworkSelector(walletAddress);

            // Loading-Overlay anzeigen
            document.getElementById('onchain-loading-overlay').style.display = 'flex';

            // On-Chain-Daten laden
            const onChainData = await this.loadOnChainData(walletAddress, false, network);

            // Loading-Overlay verstecken
            document.getElementById('onchain-loading-overlay').style.display = 'none';

            // Daten rendern
            this.renderOnChainData(onChainData, network);
            
            // Address Display initialisieren
            this.initializeAddressDisplay();

            // Back-Button Event-Listener
            const backBtn = document.getElementById('back-from-account-overview-btn');
            if (backBtn && !backBtn.hasAttribute('data-listener-added')) {
                backBtn.setAttribute('data-listener-added', 'true');
                backBtn.addEventListener('click', () => {
                    this.showLevelOverview();
                });
            }

            // Refresh-Button Event-Listener
            const refreshBtn = document.getElementById('refresh-onchain-btn');
            if (refreshBtn && !refreshBtn.hasAttribute('data-listener-added')) {
                refreshBtn.setAttribute('data-listener-added', 'true');
                refreshBtn.addEventListener('click', async () => {
                    try {
                        // Loading-Overlay anzeigen
                        document.getElementById('onchain-loading-overlay').style.display = 'flex';

                        // Force-Refresh
                        const freshData = await this.loadOnChainData(walletAddress, true, network);

                        // Loading-Overlay verstecken
                        document.getElementById('onchain-loading-overlay').style.display = 'none';

                        // Neu rendern
                        this.renderOnChainData(freshData, network);

                        console.log('✅ On-chain data refreshed');
                    } catch (error) {
                        document.getElementById('onchain-loading-overlay').style.display = 'none';
                        console.error('Failed to refresh on-chain data:', error);
                        alert('Failed to refresh data. Please try again.');
                    }
                });
            }

        } catch (error) {
            console.error('Failed to show account overview:', error);
            document.getElementById('onchain-loading-overlay').style.display = 'none';
            document.getElementById('onchain-data-body').innerHTML = `
                <div class="error-message">
                    <p>❌ Failed to load on-chain data</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Rendert On-Chain-Daten in die UI
     * @param {Object} data - On-Chain-Daten
     * @param {string} network - Netzwerk (polkadot, kusama, westend)
     */
    renderOnChainData(data, network = 'polkadot') {
        const isStale = data.isStale || false;

        // Warning Banner
        const warningBanner = document.getElementById('onchain-warning');
        if (warningBanner) {
            warningBanner.style.display = isStale ? 'block' : 'none';
        }

        // Last Update
        const lastUpdateEl = document.getElementById('onchain-last-update');
        if (lastUpdateEl && data.lastUpdate) {
            const date = new Date(data.lastUpdate);
            lastUpdateEl.textContent = `Last updated: ${date.toLocaleString()}`;
        }

        // Unit basierend auf Netzwerk
        const unit = network === 'polkadot' ? 'DOT' : network === 'kusama' ? 'KSM' : 'WND';
        const decimals = 10; // Alle Polkadot-Chains nutzen 10 decimals

        // === Account Section ===
        const accountSection = document.getElementById('account-section');
        const identity = data.account?.identity || {};
        const flags = data.account?.flags || {};

        const identityDisplay = identity.hasIdentity
            ? `<strong>${identity.display}</strong>`
            : '<em>No on-chain identity set</em>';

        const flagsList = [];
        if (flags.isCouncil) flagsList.push('🏛️ Council Member');
        if (flags.isSociety) flagsList.push('🎭 Society Member');
        if (flags.isTechCommittee) flagsList.push('🔧 Tech Committee');

        // Fülle Address Display
        const genericAddr = document.querySelector('.generic-addr');
        const networkAddr = document.querySelector('.network-addr');
        const networkLabel = document.querySelector('.network-label');
        
        if (data.addresses) {
            if (genericAddr) genericAddr.textContent = data.addresses.generic || 'N/A';
            if (networkAddr) networkAddr.textContent = data.addresses.networkSpecific || 'N/A';
            if (networkLabel) networkLabel.textContent = `${network.charAt(0).toUpperCase() + network.slice(1)}:`;
        }

        accountSection.innerHTML = `
            <div class="data-row">
                <span class="data-label">Account ID:</span>
                <span class="data-value">${data.account?.accountId || 'N/A'}</span>
            </div>
            <div class="data-row">
                <span class="data-label">Identity:</span>
                <span class="data-value">${identityDisplay}</span>
            </div>
            ${identity.web ? `<div class="data-row"><span class="data-label">Website:</span><span class="data-value"><a href="${identity.web}" target="_blank">${identity.web}</a></span></div>` : ''}
            ${identity.email ? `<div class="data-row"><span class="data-label">Email:</span><span class="data-value">${identity.email}</span></div>` : ''}
            ${identity.twitter ? `<div class="data-row"><span class="data-label">Twitter:</span><span class="data-value">${identity.twitter}</span></div>` : ''}
            ${flagsList.length > 0 ? `<div class="data-row"><span class="data-label">Roles:</span><span class="data-value">${flagsList.join(', ')}</span></div>` : ''}
        `;

        // === Balances Section ===
        const balancesSection = document.getElementById('balances-section');
        const balances = data.balances || {};

        balancesSection.innerHTML = `
            <div class="data-row">
                <span class="data-label">Transferable:</span>
                <span class="data-value">${onChainService.formatBalance(balances.free || '0', decimals, unit)}</span>
            </div>
            <div class="data-row">
                <span class="data-label">Reserved:</span>
                <span class="data-value">${onChainService.formatBalance(balances.reserved || '0', decimals, unit)}</span>
            </div>
            <div class="data-row">
                <span class="data-label">Frozen:</span>
                <span class="data-value">${onChainService.formatBalance(balances.frozen || '0', decimals, unit)}</span>
            </div>
            <div class="data-row">
                <span class="data-label"><strong>Total:</strong></span>
                <span class="data-value"><strong>${onChainService.formatBalance(balances.total || '0', decimals, unit)}</strong></span>
            </div>
        `;

        // === Staking Section ===
        const staking = data.staking || {};
        const stakingWrapper = document.getElementById('staking-section-wrapper');
        const stakingSection = document.getElementById('staking-section');

        if (staking.hasStaking && staking.active !== '0') {
            stakingWrapper.style.display = 'block';
            stakingSection.innerHTML = `
                <div class="data-row">
                    <span class="data-label">Active Stake:</span>
                    <span class="data-value">${onChainService.formatBalance(staking.active || '0', decimals, unit)}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Total Bonded:</span>
                    <span class="data-value">${onChainService.formatBalance(staking.total || '0', decimals, unit)}</span>
                </div>
                ${staking.rewardDestination ? `<div class="data-row"><span class="data-label">Reward Destination:</span><span class="data-value">${staking.rewardDestination}</span></div>` : ''}
                ${staking.unlocking && staking.unlocking.length > 0 ? `<div class="data-row"><span class="data-label">Unlocking:</span><span class="data-value">${staking.unlocking.length} chunks</span></div>` : ''}
            `;
        } else {
            stakingWrapper.style.display = 'none';
        }

        // === Governance Section ===
        const governanceSection = document.getElementById('governance-section');
        const governance = data.governance || {};

        governanceSection.innerHTML = `
            <div class="data-row">
                <span class="data-label">Voting Balance:</span>
                <span class="data-value">${onChainService.formatBalance(governance.votingBalance || '0', decimals, unit)}</span>
            </div>
        `;
    }

    /**
     * Initialisiert Network Selector mit Registry-Daten
     * @param {string} walletAddress - Wallet Address für RPC-Reconnect
     */
    async initializeNetworkSelector(walletAddress) {
        const selector = document.getElementById('network-selector');
        const showMoreBtn = document.getElementById('show-more-networks-btn');
        
        if (!selector) return;

        // Registry laden
        await onChainService.loadNetworkRegistry();
        const registry = onChainService.networkRegistry;

        // Top 5 Netzwerke (nach Priority sortiert)
        const topNetworks = registry.slice(0, 5);
        const remainingNetworks = registry.slice(5);

        // Fülle Dropdown mit Top 5
        selector.innerHTML = topNetworks.map(net => 
            `<option value="${net.network}">${net.displayName} (${net.symbol})</option>`
        ).join('');

        // "Show More" Button anzeigen wenn es mehr Netzwerke gibt
        if (remainingNetworks.length > 0 && showMoreBtn) {
            showMoreBtn.style.display = 'inline-block';
            showMoreBtn.onclick = () => {
                // Füge restliche Netzwerke hinzu
                selector.innerHTML = registry.map(net => 
                    `<option value="${net.network}">${net.displayName} (${net.symbol})</option>`
                ).join('');
                showMoreBtn.style.display = 'none';
            };
        }

        // Event Listener für Netzwerk-Wechsel
        selector.onchange = async (e) => {
            const newNetwork = e.target.value;
            console.log(`🔄 Switching network to: ${newNetwork}`);

            try {
                // Loading-Overlay anzeigen
                document.getElementById('onchain-loading-overlay').style.display = 'flex';

                // Alte Verbindung trennen
                if (onChainService.isConnected) {
                    await onChainService.disconnect();
                }

                // Neue Verbindung herstellen
                await onChainService.connect(newNetwork);

                // Daten neu laden
                const freshData = await this.loadOnChainData(walletAddress, true, newNetwork);

                // Loading-Overlay verstecken
                document.getElementById('onchain-loading-overlay').style.display = 'none';

                // UI neu rendern
                this.renderOnChainData(freshData, newNetwork);

                console.log(`✅ Switched to ${newNetwork}`);
            } catch (error) {
                console.error('❌ Network switch failed:', error);
                document.getElementById('onchain-loading-overlay').style.display = 'none';
                alert(`Failed to switch network: ${error.message}`);
                // Zurück zu vorheriger Auswahl
                selector.value = onChainService.currentNetwork || 'polkadot';
            }
        };
    }

    /**
     * Initialisiert Address Display mit Copy-Funktion und Toggle
     */
    initializeAddressDisplay() {
        // Toggle Button
        const toggleBtn = document.getElementById('addr-format-toggle');
        const genericRow = document.querySelector('.generic-address-row');
        const networkRow = document.querySelector('.network-address-row');

        if (toggleBtn) {
            // Lade gespeicherte Präferenz
            const savedFormat = localStorage.getItem('addressDisplayFormat') || 'both';
            this.applyAddressDisplayFormat(savedFormat);

            toggleBtn.onclick = () => {
                const currentFormat = localStorage.getItem('addressDisplayFormat') || 'both';
                const newFormat = currentFormat === 'both' ? 'generic' : 
                                  currentFormat === 'generic' ? 'network' : 'both';
                
                localStorage.setItem('addressDisplayFormat', newFormat);
                this.applyAddressDisplayFormat(newFormat);
            };
        }

        // Copy Buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = async () => {
                const copyType = btn.getAttribute('data-copy');
                const addressElement = copyType === 'generic' 
                    ? document.querySelector('.generic-addr')
                    : document.querySelector('.network-addr');
                
                const address = addressElement?.textContent;
                
                if (address) {
                    try {
                        await navigator.clipboard.writeText(address);
                        
                        // Toast-Benachrichtigung
                        this.showToast('📋 Address copied to clipboard!');
                        
                        // Visuelles Feedback am Button
                        btn.textContent = '✅';
                        setTimeout(() => btn.textContent = '📋', 1500);
                    } catch (error) {
                        console.error('Copy failed:', error);
                        this.showToast('❌ Failed to copy address', true);
                    }
                }
            };
        });
    }

    /**
     * Wendet Address Display Format an
     * @param {string} format - 'both', 'generic', oder 'network'
     */
    applyAddressDisplayFormat(format) {
        const toggleBtn = document.getElementById('addr-format-toggle');
        const genericRow = document.querySelector('.generic-address-row');
        const networkRow = document.querySelector('.network-address-row');

        if (format === 'generic') {
            genericRow.style.display = 'flex';
            networkRow.style.display = 'none';
            toggleBtn.textContent = 'Show Network';
        } else if (format === 'network') {
            genericRow.style.display = 'none';
            networkRow.style.display = 'flex';
            toggleBtn.textContent = 'Show Both';
        } else { // both
            genericRow.style.display = 'flex';
            networkRow.style.display = 'flex';
            toggleBtn.textContent = 'Show Generic';
        }
    }

    /**
     * Zeigt Toast-Benachrichtigung
     * @param {string} message - Nachricht
     * @param {boolean} isError - Ist Fehlermeldung
     */
    showToast(message, isError = false) {
        // Prüfe ob Toast-Container existiert
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
        toast.textContent = message;
        toast.style.cssText = `
            background: ${isError ? '#fee' : '#efe'};
            color: ${isError ? '#c00' : '#060'};
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            border: 2px solid ${isError ? '#fcc' : '#cfc'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
        `;

        toastContainer.appendChild(toast);

        // Entferne nach 3 Sekunden
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Initialisiert Network Selector Dropdown mit Registry-Daten
     * @param {string} walletAddress - Wallet-Adresse für Data-Loading
     */
    async initializeNetworkSelector(walletAddress) {
        const selector = document.getElementById('network-selector');
        if (!selector) return;

        // Registry laden
        await onChainService.loadNetworkRegistry();
        const registry = onChainService.networkRegistry;

        // Top 5 Netzwerke initial anzeigen
        const topNetworks = registry.slice(0, 5);
        
        selector.innerHTML = '';
        topNetworks.forEach(net => {
            const option = document.createElement('option');
            option.value = net.network;
            option.textContent = `${net.displayName} (${net.symbol})`;
            if (net.network === 'polkadot') option.selected = true;
            selector.appendChild(option);
        });

        // "Show More" Option (wenn mehr als 5 Netzwerke)
        if (registry.length > 5) {
            const showMoreOption = document.createElement('option');
            showMoreOption.value = '__showmore__';
            showMoreOption.textContent = '--- Show More Networks ---';
            selector.appendChild(showMoreOption);
        }

        // Event Listener für Netzwerk-Wechsel
        selector.onchange = async (e) => {
            const selectedNetwork = e.target.value;

            // "Show More" geklickt?
            if (selectedNetwork === '__showmore__') {
                // Lade alle Netzwerke
                selector.innerHTML = '';
                registry.forEach(net => {
                    const option = document.createElement('option');
                    option.value = net.network;
                    option.textContent = `${net.displayName} (${net.symbol})`;
                    selector.appendChild(option);
                });
                selector.value = onChainService.currentNetwork || 'polkadot';
                return;
            }

            // Netzwerk-Wechsel
            try {
                console.log('🔄 Switching network to:', selectedNetwork);
                
                // Loading-Overlay anzeigen
                document.getElementById('onchain-loading-overlay').style.display = 'flex';

                // Alte Verbindung trennen
                await onChainService.disconnect();

                // Neue Verbindung aufbauen
                await onChainService.connect(selectedNetwork);

                // Daten neu laden
                const freshData = await this.loadOnChainData(walletAddress, true, selectedNetwork);

                // Loading-Overlay verstecken
                document.getElementById('onchain-loading-overlay').style.display = 'none';

                // UI neu rendern
                this.renderOnChainData(freshData, selectedNetwork);
                
                console.log('✅ Network switched successfully');
            } catch (error) {
                console.error('❌ Network switch failed:', error);
                document.getElementById('onchain-loading-overlay').style.display = 'none';
                alert(`Failed to switch network: ${error.message}`);
                
                // Zurück zum vorherigen Netzwerk
                selector.value = onChainService.currentNetwork || 'polkadot';
            }
        };
    }

    /**
     * Initialisiert Address Display mit Copy-Funktion und Toggle
     */
    initializeAddressDisplay() {
        // Copy-to-Clipboard für beide Adressen
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = () => {
                const copyType = btn.getAttribute('data-copy');
                const addressElement = copyType === 'generic' 
                    ? document.querySelector('.generic-addr')
                    : document.querySelector('.network-addr');
                
                if (addressElement) {
                    const address = addressElement.textContent;
                    navigator.clipboard.writeText(address).then(() => {
                        // Toast-Feedback
                        this.showToast('Address copied to clipboard!');
                        
                        // Button-Feedback
                        const originalText = btn.textContent;
                        btn.textContent = '✓';
                        btn.style.background = '#2196F3';
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.style.background = '';
                        }, 1000);
                    }).catch(err => {
                        console.error('Copy failed:', err);
                        alert('Failed to copy address');
                    });
                }
            };
        });

        // Toggle Button für Address Format
        const toggleBtn = document.getElementById('addr-format-toggle');
        const genericRow = document.querySelector('.generic-address-row');
        const networkRow = document.querySelector('.network-address-row');
        
        if (toggleBtn && genericRow && networkRow) {
            // Lade gespeicherte Präferenz
            const savedFormat = localStorage.getItem('addressDisplayFormat') || 'both';
            
            const applyFormat = (format) => {
                switch(format) {
                    case 'generic':
                        genericRow.style.display = 'flex';
                        networkRow.style.display = 'none';
                        toggleBtn.textContent = 'Show Network';
                        break;
                    case 'network':
                        genericRow.style.display = 'none';
                        networkRow.style.display = 'flex';
                        toggleBtn.textContent = 'Show Both';
                        break;
                    case 'both':
                    default:
                        genericRow.style.display = 'flex';
                        networkRow.style.display = 'flex';
                        toggleBtn.textContent = 'Show Generic';
                        break;
                }
                localStorage.setItem('addressDisplayFormat', format);
            };
            
            applyFormat(savedFormat);
            
            toggleBtn.onclick = () => {
                const currentFormat = localStorage.getItem('addressDisplayFormat') || 'both';
                const nextFormat = currentFormat === 'both' ? 'generic' 
                                 : currentFormat === 'generic' ? 'network' 
                                 : 'both';
                applyFormat(nextFormat);
            };
        }
    }

    /**
     * Zeigt Toast-Nachricht
     * @param {string} message - Nachricht
     */
    showToast(message) {
        // Erstelle Toast-Element falls nicht vorhanden
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: #333;
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.display = 'block';

        // Auto-Hide nach 2 Sekunden
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                toast.style.display = 'none';
                toast.style.animation = '';
            }, 300);
        }, 2000);
    }

    /**
     * Zeigt Error Overlay für Address Conversion Fehler
     * @param {string} errorMessage - Fehlermeldung
     * @param {string} address - Betroffene Adresse
     * @param {string} network - Netzwerk
     */
    showAddressConversionError(errorMessage, address, network) {
        const overlay = document.getElementById('onchain-loading-overlay');
        if (!overlay) return;

        overlay.className = 'error-state';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h3>Address Conversion Failed</h3>
                <p>${errorMessage}</p>
                <p class="error-details">
                    <strong>Address:</strong> ${address.substring(0, 12)}...${address.substring(address.length - 6)}<br>
                    <strong>Network:</strong> ${network}
                </p>
                <div class="error-actions">
                    <button id="error-retry-btn" class="btn-primary">Try Again</button>
                    <button id="error-disconnect-btn" class="btn-secondary">Disconnect Wallet</button>
                </div>
            </div>
        `;

        // Retry Button
        document.getElementById('error-retry-btn')?.addEventListener('click', async () => {
            overlay.className = '';
            overlay.innerHTML = `
                <div class="spinner">🔄</div>
                <p>Loading blockchain data...</p>
            `;
            
            try {
                const freshData = await this.loadOnChainData(address, true, network);
                overlay.style.display = 'none';
                this.renderOnChainData(freshData, network);
            } catch (error) {
                this.showAddressConversionError(error.message, address, network);
            }
        });

        // Disconnect Button
        document.getElementById('error-disconnect-btn')?.addEventListener('click', () => {
            walletManager.disconnect();
            this.showWalletConnect();
        });
    }

    /**
     * Lädt On-Chain-Daten für eine Adresse
     * @param {string} address - Generic Address
     * @param {boolean} forceRefresh - Ignoriert Cache und lädt neu
     * @param {string} network - Netzwerk (default: polkadot)
     * @returns {Promise<Object>} On-Chain-Daten
     */
    async loadOnChainData(address, forceRefresh = false, network = 'polkadot') {
        try {
            console.log(`🔄 Loading on-chain data for ${address.substring(0, 12)}... (forceRefresh: ${forceRefresh}, network: ${network})`);

            // Session Storage Key mit Netzwerk-Präfix
            const cacheKey = `onchain_${network}_${address}`;
            
            // Prüfe Cache falls kein Force-Refresh
            if (!forceRefresh) {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const cachedData = JSON.parse(cached);
                    
                    // Prüfe ob gecachtes Netzwerk mit angefordertem übereinstimmt
                    const cachedNetwork = cachedData.network || 'polkadot';
                    if (cachedNetwork !== network) {
                        console.log(`🔄 Network changed from ${cachedNetwork} to ${network}, forcing refresh`);
                        forceRefresh = true;
                    } else if (!onChainService.needsRefresh(cachedData.lastUpdate)) {
                        console.log('✅ Using cached on-chain data (still fresh)');
                        return cachedData;
                    } else {
                        console.log('⏱️ Cached data is stale, refreshing...');
                    }
                }
            }

            // Versuche von Backend zu laden (gecachte Daten)
            let backendData = null;
            try {
                const playerResponse = await fetch('api/get-player.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress: address })
                });
                const playerResult = await playerResponse.json();
                
                if (playerResult.onChainData && playerResult.onChainData[network]) {
                    backendData = playerResult.onChainData[network];
                    console.log('📦 Found on-chain data in backend');
                    
                    // Prüfe ob Backend-Daten fresh genug sind
                    if (!forceRefresh && !onChainService.needsRefresh(backendData.lastUpdate)) {
                        console.log('✅ Backend data is fresh, using it');
                        sessionStorage.setItem(cacheKey, JSON.stringify(backendData));
                        return backendData;
                    }
                }
            } catch (error) {
                console.warn('Could not load backend data:', error);
            }

            // Live RPC-Call nötig
            console.log('📡 Fetching fresh on-chain data from RPC...');
            
            try {
                // Verbinde falls nötig
                if (!onChainService.isConnected) {
                    await onChainService.connect(network);
                }

                // Daten abrufen
                const onChainData = await onChainService.fetchAllOnChainData(address);
                
                // Füge Netzwerk-Info hinzu
                onChainData.network = network;

                // In Backend speichern
                try {
                    const saveResponse = await fetch('api/save-onchain-data.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            walletAddress: address,
                            network: network,
                            onChainData: onChainData
                        })
                    });
                    
                    if (!saveResponse.ok) {
                        const errorText = await saveResponse.text();
                        console.error('❌ Backend save failed:', saveResponse.status, errorText);
                    } else {
                        const saveResult = await saveResponse.json();
                        if (saveResult.success) {
                            console.log('✅ On-chain data saved to backend');
                        } else {
                            console.warn('⚠️ Failed to save on-chain data:', saveResult.message || saveResult);
                        }
                    }
                } catch (saveError) {
                    console.error('❌ Error saving on-chain data:', saveError);
                }

                // In Session Storage speichern
                sessionStorage.setItem(cacheKey, JSON.stringify(onChainData));

                console.log('✅ Fresh on-chain data loaded successfully');
                return onChainData;

            } catch (rpcError) {
                console.error('❌ RPC fetch failed:', rpcError);
                
                // Prüfe ob es ein Address Conversion Error ist
                if (rpcError.message && (rpcError.message.includes('convert') || rpcError.message.includes('invalid'))) {
                    // Zeige Error Overlay
                    this.showAddressConversionError(rpcError.message, address, network);
                    throw rpcError; // Re-throw damit showAccountOverview nicht weiter ausführt
                }
                
                // Fallback zu gecachten Daten (Backend oder Session)
                if (backendData) {
                    console.log('⚠️ Using stale backend data as fallback');
                    sessionStorage.setItem(cacheKey, JSON.stringify(backendData));
                    backendData.isStale = true;
                    return backendData;
                }
                
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const cachedData = JSON.parse(cached);
                    console.log('⚠️ Using stale session cache as fallback');
                    cachedData.isStale = true;
                    return cachedData;
                }
                
                // Kein Fallback verfügbar
                throw new Error('No on-chain data available (RPC failed, no cache)');
            }

        } catch (error) {
            console.error('❌ Failed to load on-chain data:', error);
            throw error;
        }
    }
}

// Globale Instanz
const quizUI = new QuizUI();