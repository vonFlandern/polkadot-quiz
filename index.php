<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Polkadot Quiz - Werde zum Polkadot-Experten!</title>
    
    <!-- Core Styles -->
    <link rel="stylesheet" href="assets/css/quiz-core.css">
    <link rel="stylesheet" href="assets/css/quiz-standalone.css">
    
    <!-- Polkadot.js Extension API -->
    <script src="https://unpkg.com/@polkadot/extension-dapp@0.46.1/bundle-polkadot-extension-dapp.js"></script>
</head>
<body>
    <div class="quiz-container">
        <!-- Header (nur Standalone) -->
        <div class="quiz-header">
            <h1>Polkadot Quiz</h1>
            <p>Werde zum Polkadot-Experten!</p>
        </div>

        <!-- Quiz Content -->
        <div class="quiz-content">
            
            <!-- Start Screen -->
            <div id="start-screen" class="screen start-screen" style="display: block;">
                <h1>Willkommen!</h1>
                <p>Teste dein Wissen über Polkadot und werde zum Experten.</p>
                <button onclick="quizUI.showWalletConnect()">Start</button>
            </div>

            <!-- Wallet Connect Screen -->
            <div id="wallet-connect-screen" class="screen wallet-connect-screen" style="display: none;">
                <h2>Wallet verbinden</h2>
                <p>Verbinde dein Polkadot Wallet, um zu spielen.</p>
                
                <div id="wallet-status" style="display: none;"></div>
                
                <button id="connect-wallet-btn" style="margin-top: 30px;">Wallet verbinden</button>
                
                <div id="accounts-list"></div>
                
                <div id="player-name-input">
                    <label for="player-name"><strong>Wähle deinen Spielernamen:</strong></label>
                    <input type="text" id="player-name" placeholder="Dein Spielername" maxlength="20">
                </div>
                
                <button id="continue-to-quiz-btn">Weiter zum Quiz</button>
            </div>

            <!-- Anleitung Screen -->
            <div id="anleitung-screen" class="screen anleitung-screen" style="display: none;">
                <h2>📖 Anleitung</h2>
                
                <div style="text-align: left; max-width: 600px; margin: 0 auto;">
                    <h3>Wie funktioniert das Quiz?</h3>
                    
                    <h4>🎯 Ziel</h4>
                    <p>Beantworte Fragen über Polkadot und sammle Punkte. Je schneller du antwortest, desto mehr Punkte erhältst du!</p>
                    
                    <h4>📊 Levels</h4>
                    <p>Das Quiz besteht aus 15 Levels mit steigendem Schwierigkeitsgrad. Um ein Level freizuschalten, musst du das vorherige Level bestehen (mindestens 70% richtige Antworten).</p>
                    
                    <h4>⏱️ Punktesystem</h4>
                    <ul>
                        <li><strong>Millisekundengenaue Zeitmessung:</strong> Deine Antwortzeit wird auf die Millisekunde genau gemessen</li>
                        <li><strong>Schnelligkeit zahlt sich aus:</strong> Je schneller du antwortest, desto mehr Punkte bekommst du</li>
                        <li><strong>Nur der erste Versuch zählt:</strong> Für das Leaderboard wird nur dein erster Versuch pro Level gewertet</li>
                    </ul>
                    
                    <h4>💡 Power-Ups</h4>
                    <p>In jedem Level stehen dir Hilfsmittel zur Verfügung:</p>
                    <ul>
                        <li><strong>Hints (3x):</strong> Zeige einen Hinweis zur aktuellen Frage an (kostet Punkte)</li>
                        <li><strong>Zeitverlängerung (2x):</strong> Erhalte zusätzliche Zeit (kostet Punkte)</li>
                    </ul>
                    
                    <h4>📄 Vorbereitung</h4>
                    <p>Vor jedem Level kannst du ein PDF mit Wissensbasis herunterladen. Die Vorbereitung ist optional, aber empfohlen!</p>
                    
                    <h4>🏆 Leaderboard</h4>
                    <p>Deine Gesamtpunktzahl aus allen abgeschlossenen Levels bestimmt deine Position im Leaderboard. Wiederholungen verbessern nicht deine Platzierung - nur der erste Versuch zählt!</p>
                    
                    <h4>🔄 Wiederholungen</h4>
                    <p>Du kannst jedes Level beliebig oft wiederholen, um zu üben. Diese Versuche werden separat gespeichert und zählen nicht für das Leaderboard.</p>
                </div>
                
                <button id="back-from-anleitung-btn" style="margin-top: 30px;">Zurück</button>
            </div>

            <!-- Level Overview Screen -->
            <div id="level-overview-screen" class="screen level-overview-screen" style="display: none;">
                <!-- vonFlandern Account (Badge + Info + Menü) -->
                <div id="player-account-info"></div>

                <!-- Begrüßung / Spielernamen-Eingabe -->
                <div id="welcome-section"></div>

                <!-- Leaderboard-Info -->
                <div id="player-rank-info"></div>

                <!-- Level-Übersicht -->
                <h2>Level-Übersicht</h2>
                <div id="levels-list"></div>
            </div>

            <!-- Level Intro Screen -->
            <div id="level-intro-screen" class="screen level-intro-screen" style="display: none;">
                <h2 id="level-intro-title"></h2>
                <p id="level-intro-info"></p>
                
                <div id="level-pdf-download" style="display: none; margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid var(--success-color); border-radius: 8px;">
                    <p style="margin-bottom: 15px;"><strong>📄 Vorbereitung empfohlen:</strong></p>
                    <p style="margin-bottom: 15px; color: #6b7280;">Lade dir die Wissensbasis herunter, um dich optimal auf dieses Level vorzubereiten.</p>
                    <a id="level-pdf-link" href="#" download style="display: inline-block; padding: 12px 24px; background-color: var(--success-color); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s;">
                        📥 <span id="level-pdf-title">PDF herunterladen</span>
                    </a>
                </div>
                
                <div style="margin: 30px 0;">
                    <p><strong>ℹ️ Level-Info:</strong></p>
                    <p>Fragen: <span id="level-questions-count"></span></p>
                    <p>Benötigte richtige Antworten: 70%</p>
                    <p>Verfügbare Hints: 3</p>
                    <p>Verfügbare Zeitverlängerungen: 2</p>
                </div>
                
                <p><em>💡 Tipp: Schnelle Antworten = Mehr Punkte!</em></p>
                
                <button id="start-level-btn">Level starten</button>
            </div>

            <!-- Countdown Screen (NUR beim Level-Start, NICHT am Anfang!) -->
            <div id="countdown-screen" class="screen countdown-screen" style="display: none;">
                <div id="countdown-number">3</div>
            </div>

            <!-- Question Screen -->
            <div id="question-screen" class="screen question-screen" style="display: none;">
                <div class="question-header">
                    <div>
                        <strong id="question-number">Frage 1/3</strong>
                        <div id="current-score">Punkte: 0</div>
                    </div>
                    <div id="timer-display">00:00</div>
                </div>

                <div class="question-content">
                    <div id="question-text"></div>
                    <div id="answers-container"></div>
                </div>

                <div id="hint-box"></div>

                <div class="powerups">
                    <button id="hint-btn">💡 Hint (<span id="hints-remaining">3</span>)</button>
                    <button id="timeadd-btn">⏰ +Zeit (<span id="timeadds-remaining">2</span>)</button>
                </div>
            </div>

            <!-- Feedback Screen -->
            <div id="feedback-screen" class="screen feedback-screen" style="display: none;">
                <div id="feedback-message" class="feedback-message"></div>
                <div id="feedback-points"></div>
                <div id="feedback-time"></div>
                
                <div id="feedback-explanation"></div>
                
                <button id="next-question-btn">Weiter zur nächsten Frage</button>
            </div>

            <!-- Level Complete Screen -->
            <div id="level-complete-screen" class="screen level-complete-screen" style="display: none;">
                <h2>Level abgeschlossen!</h2>
                
                <div class="result-stats">
                    <p><strong>Richtige Antworten:</strong> <span id="result-correct"></span></p>
                    <p><strong>Punkte:</strong> <span id="result-score"></span></p>
                    <p><strong>Zeit:</strong> <span id="result-time"></span></p>
                </div>
                
                <div id="result-status" class="result-status"></div>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; margin-top: 20px;">
                    <button id="back-to-overview-btn">Zurück zur Übersicht</button>
                    <a href="leaderboard.php" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s; text-align: center;">
                        🏆 Zum Leaderboard
                    </a>
                </div>
            </div>

        </div>

        <!-- Modal für Name-Änderung -->
        <div id="change-name-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h3 style="margin-top: 0; color: var(--text-color);">Spielername ändern</h3>
                <input type="text" id="modal-player-name-input" placeholder="Dein neuer Spielername" maxlength="20" 
                    style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #d1d5db; border-radius: 6px; margin-bottom: 20px; box-sizing: border-box;">
                <div style="display: flex; gap: 10px;">
                    <button id="modal-save-name-btn" style="background: var(--success-color); flex: 1; padding: 12px; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; color: white; cursor: pointer;">
                        Speichern
                    </button>
                    <button id="modal-cancel-name-btn" style="background: #6b7280; flex: 1; padding: 12px; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; color: white; cursor: pointer;">
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>

        <!-- Footer (nur Standalone) -->
        <div class="quiz-footer">
            <p>Polkadot Quiz by <a href="https://vonflandern.org" target="_blank">vonFlandern</a></p>
        </div>
    </div>

    <!-- Scripts -->
    <script src="assets/js/wallet.js"></script>
    <script src="assets/js/timer.js"></script>
    <script src="assets/js/quiz-engine.js"></script>
    <script src="assets/js/ui.js"></script>

    <script>
        // Initialisiere Quiz beim Laden
        document.addEventListener('DOMContentLoaded', async () => {
            const initialized = await quizEngine.initialize();
            if (!initialized) {
                alert('Fehler beim Laden des Quiz. Bitte Seite neu laden.');
            }
        });
    </script>
</body>
</html>