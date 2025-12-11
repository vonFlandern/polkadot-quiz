/**
 * Millisekunden-genauer Timer für Polkadot Quiz
 */

class QuizTimer {
    constructor() {
        this.startTime = null;
        this.endTime = null;
        this.isPaused = false;
        this.pausedTime = 0;
        this.intervalId = null;
        this.onTick = null;
        this.onTimeout = null;
        this.maxTime = 0; // in Millisekunden
    }

    /**
     * Starte Timer
     * @param {number} maxTimeSeconds - Maximale Zeit in Sekunden
     * @param {function} onTick - Callback für jede Sekunde
     * @param {function} onTimeout - Callback bei Timeout
     */
    start(maxTimeSeconds, onTick = null, onTimeout = null) {
        this.maxTime = maxTimeSeconds * 1000; // Konvertiere zu Millisekunden
        this.startTime = performance.now();
        this.endTime = null;
        this.isPaused = false;
        this.pausedTime = 0;
        this.onTick = onTick;
        this.onTimeout = onTimeout;

        // Update UI jede 100ms für flüssige Anzeige
        this.intervalId = setInterval(() => {
            if (!this.isPaused) {
                const elapsed = this.getElapsedTime();
                const remaining = Math.max(0, this.maxTime - elapsed);

                // Callback für UI-Update
                if (this.onTick) {
                    this.onTick(elapsed, remaining);
                }

                // Timeout erreicht?
                if (remaining === 0 && this.onTimeout) {
                    this.stop();
                    this.onTimeout();
                }
            }
        }, 100);
    }

    /**
     * Stoppe Timer
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.endTime = performance.now();
    }

    /**
     * Pausiere Timer
     */
    pause() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pausedTime = performance.now();
        }
    }

    /**
     * Timer fortsetzen
     */
    resume() {
        if (this.isPaused) {
            const pauseDuration = performance.now() - this.pausedTime;
            this.startTime += pauseDuration;
            this.isPaused = false;
        }
    }

    /**
     * Zeit verlängern (für TimeAdd Power-Up)
     * @param {number} bonusSeconds - Zusätzliche Zeit in Sekunden
     */
    addTime(bonusSeconds) {
        this.maxTime += bonusSeconds * 1000;
    }

    /**
     * Hole verstrichene Zeit in Millisekunden
     */
    getElapsedTime() {
        if (this.startTime === null) return 0;
        
        const now = this.isPaused ? this.pausedTime : performance.now();
        return now - this.startTime;
    }

    /**
     * Hole verstrichene Zeit in Sekunden (mit Dezimalen)
     */
    getElapsedSeconds() {
        return this.getElapsedTime() / 1000;
    }

    /**
     * Formatiere Zeit für Anzeige (MM:SS.mmm)
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const ms = Math.floor(milliseconds % 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    /**
     * Formatiere Zeit kurz (SS.mmm)
     */
    formatTimeShort(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const ms = Math.floor(milliseconds % 1000);

        return `${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    /**
     * Reset Timer
     */
    reset() {
        this.stop();
        this.startTime = null;
        this.endTime = null;
        this.isPaused = false;
        this.pausedTime = 0;
        this.maxTime = 0;
    }

    /**
     * Prüfe ob Timer läuft
     */
    isRunning() {
        return this.startTime !== null && this.endTime === null && !this.isPaused;
    }
}
