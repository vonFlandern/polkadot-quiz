/**
 * UI Management für Polkadot Quiz
 */

class QuizUI {
    constructor() {
        this.currentScreen = 'start';
        this.currentHintUsedThisQuestion = false;
        this.currentTimeAddUsedThisQuestion = false;
        this.eventListenersInitialized = false; // Verhindert Mehrfach-Registrierung
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
                            
                            // Beide Buttons nebeneinander mit Space
                            const buttonsDiv = document.createElement('div');
                            buttonsDiv.id = 'action-buttons';
                            buttonsDiv.style.cssText = 'display: flex; gap: 15px; margin-top: 15px;';
                            buttonsDiv.innerHTML = `
                                <button id="continue-quiz-btn" type="button" style="flex: 1; padding: 15px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Weiter zum Quiz
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
                                
                                // "Name ändern" Button öffnet Modal
                                document.getElementById('open-change-name-btn').addEventListener('click', () => {
                                    this.openChangeNameModal(account);
                                });
                            }, 0);
                            
                        } else {
                            // Neuer Spieler: Normaler Input
                            const nameLabel = document.querySelector('label[for="player-name"]');
                            if (nameLabel) {
                                nameLabel.innerHTML = '<strong>Wähle deinen Spielernamen:</strong>';
                            }
                            
                            const nameInput = document.getElementById('player-name');
                            nameInput.style.display = 'block';
                            nameInput.disabled = false;
                            
                            // Stelle sicher, dass Submit-Button existiert
                            let originalSubmitBtn = document.getElementById('continue-to-quiz-btn');
                            if (!originalSubmitBtn) {
                                // Button wurde entfernt, erstelle neuen
                                originalSubmitBtn = document.createElement('button');
                                originalSubmitBtn.id = 'continue-to-quiz-btn';
                                originalSubmitBtn.textContent = 'Weiter zum Quiz';
                                playerNameInput.appendChild(originalSubmitBtn);
                            } else {
                                originalSubmitBtn.style.display = 'block';
                            }
                            
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
                        }
                        
                        continueBtn.style.display = 'block';
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
     * Zeige Level-Übersicht
     */
    async showLevelOverview() {
        this.showScreen('level-overview');

        const walletAddress = sessionStorage.getItem('walletAddress');
        const playerName = sessionStorage.getItem('playerName');

        // Lade Spieler-Daten um Polkadot-Adresse zu bekommen
        let displayAddress = walletAddress ? walletAddress.substring(0, 12) + '...' : '';
        
        try {
            const playerData = await quizEngine.loadPlayer(walletAddress);
            
            console.log('Player data:', playerData);
            
            // Wenn Polkadot-Adresse verfügbar, nutze diese
            if (playerData.polkadotAddress) {
                displayAddress = playerData.polkadotAddress.substring(0, 12) + '...';
            } else if (playerData.found && playerData.player && playerData.player.polkadotAddress) {
                displayAddress = playerData.player.polkadotAddress.substring(0, 12) + '...';
            }

            // Lade Leaderboard um Rang zu ermitteln
            let rankInfo = '';
            try {
                const leaderboardResponse = await fetch('api/get-leaderboard.php?limit=100');
                const leaderboardData = await leaderboardResponse.json();
                
                if (leaderboardData && leaderboardData.leaderboard) {
                    // Finde eigenen Eintrag
                    const ownEntry = leaderboardData.leaderboard.find(p => p.playerName === playerName);
                    
                    if (ownEntry) {
                        const totalPlayers = leaderboardData.total;
                        let rankEmoji = '';
                        
                        if (ownEntry.rank === 1) rankEmoji = '🥇';
                        else if (ownEntry.rank === 2) rankEmoji = '🥈';
                        else if (ownEntry.rank === 3) rankEmoji = '🥉';
                        
                        const formattedScore = new Intl.NumberFormat('de-DE').format(ownEntry.totalScore);
                        
                        rankInfo = `
                            <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border: 2px solid var(--primary-color);">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                    <div>
                                        <strong style="color: var(--primary-color); font-size: 1.1em;">${rankEmoji} Du bist aktuell auf Platz ${ownEntry.rank} im Leaderboard</strong>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.2em; font-weight: bold; color: var(--primary-color);">${formattedScore} Punkte</div>
                                        <div style="font-size: 0.85em; color: #6b7280;">Leaderboard-Score</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }
            } catch (error) {
                console.warn('Could not load leaderboard for rank display:', error);
                // Kein Problem, zeige einfach keine Rang-Info
            }
            
            // Zeige Spieler-Info mit Logout-Button und Rang
            document.getElementById('player-info').innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${playerName}</strong><br>
                        <small style="color: var(--primary-color);">${displayAddress}</small>
                    </div>
                    <button onclick="quizUI.logout()" style="background-color: #ef4444;">Abmelden</button>
                </div>
                ${rankInfo}
                <div style="text-align: center; margin-top: 15px;">
                    <a href="leaderboard.php" target="_blank" style="display: block; padding: 12px 24px; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s;">
                        🏆 Zum Leaderboard
                    </a>
                </div>
            `;

            const levelsContainer = document.getElementById('levels-list');
            levelsContainer.innerHTML = '';

            // Lade Config für Level-Info
            let config = null;
            try {
                const configResponse = await fetch('data/config.json');
                config = await configResponse.json();
            } catch (error) {
                console.error('Could not load config:', error);
            }

            // Lade Questions für Fragen-Anzahl
            let questions = null;
            try {
                const questionsResponse = await fetch('data/questions.json');
                questions = await questionsResponse.json();
            } catch (error) {
                console.error('Could not load questions:', error);
            }

            // Bestimme welche Level verfügbar sind
            const playerLevels = playerData.player?.levels || {};
            
            // Finde alle Level die gespielt wurden (für Anzeige)
            const playedLevels = Object.keys(playerLevels).map(l => parseInt(l));
            
            // Finde alle Level die freigeschaltet sind (für Progression)
            const unlockedLevels = [];
            Object.keys(playerLevels).forEach(levelKey => {
                const levelNum = parseInt(levelKey);
                const levelStats = playerLevels[levelKey];
                
                // Level gilt als unlocked wenn:
                // 1. unlocked Flag gesetzt ist, ODER
                // 2. firstAttempt bestanden wurde (Rückwärtskompatibilität)
                const isUnlockedLevel = levelStats.unlocked || levelStats.firstAttempt?.passed || false;
                
                if (isUnlockedLevel) {
                    unlockedLevels.push(levelNum);
                }
            });
            
            const highestUnlockedLevel = unlockedLevels.length > 0 ? Math.max(...unlockedLevels) : 0;
            
            console.log('🎮 Level System Debug:', {
                playerLevels: playerLevels,
                playedLevels: playedLevels,
                unlockedLevels: unlockedLevels,
                highestUnlockedLevel: highestUnlockedLevel
            });

            // Erstelle Level-Buttons dynamisch
            const totalLevels = config?.totalLevels || 15;
            
            for (let levelNum = 1; levelNum <= totalLevels; levelNum++) {
                const levelKey = `level${levelNum}`;
                const levelData = questions?.[levelKey];
                
                // Prüfe ob Level existiert in questions.json
                if (!levelData) {
                    // Level existiert noch nicht - zeige als "Coming Soon"
                    if (levelNum <= 3) { // Nur die ersten 3 als Coming Soon
                        const levelBtn = document.createElement('button');
                        levelBtn.className = 'level-btn level-btn-locked';
                        levelBtn.disabled = true;
                        levelBtn.innerHTML = `
                            <h3>🔒 Level ${levelNum}: Coming Soon</h3>
                            <p>Wird bald verfügbar sein</p>
                        `;
                        levelsContainer.appendChild(levelBtn);
                    }
                    continue;
                }

                // Prüfe ob Level freigeschaltet ist
                const isUnlocked = levelNum === 1 || highestUnlockedLevel >= (levelNum - 1);
                const isPlayed = playedLevels.includes(levelNum);
                const isLevelUnlocked = unlockedLevels.includes(levelNum);
                
                // Hole Level-Titel
                const levelTitle = this.getLevelTitle(levelNum, levelData);
                const questionCount = levelData.questions?.length || 0;
                
                // Hole Score falls vorhanden
                // WICHTIG: Level-Keys können Strings sein ("1", "2") oder Integers (1, 2)
                const playerLevelKey = levelNum.toString();
                let scoreInfo = '';
                if (isPlayed && (playerLevels[levelNum] || playerLevels[playerLevelKey])) {
                    const levelStats = playerLevels[levelNum] || playerLevels[playerLevelKey];
                    
                    // firstAttempt zählt für Leaderboard/Score-Anzeige
                    const firstAttempt = levelStats.firstAttempt || levelStats;
                    const firstScore = firstAttempt.score || 0;
                    const firstPassed = firstAttempt.passed || false;
                    
                    // unlocked zeigt ob Level freigeschaltet ist (kann durch Wiederholung bestanden werden)
                    const levelUnlockedByRepeat = levelStats.unlocked || firstPassed;
                    
                    // bestAttempt für zusätzliche Info
                    const bestAttempt = levelStats.bestAttempt;
                    const attempts = levelStats.attempts || 1;
                    
                    console.log(`📊 Level ${levelNum} Stats:`, { 
                        levelStats, 
                        firstAttempt, 
                        firstScore, 
                        firstPassed,
                        levelUnlockedByRepeat,
                        bestAttempt,
                        attempts
                    });
                    
                    // Zeige firstAttempt Score
                    if (firstPassed) {
                        scoreInfo = `<br><small style="color: var(--success-color);">✓ Bestanden (1. Versuch) • ${firstScore} Punkte</small>`;
                    } else if (levelUnlockedByRepeat && bestAttempt && bestAttempt.passed) {
                        // Erstes Mal nicht bestanden, aber später schon
                        const bestScore = bestAttempt.score || 0;
                        scoreInfo = `<br><small style="color: var(--success-color);">✓ Bestanden (Versuch ${attempts}) • Bester Score: ${bestScore}</small>`;
                        scoreInfo += `<br><small style="color: #9ca3af; font-size: 0.85em;">1. Versuch: ${firstScore} Punkte</small>`;
                    } else {
                        // Nicht bestanden
                        scoreInfo = `<br><small style="color: #f59e0b;">○ Nicht bestanden • ${firstScore} Punkte</small>`;
                        if (attempts > 1) {
                            scoreInfo += `<br><small style="color: #9ca3af; font-size: 0.85em;">${attempts} Versuche</small>`;
                        }
                    }
                }

                const levelBtn = document.createElement('button');
                
                if (!isUnlocked) {
                    // Gesperrt
                    levelBtn.className = 'level-btn level-btn-locked';
                    levelBtn.disabled = true;
                    levelBtn.innerHTML = `
                        <h3>🔒 Level ${levelNum}: ${levelTitle}</h3>
                        <p>${questionCount} Fragen • Schließe Level ${levelNum - 1} ab</p>
                    `;
                } else {
                    // Freigeschaltet
                    levelBtn.className = `level-btn ${isLevelUnlocked ? 'level-btn-completed' : ''}`;
                    levelBtn.innerHTML = `
                        <h3>${isLevelUnlocked ? '✓' : '○'} Level ${levelNum}: ${levelTitle}</h3>
                        <p>${questionCount} Fragen${scoreInfo}</p>
                    `;
                    levelBtn.addEventListener('click', () => {
                        this.showLevelIntro(levelNum);
                    });
                }
                
                levelsContainer.appendChild(levelBtn);
            }

        } catch (error) {
            console.error('Error loading player:', error);
            
            // Fallback: Zeige Generic-Adresse (12 Zeichen)
            document.getElementById('player-info').innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${playerName}</strong><br>
                        <small style="color: var(--primary-color);">${displayAddress}</small>
                    </div>
                    <button onclick="quizUI.logout()" style="background-color: #ef4444;">Abmelden</button>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <a href="leaderboard.php" target="_blank" style="display: block; padding: 12px 24px; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s;">
                        🏆 Zum Leaderboard
                    </a>
                </div>
            `;
            
            // Zeige Level 1 als Fallback
            const levelsContainer = document.getElementById('levels-list');
            levelsContainer.innerHTML = '';
            
            const levelBtn = document.createElement('button');
            levelBtn.className = 'level-btn';
            levelBtn.innerHTML = `
                <h3>○ Level 1: Polkadot Basics</h3>
                <p>3 Fragen</p>
            `;
            levelBtn.addEventListener('click', () => {
                this.showLevelIntro(1);
            });
            levelsContainer.appendChild(levelBtn);
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
     * Zeige Level-Intro
     */
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

        const startBtn = document.getElementById('start-level-btn');
        startBtn.onclick = () => {
            this.startCountdown(levelNumber);
        };
    }

    /**
     * Countdown vor Level-Start
     */
    startCountdown(levelNumber) {
        this.showScreen('countdown');

        const countdownEl = document.getElementById('countdown-number');
        let count = 3;

        const interval = setInterval(() => {
            if (count > 0) {
                countdownEl.textContent = count;
                count--;
            } else {
                clearInterval(interval);
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