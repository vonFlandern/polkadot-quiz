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

        const connectBtn = document.getElementById('connect-wallet-btn');
        const statusDiv = document.getElementById('wallet-status');
        const accountsDiv = document.getElementById('accounts-list');
        const playerNameInput = document.getElementById('player-name-input');
        const continueBtn = document.getElementById('continue-to-quiz-btn');

        connectBtn.addEventListener('click', async () => {
            try {
                // Zeige Status-Div erst jetzt
                statusDiv.style.display = 'block';
                statusDiv.innerHTML = '<p>Verbinde mit Wallet...</p>';
                
                const accounts = await walletManager.connect();
                
                statusDiv.innerHTML = '<p class="success">✅ Wallet verbunden! Wähle einen Account:</p>';
                
                // Zeige Accounts mit konvertierten Adressen
                accountsDiv.innerHTML = '<p>🔄 Lade Accounts...</p>';
                
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
                        <strong>${account.name || 'Unbenannt'}</strong><br>
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
                        
                        // Wenn bekannter Spieler
                        if (account.existingPlayer) {
                            const nameLabel = document.querySelector('label[for="player-name"]');
                            if (nameLabel) {
                                // Größerer Text, Anthrazit, kein Emoji
                                nameLabel.innerHTML = `<strong style="color: #374151; font-size: 1.3em;">Willkommen zurück, ${account.existingPlayer.playerName}!</strong>`;
                            }
                            
                            // Verstecke Input
                            const nameInput = document.getElementById('player-name');
                            nameInput.style.display = 'none';
                            nameInput.value = account.existingPlayer.playerName;
                            
                            // ENTFERNE originalen Submit-Button komplett
                            const originalSubmitBtn = document.getElementById('continue-to-quiz-btn');
                            if (originalSubmitBtn) {
                                originalSubmitBtn.remove();
                            }
                            
                            // DREI Buttons nebeneinander: Weiter zum Quiz | Anleitung | Name ändern
                            const buttonsDiv = document.createElement('div');
                            buttonsDiv.id = 'action-buttons';
                            buttonsDiv.style.cssText = 'display: flex; gap: 15px; margin-top: 15px;';
                            buttonsDiv.innerHTML = `
                                <button id="continue-quiz-btn" type="button" style="flex: 1; padding: 15px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Weiter zum Quiz
                                </button>
                                <button id="open-anleitung-btn" type="button" style="flex: 1; padding: 15px; font-size: 16px; font-weight: 600; background: #6b7280; border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Anleitung
                                </button>
                                <button id="open-change-name-btn" type="button" style="flex: 1; padding: 15px; font-size: 16px; font-weight: 600; background: #6b7280; border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Name ändern
                                </button>
                            `;
                            
                            playerNameInput.appendChild(buttonsDiv);
                            
                            // Event Listeners
                            setTimeout(() => {
                                // "Weiter zum Quiz" Button
                                document.getElementById('continue-quiz-btn').addEventListener('click', () => {
                                    // WICHTIG: Setze Session-Daten
                                    sessionStorage.setItem('walletAddress', account.genericAddress);
                                    sessionStorage.setItem('playerName', account.existingPlayer.playerName);
                                    sessionStorage.setItem('polkadotAddress', account.polkadotAddress);
                                    
                                    // Zeige Level-Übersicht
                                    this.showLevelOverview();
                                });
                                
                                // "Anleitung" Button
                                document.getElementById('open-anleitung-btn').addEventListener('click', () => {
                                    this.showAnleitung();
                                });
                                
                                // "Name ändern" Button öffnet Modal
                                document.getElementById('open-change-name-btn').addEventListener('click', () => {
                                    this.openChangeNameModal(account);
                                });
                            }, 0);
                            
                        } else {
                            // Neuer Spieler: 3-Button-Layout wie bekannte Spieler
                            const nameLabel = document.querySelector('label[for="player-name"]');
                            if (nameLabel) {
                                nameLabel.innerHTML = '<strong>Wähle deinen Spielernamen:</strong>';
                            }
                            
                            const nameInput = document.getElementById('player-name');
                            nameInput.style.display = 'block';
                            nameInput.disabled = false;
                            
                            // Lade Namen-Vorschlag
                            try {
                                const suggestResponse = await fetch('api/suggest-name.php', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({})
                                });
                                
                                const suggestResult = await suggestResponse.json();
                                
                                if (suggestResult.success && suggestResult.suggestedName) {
                                    nameInput.value = suggestResult.suggestedName;
                                    nameInput.placeholder = suggestResult.suggestedName;
                                    
                                    console.log('✅ Suggested name:', suggestResult.suggestedName);
                                }
                            } catch (error) {
                                console.error('Name suggestion failed:', error);
                                // Fallback
                                nameInput.value = '';
                                nameInput.placeholder = 'z.B. Player_1';
                            }
                            
                            // ENTFERNE originalen Submit-Button komplett
                            const originalSubmitBtn = document.getElementById('continue-to-quiz-btn');
                            if (originalSubmitBtn) {
                                originalSubmitBtn.remove();
                            }
                            
                            // DREI Buttons nebeneinander: Weiter zum Quiz | Anleitung | Name ändern
                            const buttonsDiv = document.createElement('div');
                            buttonsDiv.id = 'action-buttons';
                            buttonsDiv.style.cssText = 'display: flex; gap: 15px; margin-top: 15px;';
                            buttonsDiv.innerHTML = `
                                <button id="continue-quiz-btn" type="button" style="flex: 1; padding: 15px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Weiter zum Quiz
                                </button>
                                <button id="open-anleitung-btn" type="button" style="flex: 1; padding: 15px; font-size: 16px; font-weight: 600; background: #6b7280; border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Anleitung
                                </button>
                                <button id="open-change-name-btn" type="button" style="flex: 1; padding: 15px; font-size: 16px; font-weight: 600; background: #6b7280; border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Name ändern
                                </button>
                            `;
                            
                            playerNameInput.appendChild(buttonsDiv);
                            
                            // Event Listeners
                            setTimeout(() => {
                                // "Weiter zum Quiz" Button - MIT Validierung
                                document.getElementById('continue-quiz-btn').addEventListener('click', async () => {
                                    const playerName = nameInput.value.trim();
                                    
                                    // Validierung
                                    if (!playerName || playerName.length < 3) {
                                        alert('❌ Bitte gib einen Spielernamen ein (mindestens 3 Zeichen)');
                                        return;
                                    }
                                    
                                    if (playerName.length > 20) {
                                        alert('❌ Der Name darf maximal 20 Zeichen haben!');
                                        return;
                                    }
                                    
                                    // Prüfe ob Name verfügbar
                                    try {
                                        const checkResponse = await fetch('api/check-name.php', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ 
                                                playerName: playerName,
                                                walletAddress: account.genericAddress
                                            })
                                        });
                                        
                                        const checkResult = await checkResponse.json();
                                        
                                        if (!checkResult.available) {
                                            alert(`❌ Der Name "${playerName}" ist bereits vergeben!\n\nBitte wähle einen anderen Namen.`);
                                            return;
                                        }
                                    } catch (error) {
                                        console.error('Name check failed:', error);
                                    }
                                    
                                    // Registriere Spieler
                                    try {
                                        const registerResponse = await fetch('api/register-player.php', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                walletAddress: account.genericAddress,
                                                playerName: playerName
                                            })
                                        });
                                        
                                        if (!registerResponse.ok) {
                                            const errorData = await registerResponse.json();
                                            throw new Error(errorData.error || 'Registration failed');
                                        }
                                        
                                        console.log('✅ Player registered');
                                        
                                        // WICHTIG: Setze Session-Daten
                                        sessionStorage.setItem('walletAddress', account.genericAddress);
                                        sessionStorage.setItem('playerName', playerName);
                                        sessionStorage.setItem('polkadotAddress', account.polkadotAddress);
                                        
                                        // Zeige Level-Übersicht
                                        this.showLevelOverview();
                                        
                                    } catch (error) {
                                        console.error('Player registration error:', error);
                                        alert(`❌ Fehler beim Speichern: ${error.message}\n\nBitte versuche es erneut.`);
                                    }
                                });
                                
                                // "Anleitung" Button
                                document.getElementById('open-anleitung-btn').addEventListener('click', () => {
                                    this.showAnleitung();
                                });
                                
                                // "Name ändern" Button - für neue Spieler = Input editierbar machen
                                document.getElementById('open-change-name-btn').addEventListener('click', () => {
                                    nameInput.focus();
                                    nameInput.select();
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

        continueBtn.addEventListener('click', async () => {
            const playerName = document.getElementById('player-name').value.trim();
            
            // Validierung: 3-20 Zeichen
            if (!playerName) {
                alert('❌ Bitte gib einen Spielernamen ein');
                return;
            }
            
            if (playerName.length < 3) {
                alert('❌ Der Name muss mindestens 3 Zeichen haben!');
                return;
            }
            
            if (playerName.length > 20) {
                alert('❌ Der Name darf maximal 20 Zeichen haben!');
                return;
            }
            
            const selectedAccount = walletManager.getSelectedAccount();
            if (!selectedAccount) {
                alert('❌ Bitte wähle einen Account aus');
                return;
            }
            
            // Prüfe ob Name bereits vergeben ist
            // Für wiederkehrende Spieler: nur wenn Name geändert wurde
            let needsCheck = false;
            
            if (!selectedAccount.existingPlayer) {
                // Neuer Spieler: Immer prüfen
                needsCheck = true;
            } else if (selectedAccount.existingPlayer.playerName !== playerName) {
                // Wiederkehrend + Name geändert: Prüfen
                needsCheck = true;
            }
            
            if (needsCheck) {
                try {
                    const checkResponse = await fetch('api/check-name.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            playerName: playerName,
                            walletAddress: selectedAccount.address  // Generic address
                        })
                    });
                    
                    const checkResult = await checkResponse.json();
                    
                    if (!checkResult.available) {
                        alert(`❌ Der Name "${playerName}" ist bereits vergeben!\n\nBitte wähle einen anderen Namen.`);
                        return;
                    }
                } catch (error) {
                    console.error('Name check failed:', error);
                    // Bei Fehler trotzdem fortfahren
                }
            }
            
            // WICHTIG: Registriere/Update Spieler SOFORT
            try {
                const registerResponse = await fetch('api/register-player.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: selectedAccount.address,  // Generic address
                        playerName: playerName
                    })
                });
                
                if (!registerResponse.ok) {
                    const errorData = await registerResponse.json();
                    throw new Error(errorData.error || 'Registration failed');
                }
                
                const registerResult = await registerResponse.json();
                
                console.log('✅ Player registered/updated:', registerResult);
                
                // Update Session Storage
                sessionStorage.setItem('playerName', playerName);
                sessionStorage.setItem('walletAddress', selectedAccount.address);
                
                console.log('✅ Account selected:', {
                    name: selectedAccount.name,
                    address: selectedAccount.address
                });
                
                this.showLevelOverview();
                
            } catch (error) {
                console.error('Player registration error:', error);
                alert(`❌ Fehler beim Speichern: ${error.message}\n\nBitte versuche es erneut.`);
            }
        });
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
                    <div class="player-name-display">${playerName}</div>
                    <div class="player-wallet-display">${displayAddress}</div>
                </div>
                <div class="account-menu">
                    <a href="#" id="account-menu-trigger">☰</a>
                    <div id="account-menu-dropdown" class="menu-dropdown" style="display: none;">
                        <a href="#" id="menu-logout">Abmelden</a>
                        <a href="#" id="menu-change-name">Spielername ändern</a>
                        <a href="#" id="menu-anleitung">Spielanleitung</a>
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

        // FALL 1: Neuer Spieler (playerName startet mit "Player_")
        if (playerName && playerName.startsWith('Player_')) {
            welcomeContainer.innerHTML = `
                <div class="account-body-section" style="text-align: center;">
                    <label for="welcome-name-input" style="display: block; margin-bottom: 15px; font-size: 1.1em; font-weight: 600;">
                        Willkommen! Bitte gib deinen Spielernamen ein:
                    </label>
                    <input
                        type="text"
                        id="welcome-name-input"
                        placeholder="Dein Name"
                        maxlength="20"
                        style="width: 100%; max-width: 300px; padding: 12px; font-size: 1em; border: 2px solid var(--border-color); border-radius: 6px; margin-bottom: 15px;"
                    />
                    <button id="welcome-save-name-btn" style="padding: 12px 30px; background: var(--primary-color); color: white; border: none; border-radius: 6px; font-size: 1em; font-weight: 600; cursor: pointer;">
                        Namen speichern
                    </button>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #6b7280;">
                        3-20 Zeichen, muss eindeutig sein
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
            ? `Willkommen, Sensei ${playerName}!`
            : `Willkommen, ${playerName}!`;

        welcomeContainer.innerHTML = `
            <div class="account-body-section" style="text-align: center; font-size: 1.3em; font-weight: 600;">
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
                alert('❌ Der Name muss mindestens 3 Zeichen haben!');
                return;
            }

            if (newName.length > 20) {
                alert('❌ Der Name darf maximal 20 Zeichen haben!');
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
                    alert(`❌ Der Name "${newName}" ist bereits vergeben!\n\nBitte wähle einen anderen Namen.`);
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

                // Update im Wallet Manager
                if (walletManager.selectedAccount && walletManager.selectedAccount.existingPlayer) {
                    walletManager.selectedAccount.existingPlayer.playerName = newName;
                }

                // Reload Level-Übersicht
                this.showLevelOverview();

            } catch (error) {
                console.error('Name save error:', error);
                alert(`❌ Fehler beim Speichern: ${error.message}\n\nBitte versuche es erneut.`);
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

        const formattedScore = new Intl.NumberFormat('de-DE').format(playerRank.totalScore || 0);

        rankContainer.innerHTML = `
            <div class="account-body-section">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <strong style="color: var(--primary-color); font-size: 1.1em;">
                            ${rankEmoji}Du bist aktuell auf Platz ${rank} im
                            <a href="leaderboard.php" target="_blank" style="color: var(--primary-color); text-decoration: underline; font-weight: 600;">
                                Leaderboard
                            </a>
                        </strong>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5em; font-weight: bold; color: var(--primary-color);">${formattedScore} Punkte</div>
                        <div style="font-size: 0.9em; color: var(--text-color); margin-top: 5px;">Leaderboard-Score</div>
                    </div>
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
            console.warn(`[UI] Keine Design-Settings für Kategorie ${categoryId} gefunden, verwende Fallback`);
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

            console.log(`[UI] Account-Design für Kategorie "${categoryObj.catDescription}" angewendet`);
        } catch (error) {
            console.error('[UI] Fehler beim Anwenden des Account-Designs:', error);
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
                    scoreInfo += `✓ Bestanden (1. Versuch) • ${firstScore} Punkte`;
                } else {
                    scoreInfo += `✗ Nicht bestanden (1. Versuch) • ${firstScore} Punkte`;
                }

                if (attempts > 1 && bestScore !== firstScore) {
                    scoreInfo += `<br>🔄 ${attempts} Versuche • Bester: ${bestScore} Punkte`;
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
                <p>${questionCount} Fragen • Schließe Level ${levelNum - 1} ab</p>
            `;
        } else {
            levelBtn.className = `level-btn ${isLevelUnlocked ? 'level-btn-completed' : ''}`;
            levelBtn.innerHTML = `
                <h3>${isLevelUnlocked ? '✓' : '○'} Level ${levelNum}: ${levelTitle}</h3>
                <p>${questionCount} Fragen${scoreInfo}</p>
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

            // Config & Questions laden
            const configResponse = await fetch('data/config.json');
            const config = await configResponse.json();
            const totalLevels = config.gameSettings?.totalLevels || 15;

            const questionsResponse = await fetch('data/questions.json');
            const questions = await questionsResponse.json();

            // Level nach Kategorien gruppiert rendern
            this.renderLevelsByCategory(playerData, totalLevels, questions);

        } catch (error) {
            console.error('Error loading player:', error);
            document.getElementById('player-info').innerHTML = `
                <div style="color: #ef4444;">
                    Fehler beim Laden der Spielerdaten. Bitte neu anmelden.
                </div>
            `;
        }
    }

    /**
     * Logout
     */
    logout() {
        // Lösche Session Storage
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
        // Versuche aus der ersten Frage zu extrahieren (falls vorhanden)
        // Oder nutze generische Titel
        const titles = {
            1: 'Polkadot Basics',
            2: 'Polkadot Architektur',
            3: 'Economics & Governance',
            4: 'Entwicklung & Tools',
            5: 'Substrate Framework',
            6: 'Runtime & Pallets',
            7: 'Consensus & Finality',
            8: 'Cross-Chain Communication',
            9: 'Governance Deep Dive',
            10: 'Staking & Nomination',
            11: 'Parachain Development',
            12: 'Smart Contracts',
            13: 'OpenGov',
            14: 'Security & Audits',
            15: 'Ecosystem & Use Cases'
        };
        
        return titles[levelNumber] || `Level ${levelNumber}`;
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
            `Frage ${questionNumber}/${totalQuestions}`;
        document.getElementById('current-score').textContent = 
            `Punkte: ${quizEngine.levelState.score}`;

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
        hintBtn.disabled = quizEngine.levelState.hintsRemaining === 0;
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
            hintBox.innerHTML = `<strong>💡 Hinweis:</strong> ${result.hint}`;
            hintBox.style.display = 'block';
            
            document.getElementById('hints-remaining').textContent = result.remaining;
            document.getElementById('hint-btn').disabled = result.remaining === 0;
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
        feedback.textContent = isError ? message : `⏰ +${message} Sekunden!`;
        
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

        const result = quizEngine.answerQuestion(answerIndex);
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

        if (result.timeout) {
            feedbackEl.innerHTML = '⏱️ <strong>Zeit abgelaufen!</strong>';
            feedbackEl.className = 'feedback-message timeout';
            pointsEl.textContent = '0 Punkte';
        } else if (result.correct) {
            feedbackEl.innerHTML = '✅ <strong>Richtig!</strong>';
            feedbackEl.className = 'feedback-message correct';
            pointsEl.textContent = `+${result.points} Punkte`;
        } else {
            feedbackEl.innerHTML = '❌ <strong>Leider falsch!</strong>';
            feedbackEl.className = 'feedback-message incorrect';
            pointsEl.textContent = '0 Punkte';
        }

        timeEl.textContent = `Zeit: ${(result.elapsedTimeMs / 1000).toFixed(3)}s`;
        
        const question = quizEngine.getCurrentQuestion();
        const correctAnswerText = question.answers[result.correctAnswer];
        explanationEl.innerHTML = `
            <p><strong>Richtige Antwort:</strong> ${correctAnswerText}</p>
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
            `${result.correctAnswers}/${result.totalQuestions} (${result.percentage}%)`;
        document.getElementById('result-score').textContent = result.score;
        document.getElementById('result-time').textContent = 
            `${Math.floor(result.time / 60)}:${String(result.time % 60).padStart(2, '0')}`;

        const statusEl = document.getElementById('result-status');
        if (result.passed) {
            statusEl.innerHTML = '✅ <strong>Level bestanden!</strong>';
            statusEl.className = 'result-status passed';
        } else {
            statusEl.innerHTML = '❌ <strong>Level nicht bestanden</strong>';
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
                <strong>⚠️ Fehler beim Speichern</strong><br>
                <small>Dein Ergebnis konnte nicht gespeichert werden. Bitte versuche es erneut.</small>
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
                alert('❌ Der Name muss mindestens 3 Zeichen haben!');
                return;
            }
            
            if (newName.length > 20) {
                alert('❌ Der Name darf maximal 20 Zeichen haben!');
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
                    alert(`❌ Der Name "${newName}" ist bereits vergeben!\n\nBitte wähle einen anderen Namen.`);
                    return;
                }
            } catch (error) {
                console.error('Name check failed:', error);
                alert('⚠️ Konnte Namen-Verfügbarkeit nicht prüfen. Versuche es beim Level-Speichern.');
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
                    nameLabel.innerHTML = `<strong style="color: #374151; font-size: 1.3em;">Willkommen zurück, ${newName}!</strong>`;
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
                alert(`❌ Fehler beim Speichern: ${error.message}\n\nBitte versuche es erneut.`);
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
}

// Globale Instanz
const quizUI = new QuizUI();