<?php
/**
 * Polkadot Quiz - Public Leaderboard
 * Öffentliche Bestenliste ohne Login-Pflicht
 */

require_once 'config.php';
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leaderboard - Polkadot Quiz</title>
    
    <!-- Core Styles -->
    <link rel="stylesheet" href="assets/css/quiz-core.css">
    
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .leaderboard-container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .leaderboard-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }

        .leaderboard-header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
        }

        .leaderboard-header p {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1em;
        }

        .leaderboard-controls {
            background-color: #f9fafb;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            border-bottom: 2px solid var(--border-color);
        }

        .search-container {
            display: flex;
            gap: 10px;
            align-items: center;
            flex: 1;
        }

        #player-search-input {
            flex: 1;
            max-width: 400px;
            padding: 10px 15px;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            font-size: 1em;
            transition: border-color 0.2s;
        }

        #player-search-input:focus {
            outline: none;
            border-color: var(--primary-color);
        }

        #player-search-btn,
        #show-all-btn {
            padding: 10px 20px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }

        #player-search-btn:hover,
        #show-all-btn:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }

        #show-all-btn {
            background-color: #6b7280;
        }

        .refresh-info {
            color: #6b7280;
            font-size: 1em;
            font-weight: 600;
        }

        #total-players-display {
            color: var(--primary-color);
            font-weight: 700;
        }

        /* Highlight für gesuchten Spieler */
        .leaderboard-table tbody tr.search-highlight {
            background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid var(--warning-color);
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .leaderboard-table tbody tr.search-highlight:hover {
            background: linear-gradient(90deg, #fde68a 0%, #fcd34d 100%);
        }

        /* Kontext-Zeilen (darüber) */
        .leaderboard-table tbody tr.search-context {
            opacity: 0.7;
        }

        .leaderboard-content {
            padding: 20px;
        }

        .loading {
            text-align: center;
            padding: 60px 20px;
            color: #6b7280;
        }

        .leaderboard-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 8px;
        }

        .leaderboard-table thead {
            background-color: #f3f4f6;
        }

        .leaderboard-table th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: var(--text-color);
            border-bottom: 2px solid var(--border-color);
        }

        .leaderboard-table th.center {
            text-align: center;
        }

        .leaderboard-table th.right {
            text-align: right;
        }

        .leaderboard-table tbody tr {
            background-color: #f9fafb;
            transition: all 0.2s;
        }

        .leaderboard-table tbody tr:hover {
            background-color: #f3f4f6;
            transform: scale(1.01);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .leaderboard-table td {
            padding: 15px;
            border-bottom: 1px solid var(--border-color);
        }

        .leaderboard-table td.center {
            text-align: center;
        }

        .leaderboard-table td.right {
            text-align: right;
        }

        /* Rang-Styling */
        .rank {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--text-color);
            min-width: 50px;
            display: inline-block;
        }

        .rank.top1 {
            color: #FFD700;
            font-size: 2em;
        }

        .rank.top2 {
            color: #C0C0C0;
            font-size: 1.8em;
        }

        .rank.top3 {
            color: #CD7F32;
            font-size: 1.6em;
        }

        /* Spielername */
        .player-name {
            font-weight: 600;
            color: var(--text-color);
            font-size: 1.1em;
        }

        /* Adresse */
        .player-address {
            font-family: monospace;
            color: #6b7280;
            font-size: 0.85em;
        }

        /* Score */
        .score {
            font-weight: bold;
            color: var(--primary-color);
            font-size: 1.2em;
        }

        /* Zeit */
        .time {
            color: #6b7280;
        }

        /* Level Badge */
        .level-badge {
            background-color: var(--success-color);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.9em;
            font-weight: 600;
        }

        /* Hints */
        .hints {
            color: #f59e0b;
            font-weight: 600;
        }

        /* Time-Adds */
        .time-adds {
            color: #3b82f6;
            font-weight: 600;
        }

        /* Questions */
        .questions {
            color: #6b7280;
            font-weight: 600;
        }

        /* Percentage */
        .percentage {
            color: var(--primary-color);
            font-weight: 700;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6b7280;
        }

        .empty-state h3 {
            color: var(--text-color);
            margin-bottom: 10px;
        }

        /* Quiz Link */
        .quiz-link {
            text-align: center;
            padding: 30px 20px;
            background-color: #f9fafb;
            border-top: 2px solid var(--border-color);
        }

        .quiz-link a {
            display: inline-block;
            padding: 15px 40px;
            background-color: var(--primary-color);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1.1em;
            transition: all 0.2s;
        }

        .quiz-link a:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }

        /* Footer */
        .leaderboard-footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 0.9em;
            border-top: 2px solid var(--border-color);
        }

        .leaderboard-footer a {
            color: var(--primary-color);
            text-decoration: none;
        }

        .leaderboard-footer a:hover {
            text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .leaderboard-header h1 {
                font-size: 1.8em;
            }

            .leaderboard-controls {
                flex-direction: column;
                gap: 15px;
            }

            .search-container {
                width: 100%;
                flex-direction: column;
            }

            #player-search-input {
                max-width: 100%;
            }

            .leaderboard-table {
                font-size: 0.9em;
            }

            .leaderboard-table th,
            .leaderboard-table td {
                padding: 10px 5px;
            }

            /* Hide address on mobile */
            .hide-mobile {
                display: none;
            }
        }

        /* Category Badge in Leaderboard */
        .leaderboard-badge {
            width: 24px;
            height: 24px;
            object-fit: contain;
        }
    </style>
</head>
<body>
    <div class="leaderboard-container">
        <!-- Header -->
        <div class="leaderboard-header">
            <h1>🏆 Leaderboard</h1>
            <p>Die besten Polkadot-Quiz Spieler</p>
        </div>

        <!-- Controls -->
        <div class="leaderboard-controls">
            <div class="search-container">
                <input type="text" id="player-search-input" placeholder="Spielername suchen...">
                <button id="player-search-btn">Suchen</button>
                <button id="show-all-btn" style="display: none;">Alle anzeigen</button>
            </div>
            <div class="refresh-info">
                <span id="total-players-display">Lädt...</span>
            </div>
        </div>

        <!-- Content -->
        <div class="leaderboard-content">
            <div id="loading" class="loading">
                <p>⏳ Lade Leaderboard...</p>
            </div>

            <div id="leaderboard-table" style="display: none;">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th class="center">Rang</th>
                            <th>Spieler</th>
                            <th class="center hide-mobile">Belt</th>
                            <th class="right">Punkte</th>
                            <th class="center">Level</th>
                            <th class="center hide-mobile">Fragen</th>
                            <th class="center hide-mobile">%</th>
                            <th class="center hide-mobile">Zeit</th>
                            <th class="center hide-mobile">Time+</th>
                            <th class="center hide-mobile">Hints</th>
                        </tr>
                    </thead>
                    <tbody id="leaderboard-body">
                        <!-- Filled by JavaScript -->
                    </tbody>
                </table>
            </div>

            <div id="empty-state" class="empty-state" style="display: none;">
                <h3>Noch keine Spieler</h3>
                <p>Sei der Erste und starte das Quiz!</p>
            </div>
        </div>

        <!-- Quiz Link -->
        <div class="quiz-link">
            <a href="index.php">🎮 Zum Quiz</a>
        </div>

        <!-- Footer -->
        <div class="leaderboard-footer">
            <p>Polkadot Quiz by <a href="https://vonflandern.org" target="_blank">vonFlandern</a></p>
            <p style="margin-top: 10px; font-size: 0.85em;" id="last-update">
                Lädt...
            </p>
            <p style="margin-top: 5px; font-size: 0.85em;">
                Nur First-Attempt Scores zählen fürs Ranking
            </p>
        </div>
    </div>

    <script>
        /**
         * Leaderboard Manager
         */
        const leaderboard = {
            data: null,
            categories: [],

            /**
             * Initialisierung
             */
            async init() {
                await this.loadCategories();
                await this.loadLeaderboard();
                this.updateLastUpdate();

                // Event Listener für Suche
                const searchBtn = document.getElementById('player-search-btn');
                const searchInput = document.getElementById('player-search-input');
                const showAllBtn = document.getElementById('show-all-btn');

                searchBtn.addEventListener('click', () => this.searchPlayer());
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.searchPlayer();
                });
                showAllBtn.addEventListener('click', () => this.showAllPlayers());

                // Auto-Refresh alle 30 Sekunden
                setInterval(() => {
                    this.loadLeaderboard(true);
                }, 30000);
            },

            /**
             * Lade Categories
             */
            async loadCategories() {
                try {
                    const response = await fetch('api/get-categories.php');
                    const data = await response.json();
                    if (data.success && data.categories) {
                        this.categories = data.categories;
                        console.log('✅ Categories loaded:', this.categories);
                    } else {
                        this.categories = [];
                        console.warn('⚠️ No categories found in response');
                    }
                } catch (error) {
                    console.error('❌ Failed to load categories:', error);
                    this.categories = [];
                }
            },

            /**
             * Hole Category by ID
             */
            getCategoryById(catId) {
                return this.categories.find(c => c.catId === catId) || null;
            },

            /**
             * Lade Leaderboard von API (alle Einträge)
             */
            async loadLeaderboard(silent = false) {
                try {
                    if (!silent) {
                        document.getElementById('loading').style.display = 'block';
                        document.getElementById('leaderboard-table').style.display = 'none';
                        document.getElementById('empty-state').style.display = 'none';
                    }

                    // Lade ALLE Spieler (limit=1000 als praktisches Maximum)
                    const response = await fetch(`api/get-leaderboard.php?limit=1000`);
                    const data = await response.json();

                    this.data = data;
                    this.render();
                    this.updateStats();
                    this.updateLastUpdate();

                } catch (error) {
                    console.error('Failed to load leaderboard:', error);
                    alert('❌ Fehler beim Laden des Leaderboards');
                }
            },

            /**
             * Rendere Leaderboard-Tabelle
             */
            render() {
                const tbody = document.getElementById('leaderboard-body');
                tbody.innerHTML = '';

                if (!this.data || this.data.leaderboard.length === 0) {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('empty-state').style.display = 'block';
                    return;
                }

                document.getElementById('loading').style.display = 'none';
                document.getElementById('leaderboard-table').style.display = 'block';

                this.data.leaderboard.forEach(player => {
                    const tr = this.createPlayerRow(player);
                    tbody.appendChild(tr);
                });
            },

            /**
             * Erstelle Tabellenzeile für Spieler
             */
            createPlayerRow(player) {
                const tr = document.createElement('tr');

                // Rang mit Styling
                let rankClass = '';
                let rankEmoji = '';
                if (player.rank === 1) {
                    rankClass = 'top1';
                    rankEmoji = '🥇 ';
                } else if (player.rank === 2) {
                    rankClass = 'top2';
                    rankEmoji = '🥈 ';
                } else if (player.rank === 3) {
                    rankClass = 'top3';
                    rankEmoji = '🥉 ';
                }

                // Berechne Prozentsatz
                const percentage = player.totalQuestions > 0
                    ? Math.round((player.correctAnswers / player.totalQuestions) * 100)
                    : 0;

                // Badge-HTML (mit Shiro-Fallback für neue Spieler)
                let badgeHTML = '—';
                const currentCategory = player.currentCategory || 0;

                // Fallback: Neue Spieler (currentCategory = 0) erhalten Shiro-Badge (catId 1)
                const badgeCatId = currentCategory > 0 ? currentCategory : 1;
                const category = this.getCategoryById(badgeCatId);

                // Debug
                console.log(`Player: ${player.playerName}, currentCategory: ${currentCategory}, badgeCatId: ${badgeCatId}, category:`, category);

                if (category) {
                    badgeHTML = `<img src="assets/img/categories/${category.catSymbol}"
                                     alt="${category.catDescription}"
                                     class="leaderboard-badge"
                                     title="${category.catDescription}">`;
                }

                tr.innerHTML = `
                    <td class="center">
                        <span class="rank ${rankClass}">${rankEmoji}${player.rank}</span>
                    </td>
                    <td>
                        <div class="player-name">${this.escapeHtml(player.playerName)}</div>
                    </td>
                    <td class="center hide-mobile">${badgeHTML}</td>
                    <td class="right">
                        <span class="score">${this.formatNumber(player.totalScore)}</span>
                    </td>
                    <td class="center">
                        <span class="level-badge">${player.completedLevels}/15</span>
                    </td>
                    <td class="center hide-mobile">
                        <span class="questions">${player.correctAnswers || 0}/${player.totalQuestions || 0}</span>
                    </td>
                    <td class="center hide-mobile">
                        <span class="percentage">${percentage}%</span>
                    </td>
                    <td class="center hide-mobile">
                        <span class="time">${this.formatTime(player.totalTime)}</span>
                    </td>
                    <td class="center hide-mobile">
                        <span class="time-adds">${player.timeAddsUsed || 0}</span>
                    </td>
                    <td class="center hide-mobile">
                        <span class="hints">${player.hintsUsed || 0}</span>
                    </td>
                `;

                return tr;
            },

            /**
             * Suche nach Spieler und zeige Ergebnisse
             */
            searchPlayer() {
                const searchInput = document.getElementById('player-search-input');
                const searchTerm = searchInput.value.trim().toLowerCase();

                // Leeres Suchfeld → alle anzeigen
                if (!searchTerm) {
                    this.showAllPlayers();
                    return;
                }

                // Suche in Leaderboard
                const matches = [];
                this.data.leaderboard.forEach((player, index) => {
                    if (player.playerName.toLowerCase().includes(searchTerm)) {
                        matches.push({ player, index });
                    }
                });

                // Keine Treffer
                if (matches.length === 0) {
                    this.showNoResults(searchTerm);
                    return;
                }

                // Zeige Treffer mit Kontext
                this.renderSearchResults(matches);

                // Zeige "Alle anzeigen" Button
                document.getElementById('show-all-btn').style.display = 'inline-block';
            },

            /**
             * Rendere Such-Ergebnisse mit Kontext
             */
            renderSearchResults(matches) {
                const tbody = document.getElementById('leaderboard-body');
                tbody.innerHTML = '';

                document.getElementById('loading').style.display = 'none';
                document.getElementById('leaderboard-table').style.display = 'block';
                document.getElementById('empty-state').style.display = 'none';

                matches.forEach(({ player, index }, matchIndex) => {
                    // Bestimme wie viele Einträge darüber gezeigt werden
                    const contextCount = Math.min(2, index); // Max 2, aber nicht mehr als verfügbar
                    const startIndex = index - contextCount;

                    // Zeige Kontext-Zeilen
                    for (let i = startIndex; i < index; i++) {
                        const contextPlayer = this.data.leaderboard[i];
                        const tr = this.createPlayerRow(contextPlayer);
                        tr.classList.add('search-context');
                        tbody.appendChild(tr);
                    }

                    // Zeige gesuchten Spieler (highlighted)
                    const tr = this.createPlayerRow(player);
                    tr.classList.add('search-highlight');
                    tbody.appendChild(tr);

                    // Zeige ALLE Spieler nach dem LETZTEN Treffer
                    const isLastMatch = matchIndex === matches.length - 1;
                    if (isLastMatch) {
                        for (let i = index + 1; i < this.data.leaderboard.length; i++) {
                            const followingPlayer = this.data.leaderboard[i];
                            const followingTr = this.createPlayerRow(followingPlayer);
                            tbody.appendChild(followingTr);
                        }
                    }
                });
            },

            /**
             * Zeige "Keine Ergebnisse" Meldung
             */
            showNoResults(searchTerm) {
                const tbody = document.getElementById('leaderboard-body');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 60px 20px; color: #6b7280;">
                            <h3 style="color: var(--text-color); margin-bottom: 10px;">Keine Treffer</h3>
                            <p>Kein Spieler mit dem Namen "<strong>${this.escapeHtml(searchTerm)}</strong>" gefunden.</p>
                        </td>
                    </tr>
                `;

                document.getElementById('loading').style.display = 'none';
                document.getElementById('leaderboard-table').style.display = 'block';
                document.getElementById('show-all-btn').style.display = 'inline-block';
            },

            /**
             * Zeige alle Spieler (ursprüngliche Liste)
             */
            showAllPlayers() {
                document.getElementById('player-search-input').value = '';
                document.getElementById('show-all-btn').style.display = 'none';
                this.render();
            },

            /**
             * Update Statistiken
             */
            updateStats() {
                if (!this.data) return;

                const totalPlayers = this.data.total;
                
                // Zeige Spieleranzahl oben rechts
                const pluralText = totalPlayers === 1 ? 'Spieler' : 'Spieler';
                document.getElementById('total-players-display').textContent = `${this.formatNumber(totalPlayers)} ${pluralText}`;
            },

            /**
             * Update Last Update Zeit
             */
            updateLastUpdate() {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('de-DE');
                document.getElementById('last-update').textContent = `Zuletzt aktualisiert: ${timeStr}`;
            },

            /**
             * Formatiere Zahl mit Tausender-Trennzeichen
             */
            formatNumber(num) {
                return new Intl.NumberFormat('de-DE').format(num);
            },

            /**
             * Formatiere Zeit (Sekunden zu MM:SS)
             */
            formatTime(seconds) {
                if (!seconds) return '—';
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${String(secs).padStart(2, '0')}`;
            },

            /**
             * Escape HTML
             */
            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        };

        // Initialisiere beim Laden
        document.addEventListener('DOMContentLoaded', () => {
            leaderboard.init();
        });
    </script>
</body>
</html>