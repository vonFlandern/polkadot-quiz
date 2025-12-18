<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Polkadot Quiz - Become a Polkadot Expert!</title>
    
    <!-- Core Styles -->
    <link rel="stylesheet" href="assets/css/quiz-core.css">
    <link rel="stylesheet" href="assets/css/quiz-standalone.css">
    
    <!-- Polkadot.js Core Libraries (müssen ZUERST geladen werden) -->
    <script src="https://unpkg.com/@polkadot/util@12.3.2/bundle-polkadot-util.js"></script>
    <script src="https://unpkg.com/@polkadot/util-crypto@12.3.2/bundle-polkadot-util-crypto.js"></script>
    <script src="https://unpkg.com/@polkadot/types@10.9.1/bundle-polkadot-types.js"></script>
    <script src="https://unpkg.com/@polkadot/api@10.9.1/bundle-polkadot-api.js"></script>
    
    <!-- Polkadot.js Extension API (benötigt die obigen Dependencies) -->
    <script src="https://unpkg.com/@polkadot/extension-dapp@0.46.1/bundle-polkadot-extension-dapp.js"></script>
</head>
<body>
    <div class="quiz-container">
        <!-- Header (Standalone only) -->
        <div class="quiz-header">
            <h1>Polkadot Quiz</h1>
            <p>Become a Polkadot Expert!</p>
        </div>

        <!-- Quiz Content -->
        <div class="quiz-content">

            <!-- Start Screen -->
            <div id="start-screen" class="screen start-screen" style="display: block;">
                <h1>Welcome!</h1>
                <p>Test your knowledge about Polkadot and become an expert.</p>
                <button onclick="quizUI.showWalletConnect()">Start</button>
            </div>

            <!-- Wallet Connect Screen -->
            <div id="wallet-connect-screen" class="screen wallet-connect-screen" style="display: none;">
                <h2>Connect Wallet</h2>
                <p>Connect your Polkadot wallet to play.</p>
                
                <div id="wallet-status" style="display: none;"></div>
                
                <button id="connect-wallet-btn" style="margin-top: 30px;">Connect Wallet</button>

                <div id="accounts-list"></div>

                <div id="player-name-input">
                    <label for="player-name"><strong>Choose your player name:</strong></label>
                    <input type="text" id="player-name" placeholder="Your player name" maxlength="20">
                </div>

                <button id="continue-to-quiz-btn">Continue to Quiz</button>
            </div>

            <!-- Instructions Screen -->
            <div id="anleitung-screen" class="screen anleitung-screen" style="display: none;">
                <h2>📖 Instructions</h2>
                
                <div style="text-align: left; max-width: 600px; margin: 0 auto;">
                    <h3>How does the quiz work?</h3>

                    <h4>🎯 Goal</h4>
                    <p>Answer questions about Polkadot and collect points. The faster you answer, the more points you get!</p>

                    <h4>📊 Levels</h4>
                    <p>The quiz consists of <span id="total-levels-count">15</span> levels with increasing difficulty. To unlock a level, you must pass the previous level.</p>

                    <h4>⏱️ Point System</h4>
                    <ul>
                        <li><strong>Millisecond-precise timing:</strong> Your response time is measured to the millisecond</li>
                        <li><strong>Speed pays off:</strong> The faster you answer, the more points you get</li>
                        <li><strong>Only the first attempt counts:</strong> Only your first attempt per level counts for the leaderboard</li>
                    </ul>

                    <h4>💡 Power-Ups</h4>
                    <p>In each level, you have access to helpful tools:</p>
                    <ul>
                        <li><strong>Hints:</strong> Show a hint for the current question (costs points)</li>
                        <li><strong>Time Extension:</strong> Get additional time (costs points)</li>
                    </ul>

                    <h4>📄 Preparation</h4>
                    <p>Before each level, you can download a PDF with knowledge base. Preparation is optional, but recommended!</p>

                    <h4>🏆 Leaderboard</h4>
                    <p>Your total score from all completed levels determines your position on the leaderboard. Repetitions don't improve your ranking - only the first attempt counts!</p>

                    <h4>🔄 Repetitions</h4>
                    <p>You can repeat each level as many times as you want to practice. These attempts are saved separately and don't count for the leaderboard.</p>
                </div>

                <button id="back-from-anleitung-btn" style="margin-top: 30px;">Back</button>
            </div>

            <!-- Level Overview Screen -->
            <div id="level-overview-screen" class="screen level-overview-screen" style="display: none;">
                <!-- vonFlandern Account (Badge + Info + Menu) -->
                <div id="player-account-info"></div>

                <!-- Account Info Body (Welcome + Leaderboard) -->
                <div id="account-info-body" class="account-body-section">
                    <!-- Welcome / Player Name Input -->
                    <div id="welcome-section"></div>

                    <!-- Leaderboard Info -->
                    <div id="player-rank-info"></div>
                </div>

                <!-- Level Overview -->
                <h2>Level Overview</h2>
                <div id="levels-list"></div>
            </div>

            <!-- Level Intro Screen -->
            <div id="level-intro-screen" class="screen level-intro-screen" style="display: none;">
                <h2 id="level-intro-title"></h2>
                <p id="level-intro-info"></p>

                <div id="level-pdf-download" style="display: none; margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid var(--success-color); border-radius: 8px;">
                    <p style="margin-bottom: 15px;"><strong>📄 Preparation recommended:</strong></p>
                    <p style="margin-bottom: 15px; color: #6b7280;">Download the knowledge base to optimally prepare for this level.</p>
                    <a id="level-pdf-link" href="#" download style="display: inline-block; padding: 12px 24px; background-color: var(--success-color); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s;">
                        📥 <span id="level-pdf-title">Download PDF</span>
                    </a>
                </div>

                <div style="margin: 30px 0;">
                    <p><strong>ℹ️ Level Info:</strong></p>
                    <p>Questions: <span id="level-questions-count"></span></p>
                    <p>Required correct answers: <span id="level-min-correct"></span></p>
                    <p>Available hints: <span id="level-hints-count"></span></p>
                    <p>Available time extensions: <span id="level-timeadds-count"></span></p>
                </div>

                <p><em>💡 Tip: Fast answers = More points!</em></p>

                <button id="start-level-btn">Start Level</button>
            </div>

            <!-- Countdown Screen (NUR beim Level-Start, NICHT am Anfang!) -->
            <div id="countdown-screen" class="screen countdown-screen" style="display: none;">
                <div id="countdown-number">3</div>
            </div>

            <!-- Question Screen -->
            <div id="question-screen" class="screen question-screen" style="display: none;">
                <div class="question-header">
                    <div>
                        <strong id="question-number">Question 1/3</strong>
                        <div id="current-score">Points: 0</div>
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
                    <button id="timeadd-btn">⏰ +Time (<span id="timeadds-remaining">2</span>)</button>
                </div>
            </div>

            <!-- Feedback Screen -->
            <div id="feedback-screen" class="screen feedback-screen" style="display: none;">
                <div id="feedback-message" class="feedback-message"></div>
                <div id="feedback-points"></div>
                <div id="feedback-time"></div>

                <div id="feedback-explanation"></div>

                <button id="next-question-btn">Continue to Next Question</button>
            </div>

            <!-- Level Complete Screen -->
            <div id="level-complete-screen" class="screen level-complete-screen" style="display: none;">
                <h2>Level Completed!</h2>

                <div class="result-stats">
                    <p><strong>Correct Answers:</strong> <span id="result-correct"></span></p>
                    <p><strong>Points:</strong> <span id="result-score"></span></p>
                    <p><strong>Time:</strong> <span id="result-time"></span></p>
                </div>

                <div id="result-status" class="result-status"></div>

                <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; margin-top: 20px;">
                    <button id="back-to-overview-btn">Back to Overview</button>
                    <a href="leaderboard.php" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s; text-align: center;">
                        🏆 To Leaderboard
                    </a>
                </div>
            </div>

        </div>

        <!-- Account Overview Screen -->
        <div id="account-overview-screen" class="screen account-overview-screen" style="display: none;">
            <!-- Account Header (gleiche Struktur wie Level Overview) -->
            <div id="account-overview-header"></div>

            <!-- Network Selector -->
            <div class="network-selector-container">
                <label for="network-selector">Network:</label>
                <select id="network-selector">
                    <!-- Wird dynamisch aus Registry gefüllt -->
                </select>
                <button id="show-more-networks-btn" style="display: none;">Show More Networks...</button>
            </div>
            
            <!-- Address Display Section -->
            <div class="address-display-section">
                <div class="address-toggle-header">
                    <h3>Your Addresses</h3>
                    <button id="addr-format-toggle" class="address-toggle-btn" title="Toggle between address formats">
                        Show Generic
                    </button>
                </div>
                <div class="address-row generic-address-row">
                    <span class="addr-label">Generic (Universal):</span>
                    <code class="generic-addr"></code>
                    <button class="copy-btn" data-copy="generic" title="Copy to clipboard">📋</button>
                </div>
                <div class="address-row network-address-row">
                    <span class="addr-label network-label">Network:</span>
                    <code class="network-addr"></code>
                    <button class="copy-btn" data-copy="network" title="Copy to clipboard">📋</button>
                </div>
            </div>

            <!-- Loading Overlay -->
            <div id="onchain-loading-overlay" style="display: none;">
                <div class="spinner">🔄</div>
                <p>Loading blockchain data...</p>
            </div>

            <!-- On-Chain Data Body -->
            <div id="onchain-data-body" class="account-body-section">
                <!-- Warning Banner (conditional) -->
                <div id="onchain-warning" class="onchain-warning" style="display: none;">
                    ⚠️ Live data unavailable, showing cached data
                </div>

                <!-- Account Info Section -->
                <div class="onchain-section">
                    <h3>📋 Account Information</h3>
                    <div id="account-section"></div>
                </div>

                <!-- Balances Section -->
                <div class="onchain-section">
                    <h3>💰 Balances</h3>
                    <div id="balances-section"></div>
                </div>

                <!-- Staking Section -->
                <div class="onchain-section" id="staking-section-wrapper" style="display: none;">
                    <h3>🔒 Staking</h3>
                    <div id="staking-section"></div>
                </div>

                <!-- Governance Section -->
                <div class="onchain-section">
                    <h3>🗳️ Governance</h3>
                    <div id="governance-section"></div>
                </div>

                <!-- Footer with Refresh and Last Update -->
                <div class="onchain-footer">
                    <button id="refresh-onchain-btn">🔄 Refresh Data</button>
                    <small id="onchain-last-update">Last updated: --</small>
                </div>
            </div>

            <button id="back-from-account-overview-btn" style="margin-top: 20px;">Back to Level Overview</button>
        </div>

        <!-- Modal for Name Change -->
        <div id="change-name-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h3 style="margin-top: 0; color: var(--text-color);">Change Player Name</h3>
                <input type="text" id="modal-player-name-input" placeholder="Your new player name" maxlength="20"
                    style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #d1d5db; border-radius: 6px; margin-bottom: 20px; box-sizing: border-box;">
                <div style="display: flex; gap: 10px;">
                    <button id="modal-save-name-btn" style="background: var(--success-color); flex: 1; padding: 12px; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; color: white; cursor: pointer;">
                        Save
                    </button>
                    <button id="modal-cancel-name-btn" style="background: #6b7280; flex: 1; padding: 12px; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; color: white; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>

        <!-- Footer (Standalone only) -->
        <div class="quiz-footer">
            <p>Polkadot Quiz by <a href="https://vonflandern.org" target="_blank">vonFlandern</a></p>
        </div>
    </div>

    <!-- Scripts -->
    <script src="assets/js/wallet.js"></script>
    <script src="assets/js/timer.js"></script>
    <script src="assets/js/onchain-service.js"></script>
    <script src="assets/js/quiz-engine.js"></script>
    <script src="assets/js/ui.js"></script>

    <script>
        // Initialize Quiz on Load
        document.addEventListener('DOMContentLoaded', async () => {
            const initialized = await quizEngine.initialize();
            if (!initialized) {
                alert('Error loading quiz. Please reload the page.');
            }
        });
    </script>
</body>
</html>