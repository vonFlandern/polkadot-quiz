/**
 * Quiz Engine - Haupt-Spiel-Logik
 */

class QuizEngine {
    constructor() {
        this.config = null;
        this.questions = null;
        this.categories = [];  // NEU: Category-Daten
        this.currentLevel = null;
        this.currentQuestionIndex = 0;
        this.timer = new QuizTimer();
        this.levelState = {
            score: 0,
            correctAnswers: 0,
            hintsUsed: 0,
            timeAddsUsed: 0,
            hintsRemaining: 3,
            timeAddsRemaining: 2,
            questionScores: []
        };
    }

    /**
     * Initialisiere Quiz (lade Config und Fragen)
     */
    async initialize() {
        try {
            // Lade Config
            const configResponse = await fetch('data/config.json');
            this.config = await configResponse.json();

            // Lade Fragen
            const questionsResponse = await fetch('data/questions.json');
            this.questions = await questionsResponse.json();

            // Berechne totalLevels automatisch aus questions.json
            this.totalLevels = Object.keys(this.questions).length;

            // NEU: Lade Categories
            await this.loadCategories();

            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            return false;
        }
    }

    /**
     * Lade Categories von API
     */
    async loadCategories() {
        try {
            const response = await fetch('api/get-categories.php');
            const data = await response.json();

            if (data.success && data.categories) {
                this.categories = data.categories;
                console.log('✅ Categories loaded:', this.categories.length);
                return true;
            } else {
                console.error('Failed to load categories');
                this.categories = [];
                return false;
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.categories = [];
            return false;
        }
    }

    /**
     * Hole Category-Objekt für catId
     */
    getCategoryById(catId) {
        return this.categories.find(cat => cat.catId === catId) || null;
    }

    /**
     * Hole Category für Level-Nummer
     */
    getCategoryForLevel(levelNumber) {
        const levelKey = `level${levelNumber}`;
        const levelData = this.questions[levelKey];

        if (!levelData || !levelData.catId) {
            return null;
        }

        return this.getCategoryById(levelData.catId);
    }

    /**
     * Starte ein Level
     */
    startLevel(levelNumber) {
        const levelKey = `level${levelNumber}`;
        this.currentLevel = this.questions[levelKey];

        if (!this.currentLevel) {
            throw new Error(`Level ${levelNumber} nicht gefunden`);
        }

        // Reset Level State
        this.currentQuestionIndex = 0;
        this.levelState = {
            score: 0,
            correctAnswers: 0,
            hintsUsed: 0,
            timeAddsUsed: 0,
            hintsRemaining: this.currentLevel.hintCount,
            timeAddsRemaining: this.currentLevel.timeAddCount,
            questionScores: []
        };

        return this.currentLevel;
    }

    /**
     * Hole aktuelle Frage
     */
    getCurrentQuestion() {
        if (!this.currentLevel) return null;
        return this.currentLevel.questions[this.currentQuestionIndex];
    }

    /**
     * Starte Frage-Timer
     */
    startQuestionTimer(onTick, onTimeout) {
        const question = this.getCurrentQuestion();
        if (!question) return;

        this.timer.start(question.tQuestion, onTick, onTimeout);
    }

    /**
     * Nutze Hint
     */
    useHint() {
        if (this.levelState.hintsRemaining <= 0) {
            return { success: false, message: 'Keine Hints mehr verfügbar' };
        }

        this.levelState.hintsRemaining--;
        this.levelState.hintsUsed++;

        const question = this.getCurrentQuestion();
        return {
            success: true,
            hint: question.hint,
            remaining: this.levelState.hintsRemaining
        };
    }

    /**
     * Nutze Time Add
     */
    useTimeAdd() {
        if (this.levelState.timeAddsRemaining <= 0) {
            return { success: false, message: 'Keine Zeitverlängerungen mehr verfügbar' };
        }

        const question = this.getCurrentQuestion();
        this.timer.addTime(question.timeAddBonus);
        this.levelState.timeAddsRemaining--;
        this.levelState.timeAddsUsed++;

        return {
            success: true,
            bonusTime: question.timeAddBonus,
            remaining: this.levelState.timeAddsRemaining
        };
    }

    /**
     * Berechne Punkte für eine Antwort
     *
     * WICHTIG: Verwendet maximale Level-Zeit für faire Berechnung:
     * maxTime = tQuestion + (timeAddBonus × timeAddCount)
     *
     * Beispiel: tQuestion=30s, timeAddBonus=20s, timeAddCount=2
     *   → maxTime = 30 + (20 × 2) = 70 Sekunden für jede Frage!
     *
     * Penalties werden nur bei tatsächlicher Nutzung abgezogen.
     * Kann negative Werte zurückgeben (bei falscher Antwort + Power-Ups).
     * Die Minimum-Regel (Score >= 0) wird erst am Level-Ende angewendet!
     */
    calculatePoints(elapsedTimeMs, isCorrect, hintUsed, timeAddCount) {
        const question = this.getCurrentQuestion();

        // 1. Berechne Basis-Punkte (nur bei richtiger Antwort)
        let points = 0;
        if (isCorrect) {
            // FIX v2.0: Verwende maximale Level-Zeit (tQuestion + alle TimeAdds)
            const maxTimeMs = (question.tQuestion +
                              (question.timeAddBonus * this.currentLevel.timeAddCount)) * 1000;
            const remainingTimeMs = Math.max(0, maxTimeMs - elapsedTimeMs);
            points = Math.round(remainingTimeMs * question.pointsPerMillisecond);
        }

        // 2. Ziehe Penalties ab (IMMER, auch bei falschen Antworten!)
        if (hintUsed) {
            points -= question.hintPenalty;
        }
        if (timeAddCount > 0) {
            points -= (question.timeAddPenalty * timeAddCount);
        }

        // 3. Return kann negativ sein (z.B. falsche Antwort + TimeAdd = -15)
        return points;
    }

    /**
     * Beantworte Frage
     * @param {number} selectedAnswerIndex - Index der gewählten Antwort
     * @param {boolean} hintUsed - Wurde ein Hint bei dieser Frage verwendet?
     * @param {number} timeAddCount - Wie oft wurde TimeAdd bei dieser Frage verwendet?
     */
    answerQuestion(selectedAnswerIndex, hintUsed = false, timeAddCount = 0) {
        const question = this.getCurrentQuestion();
        const elapsedTimeMs = this.timer.getElapsedTime();
        
        this.timer.stop();

        const isCorrect = selectedAnswerIndex === question.correct;
        // Fix: Use timer.maxTime instead of original tQuestion to account for TimeAdd power-ups
        const isTimeout = elapsedTimeMs >= this.timer.maxTime;

        // Wurde Hint oder TimeAdd bei dieser Frage genutzt?
        // Fix: Receive actual usage from UI instead of hardcoded false
        const hintUsedThisQuestion = hintUsed;
        const timeAddCountThisQuestion = timeAddCount;

        const points = this.calculatePoints(elapsedTimeMs, isCorrect, hintUsedThisQuestion, timeAddCountThisQuestion);

        // Berechne Basis-Punkte für Breakdown (ohne Penalties)
        // FIX v2.0: Verwende GLEICHE Logik wie Punkteberechnung (maximale Level-Zeit)
        const maxTimeMs = (question.tQuestion +
                          (question.timeAddBonus * this.currentLevel.timeAddCount)) * 1000;
        const remainingTimeMs = Math.max(0, maxTimeMs - elapsedTimeMs);
        const basePoints = isCorrect ? Math.round(remainingTimeMs * question.pointsPerMillisecond) : 0;

        // Berechne Penalties für Breakdown (auch bei falschen Antworten!)
        const hintPenalty = hintUsedThisQuestion ? question.hintPenalty : 0;
        const timeAddPenalty = timeAddCountThisQuestion > 0 ? (question.timeAddPenalty * timeAddCountThisQuestion) : 0;

        // Update State
        this.levelState.score += points;
        if (isCorrect) {
            this.levelState.correctAnswers++;
        }

        // Speichere Question-Score
        this.levelState.questionScores.push({
            question: this.currentQuestionIndex + 1,
            points: points,
            timeMs: elapsedTimeMs,
            correct: isCorrect,
            timeout: isTimeout
        });

        return {
            correct: isCorrect,
            timeout: isTimeout,
            points: points,
            elapsedTimeMs: elapsedTimeMs,
            correctAnswer: question.correct,
            explanation: question.explanation,

            // NEU: Detaillierte Aufschlüsselung für Feedback-Screen
            pointsBreakdown: {
                basePoints: basePoints,
                hintPenalty: hintPenalty,
                timeAddPenalty: timeAddPenalty,
                hintUsed: hintUsedThisQuestion,
                timeAddCount: timeAddCountThisQuestion
            }
        };
    }

    /**
     * Gehe zur nächsten Frage
     */
    nextQuestion() {
        this.currentQuestionIndex++;
        return this.hasMoreQuestions();
    }

    /**
     * Prüfe ob noch Fragen übrig sind
     */
    hasMoreQuestions() {
        return this.currentQuestionIndex < this.currentLevel.questions.length;
    }

    /**
     * Berechne Level-Ergebnis
     */
    calculateLevelResult() {
        const totalQuestions = this.currentLevel.questions.length;
        const correctAnswers = this.levelState.correctAnswers;
        const minCorrect = this.currentLevel.minCorrect;
        const passed = correctAnswers >= minCorrect;

        // Minimum-Regel: Score kann nicht negativ sein
        let finalScore = this.levelState.score;
        if (finalScore < 0) {
            finalScore = 0;
        }

        // Gesamtzeit berechnen
        const totalTimeMs = this.levelState.questionScores.reduce((sum, q) => sum + q.timeMs, 0);

        return {
            score: finalScore,
            time: Math.round(totalTimeMs / 1000), // in Sekunden
            correctAnswers: correctAnswers,
            totalQuestions: totalQuestions,
            passed: passed,
            hintsUsed: this.levelState.hintsUsed,
            timeAddsUsed: this.levelState.timeAddsUsed,
            questionScores: this.levelState.questionScores
        };
    }

    /**
     * Speichere Level-Ergebnis
     */
    async saveLevelResult(walletAddress, playerName, levelNumber) {
        const result = this.calculateLevelResult();

        console.log('Saving level result:', {
            walletAddress,
            playerName,
            levelNumber,
            result
        });

        try {
            const response = await fetch('api/save-score.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress: walletAddress,
                    playerName: playerName,
                    levelNumber: levelNumber,
                    levelData: result
                })
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Response error:', text);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Save successful:', data);
            return data;
        } catch (error) {
            console.error('Save score error:', error);
            alert('⚠️ Fehler beim Speichern: ' + error.message + '\n\nÜberprüfe die Browser-Console (F12) für Details.');
            throw error;
        }
    }

    /**
     * Lade Spieler-Daten
     */
    async loadPlayer(walletAddress) {
        console.log('Loading player data for:', walletAddress);
        
        try {
            const response = await fetch('api/get-player.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress: walletAddress
                })
            });

            console.log('Load player response status:', response.status);
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Load player error response:', text);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Player data loaded:', data);
            return data;
        } catch (error) {
            console.error('Load player error:', error);
            console.warn('Continuing without player data (new player?)');
            return { found: false };
        }
    }

    /**
     * Lade Leaderboard
     */
    async loadLeaderboard(limit = 100) {
        try {
            const response = await fetch(`api/get-leaderboard.php?limit=${limit}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Load leaderboard error:', error);
            throw error;
        }
    }
}

// Globale Instanz
const quizEngine = new QuizEngine();