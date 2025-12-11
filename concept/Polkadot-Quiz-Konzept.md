# Konzept: Polkadot-Quiz

**Version:** 3.0  
**Datum:** 07.12.2024  
**Autor:** vonFlandern  

---

## Inhaltsverzeichnis

1. [Grundidee](#grundidee)
2. [Notationskonvention](#notationskonvention)
3. [Level-Struktur](#level-struktur)
4. [Authentifizierung & Zugang](#authentifizierung--zugang)
5. [Spielmechanik](#spielmechanik)
6. [Punktesystem](#punktesystem)
7. [Zeitmanagement](#zeitmanagement)
8. [Hints & Power-Ups](#hints--power-ups)
9. [Datenarchitektur](#datenarchitektur)
10. [Spielablauf](#spielablauf)
11. [PDF-Integration](#pdf-integration)
12. [Wiederholungslogik](#wiederholungslogik)
13. [UI/UX Flow](#uiux-flow)

---

## Grundidee

Ein interaktives Polkadot-Quiz, das:
- Spaß macht und Wissen vermittelt
- Spieler zu Polkadot-Experten ausbildet
- Als Onboarding-Tool für das Polkadot-Ökosystem dient
- Kompetitiv ist durch millisekundenbasierte Punktevergabe
- Niedrige Einstiegshürde hat (nur Wallet erforderlich)

**Zielgruppe:**
- Polkadot-Einsteiger und Fortgeschrittene
- Alle mit einem Polkadot-Wallet
- Community-Mitglieder

---

## Notationskonvention

**Variablen in eckigen Klammern** werden zur Laufzeit aus JSON-Dateien geladen.

Beispiele:
- `[tQuestion]` - Zeit pro Frage in Sekunden
- `[pointsPerMillisecond]` - Punktwert pro Millisekunde
- `[levelInfo]` - Beschreibung des Levels
- `[questionsCount]` - Anzahl Fragen im Level

---

## Level-Struktur

### Gesamt-Übersicht

**Anzahl Level:** `[totalLevels]` = 15  
**Fragen pro Level:** `[questionsCount]` = **variabel** (flexibel pro Level)  
**Antworten pro Frage:** `[answerCount]` = variabel (4-5)

### Alle Level sind Competitive

**Kein Teaser-Modus** - Alle 15 Level zählen für die Wertung

**Charakteristika:**
- ✅ **Punktevergabe ab Level 1**
- ✅ **Wallet-Verbindung erforderlich** (VOR Spielstart)
- ✅ **Leaderboard-Teilnahme**
- ✅ **Fortschritt wird gespeichert**
- ✅ **Flexible Fragenanzahl** je nach Thema
- ✅ **Millisekundengenaue Zeitmessung**

### Level-Themen (Beispiele)

- **Level 1:** Polkadot Basics
- **Level 2:** Wallets & Accounts
- **Level 3:** DOT Token
- **Level 4:** Staking & Nominierung
- **Level 5:** Governance Grundlagen
- **Level 6:** Parachains
- **Level 7:** XCM (Cross-Consensus Messaging)
- **Level 8:** OpenGov
- **Level 9:** Treasury
- **Level 10:** Validator & Nominatoren
- **Level 11:** On-Chain Identity
- **Level 12:** Crowdloans
- **Level 13:** Smart Contracts
- **Level 14:** Polkadot 2.0
- **Level 15:** Advanced Topics

**Fragenanzahl variabel:**
- Umfangreiche Themen: 15-20 Fragen
- Standard-Themen: 10-12 Fragen
- Spezifische Themen: 5-8 Fragen

---

## Authentifizierung & Zugang

### Login-Flow

**VOR Spielstart erforderlich:**

1. **Startseite** → "Quiz starten" Button
2. **Wallet-Verbindung**
   - Polkadot.js Extension
   - Talisman
   - SubWallet
   - Nova Wallet (mobile)
3. **Spielername eingeben**
4. **Level-Übersicht** → Spiel beginnen

### Wallet-Verbindung

**Technische Umsetzung:**
- Browser-Extension API (Polkadot.js / Talisman / SubWallet)
- Wallet-Adresse als eindeutiger Identifier
- Signatur zur Verifizierung des Wallet-Besitzes

**Keine On-Chain Identity erforderlich!**

### Vorteile dieser Lösung

✅ **Niedrige Einstiegshürde** - Jeder mit Wallet kann spielen  
✅ **DSGVO-konform** - Keine personenbezogenen Daten  
✅ **Wallet = Account** - Verhindert einfache Mehrfach-Accounts  
✅ **Pseudonym** - Anonymität gewahrt  
✅ **Polkadot-nativ** - Fördert Wallet-Nutzung  

---

## Spielmechanik

### Flexible Fragenanzahl

**Pro Level individuell:**
- Level kann 5-20 Fragen haben
- Anzahl wird in `questions.json` definiert
- Wird automatisch aus Array-Länge ermittelt

### Fragen-Struktur

Pro Frage:
- 1 Frage-Text
- `[answerCount]` Antwortmöglichkeiten (variabel: 4-5)
- 1 korrekte Antwort
- 1 Hint (optional nutzbar)
- 1 Erklärung (wird nach Antwort gezeigt)

### Antwort-Szenarien

| Szenario | Punkte | Feedback |
|----------|--------|----------|
| **Richtig + innerhalb Zeit** | Berechnet nach Formel | ✅ Richtig! +X Punkte |
| **Falsch** | 0 | ❌ Falsch! Richtige Antwort: [X] |
| **Timeout** | 0 | ⏱️ Zeit abgelaufen! Richtige Antwort: [X] |

**Bei jedem Szenario:**
- Anzeige der richtigen Antwort
- Anzeige der Erklärung `[explanation]`
- Button "Weiter zur nächsten Frage"

### Level-Fortschritt

**Bestehen-Bedingung:**
- Mindestens `[minCorrectPercentage]` = **70%** der Fragen richtig

**Beispiele:**
- Level mit 10 Fragen: mind. 7 richtig
- Level mit 15 Fragen: mind. 11 richtig (10,5 → aufgerundet)
- Level mit 8 Fragen: mind. 6 richtig (5,6 → aufgerundet)

**Formel:**
```javascript
minCorrectAnswers = Math.ceil(questionsCount × minCorrectPercentage)
```

**Nicht bestanden:**
- Weniger als 70% richtige Antworten
- Level muss wiederholt werden
- **Wichtig:** Punkte aus erstem Versuch bleiben erhalten!

---

## Punktesystem

### Millisekundengenaue Berechnung

**Neue, faire Punkteberechnung ohne Grace Period!**

### Parameter pro Frage

- `[tQuestion]` - Verfügbare Zeit in Sekunden (z.B. 60)
- `[pointsPerMillisecond]` - Punktwert pro Millisekunde (z.B. 0.01)

### Formel

```javascript
// Umrechnung
tQuestion_ms = tQuestion × 1000  // z.B. 60s = 60.000ms

// Zeit messen
verstricheneZeit_ms = Antwortzeit in Millisekunden (z.B. 2.347ms)

// Punkte berechnen (bei richtiger Antwort)
if (verstricheneZeit_ms < tQuestion_ms) {
  verbleibendeZeit_ms = tQuestion_ms - verstricheneZeit_ms
  Punkte = Math.round(verbleibendeZeit_ms × pointsPerMillisecond)
} else {
  Punkte = 0  // Timeout
}

// Bei falscher Antwort
Punkte = 0
```

### Beispiel-Berechnung

**Gegeben:** `tQuestion = 60s`, `pointsPerMillisecond = 0.01`

| Antwortzeit | Berechnung | Punkte |
|-------------|------------|--------|
| 2.145ms | (60.000 - 2.145) × 0.01 | **579** |
| 2.187ms | (60.000 - 2.187) × 0.01 | **578** |
| 10.523ms | (60.000 - 10.523) × 0.01 | **495** |
| 35.823ms | (60.000 - 35.823) × 0.01 | **242** |
| 59.001ms | (60.000 - 59.001) × 0.01 | **10** |
| 60.000ms+ | Timeout | **0** |

**Vorteil:** Praktisch unmöglich, die gleiche Punktzahl zu erreichen! Perfekt für ein faires Leaderboard.

### Sinnvolle pointsPerMillisecond Werte

| tQuestion | pointsPerMillisecond | Max. Punkte (sofort) |
|-----------|----------------------|----------------------|
| 30s | 0.02 | 600 |
| 60s | 0.01 | 600 |
| 90s | 0.015 | 1.350 |
| 45s | 0.01 | 450 |
| 120s | 0.008 | 960 |

### Abzüge bei Power-Ups

**Pro Frage definiert:**
- `[hintPenalty]` - Punkteabzug bei Hint-Nutzung (z.B. 20)
- `[timeAddPenalty]` - Punkteabzug bei Zeitverlängerung (z.B. 10)

**Anwendung pro Frage:**
```javascript
fragenPunkte = BerechneterScore  // aus Zeitformel
if (hintUsed) fragenPunkte -= hintPenalty
if (timeAddUsed) fragenPunkte -= timeAddPenalty

// Pro Frage KEIN Minimum (kann temporär negativ sein)
```

### Level-Score Berechnung

**Nach allen Fragen eines Levels:**

```javascript
levelScore = 0

// Alle Fragen durchgehen
for (frage in level.questions) {
  levelScore += frage.punkte  // Kann pro Frage auch negativ sein
}

// Abzüge für genutzte Power-Ups (falls nicht pro Frage abgezogen)
levelScore -= (totalHintsUsed × hintPenalty)
levelScore -= (totalTimeAddsUsed × timeAddPenalty)

// WICHTIG: Minimum-Regel
if (levelScore < 0) {
  levelScore = 0
}
```

**Minimum-Regel:**
- Ein Level kann **niemals negative Punkte** bringen
- Schlechtester Fall: 0 Punkte für das Level
- Verhindert Frustration und unfaire Bestrafung

**Beispiel-Szenario mit Minimum-Regel:**

```
Level mit 10 Fragen:

Frage 1: 0 Punkte (falsch)
Frage 2: 10 Punkte (sehr langsam, richtig)
Frage 3: -10 Punkte (Hint verwendet, dann langsam)
Frage 4: 0 Punkte (Timeout)
Frage 5: 15 Punkte
Frage 6: -5 Punkte (TimeAdd verwendet, dann langsam)
Frage 7: 0 Punkte (falsch)
Frage 8: 20 Punkte
Frage 9: 5 Punkte
Frage 10: 0 Punkte (falsch)

Summe: 35 Punkte
Richtige Antworten: 5/10 (50%)

Ergebnis:
✅ Level-Score: 35 Punkte (wird zu Gesamtpunktzahl addiert)
❌ Level nicht bestanden (< 70%)
→ Muss wiederholt werden, aber 35 Punkte bleiben!
```

**Extremfall (alle negativ):**

```
Level mit sehr schlechter Performance:
Gesamt nach allen Fragen: -120 Punkte

→ Level-Score wird auf 0 gesetzt
→ Keine Punkte, aber auch keine "Schulden"
```

---

## Zeitmanagement

### Zeit pro Frage

Jede Frage hat individuell konfigurierbare Zeit:
- `[tQuestion]` - Gesamtzeit in Sekunden

**Messung:**
- Timer startet bei Frage-Anzeige
- Messung in **Millisekunden** (ms)
- Präzise Zeitmessung für faire Punktevergabe

**Ablauf:**
1. Timer startet bei Frage-Anzeige
2. Punkte sinken **linear** mit jeder Millisekunde
3. Bei `[tQuestion]`: Automatisch 0 Punkte + Feedback-Screen

### Keine Grace Period mehr!

**Wichtig:** 
- Kein "Schonzeit"-Fenster mehr
- Punkte beginnen sofort zu sinken
- **Aber:** Bei sehr schnellen Antworten (< 1 Sekunde) bleibt die Punktzahl sehr hoch
- **Fair für alle:** Schnellste Spieler werden maximal belohnt

**Beispiel:** Bei 60s Gesamtzeit und 0.01 Punkten/ms
- Nach 0,5s → 595 Punkte
- Nach 1s → 590 Punkte
- Nach 2s → 580 Punkte
- Nach 5s → 550 Punkte

---

## Hints & Power-Ups

### Hints

**Verfügbar pro Level:** `[hintCountPerLevel]` = 3

**Pro Frage:**
- 1 Hint-Text verfügbar
- Punkteabzug: `[hintPenalty]` (pro Frage definiert)
- Hint kann beliebig oft angezeigt werden (aber Penalty nur 1x)

**Beispiel-Hint:**
```
Frage: "Was ist eine Parachain?"
Hint: "Es teilt sich die Sicherheit der Relay Chain..."
```

### Time Add (Zeitverlängerung)

**Verfügbar pro Level:** `[timeAddCountPerLevel]` = 2

**Pro Frage:**
- Bonus-Zeit: `[timeAddBonus]` Sekunden (pro Frage definiert)
- Punkteabzug: `[timeAddPenalty]` (pro Frage definiert)

**Mechanik:**
- Kann während laufender Frage aktiviert werden
- Timer wird um `[timeAddBonus]` Sekunden verlängert
- Punkteberechnung erfolgt trotzdem ab Frage-Start!

**Beispiel:**
```
tQuestion = 60s, timeAddBonus = 15s
Spieler nutzt TimeAdd nach 55 Sekunden
→ Neue Gesamtzeit: 75s
→ Aber: Punkte werden weiter ab Sekunde 0 berechnet
→ Wenn Antwort nach 70s kommt: (75.000 - 70.000) × 0.01 = 50 Punkte - timeAddPenalty
```

---

## Datenarchitektur

### Datei-Übersicht

| Datei | Zweck | Zugriff |
|-------|-------|---------|
| `config.json` | Globale Spiel-Einstellungen | READ |
| `questions.json` | Alle Fragen, Antworten, Hints | READ |
| `players.json` | Spieler-Scores, Fortschritt | READ/WRITE |

### config.json

**Globale Einstellungen:**

```json
{
  "gameSettings": {
    "totalLevels": 15,
    "minCorrectPercentage": 0.7,
    "hintCountPerLevel": 3,
    "timeAddCountPerLevel": 2
  }
}
```

### questions.json

**Struktur mit flexibler Fragenanzahl und neuer Punkteberechnung:**

```json
{
  "level1": {
    "levelInfo": "In diesem Level lernst du die Grundlagen von Polkadot kennen.",
    "pdfUrl": "/downloads/level1_polkadot_basics.pdf",
    "pdfTitle": "Polkadot Basics - Wissensbasis",
    "questions": [
      {
        "question": "Was ist Polkadot?",
        "answers": [
          "Eine Blockchain-Plattform für Interoperabilität",
          "Eine Kryptowährung",
          "Ein Smart Contract",
          "Eine Wallet-App"
        ],
        "answerCount": 4,
        "correct": 0,
        "hint": "Es verbindet verschiedene Blockchains miteinander...",
        "explanation": "Polkadot ist eine Blockchain-Plattform, die verschiedene Blockchains (Parachains) miteinander verbindet und Interoperabilität ermöglicht. Der DOT-Token ist die native Währung, aber Polkadot selbst ist viel mehr als nur eine Kryptowährung.",
        "tQuestion": 30,
        "pointsPerMillisecond": 0.02,
        "hintPenalty": 20,
        "timeAddPenalty": 10,
        "timeAddBonus": 15
      },
      {
        "question": "Wer hat Polkadot gegründet?",
        "answers": [
          "Vitalik Buterin",
          "Gavin Wood",
          "Satoshi Nakamoto",
          "Charles Hoskinson"
        ],
        "answerCount": 4,
        "correct": 1,
        "hint": "Er war auch Co-Founder von Ethereum...",
        "explanation": "Gavin Wood, Co-Founder von Ethereum und Erfinder der Programmiersprache Solidity, hat Polkadot gegründet.",
        "tQuestion": 30,
        "pointsPerMillisecond": 0.02,
        "hintPenalty": 20,
        "timeAddPenalty": 10,
        "timeAddBonus": 15
      },
      {
        "question": "Welche Programmiersprache wird für Polkadot Smart Contracts verwendet?",
        "answers": [
          "Solidity",
          "Rust und ink!",
          "Python",
          "JavaScript",
          "Go"
        ],
        "answerCount": 5,
        "correct": 1,
        "hint": "Die gleiche Sprache wie für das Substrate Framework...",
        "explanation": "Polkadot Smart Contracts werden hauptsächlich in Rust mit dem ink! Framework geschrieben. Rust bietet Memory Safety und hohe Performance.",
        "tQuestion": 45,
        "pointsPerMillisecond": 0.015,
        "hintPenalty": 25,
        "timeAddPenalty": 12,
        "timeAddBonus": 20
      }
      // ... weitere Fragen
    ]
  },
  "level5": {
    "levelInfo": "In diesem Level geht es um die Polkadot Governance.",
    "pdfUrl": "/downloads/level5_governance.pdf",
    "pdfTitle": "Polkadot Governance - Wissensbasis",
    "questions": [
      {
        "question": "Was ist OpenGov?",
        "answers": [
          "Ein DeFi-Protokoll",
          "Das neue Governance-System von Polkadot",
          "Eine Parachain",
          "Ein Wallet"
        ],
        "answerCount": 4,
        "correct": 1,
        "hint": "Es löste Gov v1 ab und gibt mehr Macht an die Community...",
        "explanation": "OpenGov ist das neue Governance-System von Polkadot (Gov v2), das mehr Dezentralisierung und Community-Beteiligung ermöglicht. Es ersetzte das alte Council-basierte System.",
        "tQuestion": 60,
        "pointsPerMillisecond": 0.01,
        "hintPenalty": 20,
        "timeAddPenalty": 10,
        "timeAddBonus": 15
      }
      // ... Level 5 könnte 15 Fragen haben (umfangreiches Thema)
    ]
  }
}
```

**Entfernte Felder (nicht mehr benötigt):**
- ❌ `maxPoints` - wird jetzt dynamisch berechnet
- ❌ `gracePeriod` - keine Schonzeit mehr

**Neue Felder:**
- ✅ `pointsPerMillisecond` - Punktwert pro Millisekunde

**Felder-Erklärung:**

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `levelInfo` | String | Beschreibung des Level-Themas |
| `pdfUrl` | String | Pfad zur PDF-Datei mit Wissensbasis |
| `pdfTitle` | String | Titel der PDF für UI-Anzeige |
| `questions` | Array | Liste aller Fragen (VARIABEL!) |
| `question` | String | Frage-Text |
| `answers` | Array | Liste der Antwortmöglichkeiten |
| `answerCount` | Number | Anzahl Antworten (4 oder 5) |
| `correct` | Number | Index der richtigen Antwort (0-basiert) |
| `hint` | String | Hilfestellung für schwierige Fragen |
| `explanation` | String | Erklärung zur richtigen Antwort |
| `tQuestion` | Number | Zeit in Sekunden |
| `pointsPerMillisecond` | Number | Punktwert pro Millisekunde (Dezimalzahl) |
| `hintPenalty` | Number | Punkteabzug bei Hint-Nutzung |
| `timeAddPenalty` | Number | Punkteabzug bei Zeitverlängerung |
| `timeAddBonus` | Number | Zusätzliche Zeit in Sekunden |

### players.json

**Struktur:**

```json
{
  "players": [
    {
      "walletAddress": "15oF4uMJKvVB1j8ZQsJRR6YwmC7TFUHjcrCVHXT8Tn1pBvVe",
      "playerName": "Tom",
      "registeredAt": "2024-12-07T10:00:00Z",
      "totalScore": 8450,
      "totalTime": 245,
      "completedLevels": 15,
      "levels": {
        "1": {
          "firstAttempt": {
            "score": 420,
            "time": 185,
            "correctAnswers": 7,
            "totalQuestions": 8,
            "passed": true,
            "timestamp": "2024-12-07T10:15:00Z",
            "hintsUsed": 1,
            "timeAddsUsed": 0,
            "detailedScores": [
              {"q": 1, "points": 578, "timeMs": 2145},
              {"q": 2, "points": 495, "timeMs": 10523},
              {"q": 3, "points": 0, "timeMs": 60000},
              {"q": 4, "points": 242, "timeMs": 35823},
              {"q": 5, "points": 590, "timeMs": 1002},
              {"q": 6, "points": 0, "timeMs": 45000},
              {"q": 7, "points": 575, "timeMs": 2501},
              {"q": 8, "points": -160, "timeMs": 58000, "hint": true}
            ]
          },
          "attempts": 1
        },
        "2": {
          "firstAttempt": {
            "score": 0,
            "time": 520,
            "correctAnswers": 4,
            "totalQuestions": 10,
            "passed": false,
            "timestamp": "2024-12-07T10:45:00Z",
            "hintsUsed": 3,
            "timeAddsUsed": 2,
            "detailedScores": [
              {"q": 1, "points": -10, "timeMs": 60000, "timeAdd": true},
              {"q": 2, "points": 10, "timeMs": 59001},
              {"q": 3, "points": -10, "timeMs": 58500, "hint": true},
              {"q": 4, "points": 0, "timeMs": 60000},
              {"q": 5, "points": 5, "timeMs": 59500},
              {"q": 6, "points": -15, "timeMs": 59800, "hint": true, "timeAdd": true},
              {"q": 7, "points": 0, "timeMs": 45000},
              {"q": 8, "points": 20, "timeMs": 58000},
              {"q": 9, "points": 0, "timeMs": 60000},
              {"q": 10, "points": 0, "timeMs": 60000}
            ]
          },
          "attempts": 3
        }
      }
    }
  ]
}
```

**Neue Felder:**
- `detailedScores` - Array mit Punkten pro Frage (optional, für Statistik)
- `timeMs` - Antwortzeit in Millisekunden pro Frage

**Wichtig:**
- `score` auf Level-Ebene kann **nie negativ** sein (Minimum = 0)
- Einzelne Fragen in `detailedScores` können negativ sein
- `totalScore` über alle Level ist Summe aller Level-Scores

---

## Spielablauf

### 1. Start & Login

**Startseite:**
```
┌─────────────────────────────────────┐
│ 🎮 Polkadot Quiz                    │
│                                     │
│ Werde zum Polkadot-Experten!       │
│                                     │
│ 15 Level • Flexible Fragen          │
│ Millisekundengenaue Punktevergabe   │
│                                     │
│ [Quiz starten]                      │
└─────────────────────────────────────┘
```

**Login-Prozess:**
```
1. Wallet verbinden
   └─ Wallet auswählen (Polkadot.js / Talisman / SubWallet)
   └─ Verbindung bestätigen

2. Spielername eingeben
   └─ Frei wählbar
   └─ Wird mit Wallet-Adresse verknüpft

3. Weiter zur Level-Übersicht
```

### 2. Level-Übersicht (nach Login)

```
┌─────────────────────────────────────┐
│ 📚 Level-Übersicht                  │
│                                     │
│ Spieler: Tom                        │
│ Punkte: 8.450 | Zeit: 4:05          │
└─────────────────────────────────────┘

✅ Level 1: Polkadot Basics (8 Fragen)
   420 Punkte • 3:05 • 7/8 richtig

❌ Level 2: Wallets & Accounts (10 Fragen)
   0 Punkte • 8:40 • 4/10 richtig (nicht bestanden)
   [Wiederholen]

🔒 Level 3: DOT Token (12 Fragen)
   Noch nicht gespielt

...
```

### 3. Level-Start

**VOR dem Level:**

```
┌─────────────────────────────────────┐
│ 📖 Level 2: Wallets & Accounts      │
└─────────────────────────────────────┘

In diesem Level lernst du alles über 
Polkadot-Wallets und Account-Verwaltung.

📄 Vorbereitung (empfohlen):
[📥 PDF: Wallets & Accounts - Wissensbasis]

ℹ️ Level-Info:
• Fragen: 10
• Benötigte richtige Antworten: 7 (70%)
• Verfügbare Hints: 3
• Verfügbare Zeitverlängerungen: 2

💡 Tipp: Schnelle Antworten = Mehr Punkte!
Punkte sinken mit jeder Millisekunde.

[Level starten]  [Zurück zur Übersicht]
```

**Countdown:**
```
3... 2... 1... Los!
```

### 4. Frage-Loop

```
┌─────────────────────────────────────┐
│ Level 2 • Frage 3/10                │
│                                     │
│ Punkte: 1.085 | Zeit: 1:42          │
│ Hints: 2 übrig | Zeit+: 1 übrig    │
└─────────────────────────────────────┘

Was ist eine Seed Phrase?

⏱️ 00:45.234  (Millisekunden laufen!)

○ A) Ein Passwort für die Wallet
○ B) Eine Liste von 12-24 Wörtern zur Wiederherstellung
○ C) Eine Backup-Datei
○ D) Ein Sicherheitstoken

[💡 Hint verwenden (-20 Punkte)]
[⏰ +15 Sekunden (-10 Punkte)]
```

**Nach Antwort - Feedback:**

```
✅ Richtig! +578 Punkte

Antwortzeit: 2.145 Sekunden
Berechnete Punkte: 578

Die richtige Antwort ist:
B) Eine Liste von 12-24 Wörtern zur Wiederherstellung

💡 Erklärung:
Eine Seed Phrase (auch Recovery Phrase oder Mnemonic) 
ist eine Liste von 12 oder 24 Wörtern, die als Backup 
deiner Wallet dient. Mit ihr kannst du deine Wallet 
auf jedem Gerät wiederherstellen.

[Weiter zur nächsten Frage]
```

### 5. Level-Abschluss

**Szenario A: Bestanden**

```
🎉 Level 2 abgeschlossen!

Richtige Antworten: 8/10 (80%)
Erzielte Punkte: 1.240
Benötigte Zeit: 4:32.145

✅ Level bestanden! (mind. 70%)

📊 Deine Gesamt-Statistik:
• Gesamtpunkte: 8.450
• Abgeschlossene Level: 2

[➡️ Weiter zu Level 3]
[📋 Zurück zur Level-Übersicht]
```

**Szenario B: Nicht bestanden**

```
😔 Level 2 nicht bestanden

Richtige Antworten: 6/10 (60%)
Erzielte Punkte: 0 (Minimum-Regel angewendet)
Benötigte Zeit: 8:40.523

❌ Du benötigst mindestens 7 richtige Antworten (70%).

⚠️ Hinweis: Deine Gesamtpunktzahl wurde auf 0 gesetzt, 
da die negativen Einzelpunkte das Minimum unterschritten.

💡 Tipp: 
• Lade dir das PDF herunter zur Vorbereitung!
• Versuche schneller zu antworten
• Nutze Hints strategisch

[🔄 Level 2 wiederholen]
[📋 Zurück zur Level-Übersicht]
```

**Szenario C: Bestanden, aber niedriger Score**

```
🎯 Level 5 abgeschlossen!

Richtige Antworten: 11/15 (73%)
Erzielte Punkte: 145
Benötigte Zeit: 12:45.823

✅ Level bestanden! (mind. 70%)

⚠️ Dein Score war eher niedrig. Du hast viele Power-Ups 
verwendet und bist bei einigen Fragen in den Timeout geraten.

💡 Tipp für bessere Scores:
• Bereite dich mit dem PDF vor
• Antworte schneller (mehr Punkte!)
• Spare Power-Ups für wirklich schwere Fragen

📊 Deine Gesamt-Statistik:
• Gesamtpunkte: 8.595
• Abgeschlossene Level: 5

[➡️ Weiter zu Level 6]
[📋 Zurück zur Level-Übersicht]
```

---

## PDF-Integration

### Zeitpunkt: VOR dem Level

**Zweck:** Vorbereitung auf das Thema

**Zugriff:**
- Auf Level-Start-Screen
- Download-Link prominent platziert
- Optional, aber empfohlen

### PDF-Konzept

**Inhalt (Beispiel Level 2: Wallets & Accounts):**
- Übersicht verschiedener Wallet-Typen
- Installation & Setup
- Seed Phrase & Sicherheit
- Account-Verwaltung
- Best Practices
- Häufige Fehler
- Weiterführende Links

**Struktur:**
```
/downloads/
  ├── level1_polkadot_basics.pdf
  ├── level2_wallets_accounts.pdf
  ├── level3_dot_token.pdf
  ├── level4_staking.pdf
  └── ...
```

**Vorteil:**
- Spieler können sich gezielt vorbereiten
- Reduziert Frustration bei schwierigen Themen
- Fördert tieferes Lernen
- PDF kann auch nach dem Spiel als Nachschlagewerk dienen

---

## Wiederholungslogik

### Erster Versuch

**Zählt für:**
- ✅ Gesamtpunktzahl
- ✅ Gesamtzeit
- ✅ Leaderboard
- ✅ Level-Freischaltung

**Gespeichert in:** `players.json` → `levels.X.firstAttempt`

**Minimum-Regel gilt:**
- Wenn Level-Score negativ → wird auf 0 gesetzt
- Diese 0 zählt für Gesamtpunktzahl

### Zweiter+ Versuch

**Modus:** Übung/Training

**Zählt für:**
- ❌ KEINE neuen Punkte
- ❌ KEINE neue Zeit
- ❌ KEIN Leaderboard-Update

**Zweck:** Lernen und Wissen vertiefen

**UI-Hinweis beim Wiederholen:**
```
ℹ️ Übungsmodus

Du wiederholst dieses Level zum Lernen.
Deine Punkte und Zeit aus dem ersten Versuch bleiben erhalten.

Empfehlung: Lade dir das PDF herunter zur Vorbereitung!

[PDF herunterladen]  [Level starten]
```

---

## UI/UX Flow

### Gesamt-Flow

```
1. Startseite
   ↓
2. Wallet verbinden + Spielername
   ↓
3. Level-Übersicht
   ↓
4. Level auswählen
   ↓
5. Level-Info + PDF-Download (optional)
   ↓
6. Level starten (Countdown)
   ↓
7. Fragen-Loop (variabel viele Fragen)
   │  └─ Timer in ms anzeigen (z.B. 45.234s)
   ↓
8. Level-Abschluss
   ↓
9. Zurück zu Level-Übersicht oder nächstes Level
```

### Haupt-Navigation

```
[ Level-Übersicht ]
[ Leaderboard ]
[ Profil ]
[ Logout ]
```

### Leaderboard

```
┌─────────────────────────────────────┐
│ 🏆 Top 100 - Leaderboard            │
└─────────────────────────────────────┘

Sortierung: [ Punkte ▼ ] [ Zeit ] [ Level ]

Rang | Spieler      | Punkte | Zeit       | Level
─────┼──────────────┼────────┼────────────┼──────
  1  | Alice        | 14.823 | 3:42:15.234| 15/15
  2  | Tom          | 14.580 | 3:55:30.123| 15/15
  3  | Bob          | 14.579 | 3:55:31.456| 15/15
  4  | Charlie      | 13.950 | 4:12:00.789| 14/15
  5  | Dave         |  8.420 | 2:15:45.012|  8/15
...

Deine Platzierung: #2

💡 Millisekunden entscheiden über Platzierungen!
```

**Wichtig:** Dank Millisekunden-Genauigkeit sind Gleichstände praktisch unmöglich!

### Profil

```
┌─────────────────────────────────────┐
│ 👤 Profil                            │
└─────────────────────────────────────┘

Spielername: Tom
Wallet: 15oF4...BvVe
Registriert: 07.12.2024

📊 Statistiken:
• Gesamtpunkte: 14.580
• Gesamtzeit: 3:55:30.123
• Abgeschlossene Level: 15/15
• Leaderboard-Rang: #2

📈 Level-Details:
  Level 1: ✅ 720 Punkte (7/8 - 87,5%) - 3:05.234
  Level 2: ✅ 820 Punkte (9/10 - 90%) - 4:12.456
  Level 3: ✅ 0 Punkte (6/12 - 50%) - 8:23.789 ❌
  Level 5: ✅ 1.280 Punkte (13/15 - 86,7%) - 10:12.012
  ...

🔄 Wiederholungen:
  Level 3: 5x geübt (nicht bestanden im 1. Versuch)
  Level 7: 2x geübt

⚡ Deine schnellste Antwort:
  Level 8, Frage 3: 0.847 Sekunden (595 Punkte!)

🐌 Deine langsamste richtige Antwort:
  Level 5, Frage 12: 58.234 Sekunden (18 Punkte)
```

---

## Technische Anforderungen

### Frontend

**Technologie:** TBD (React / Vue / Vanilla JS)

**Funktionen:**
- Wallet-Verbindung (Polkadot.js Extension API)
- **Millisekunden-Timer** (performance.now() oder Date.now())
- Präzise Zeitmessung
- Lokale State-Verwaltung
- JSON-Handling (Lesen/Schreiben)
- PDF-Handling (Links, ggf. Viewer)
- Responsive Design (Desktop + Mobile)

**Wichtig für Zeitmessung:**
```javascript
// Start bei Frage-Anzeige
const startTime = performance.now()

// Bei Antwort
const endTime = performance.now()
const elapsedTimeMs = endTime - startTime

// Punkte berechnen
const tQuestionMs = tQuestion × 1000
const remainingTimeMs = tQuestionMs - elapsedTimeMs
const points = Math.round(remainingTimeMs × pointsPerMillisecond)
```

### Backend

**Szenario A: Client-Only (empfohlen für Start)**
- Alle Logik im Browser
- JSON-Dateien über HTTP laden
- `players.json` über einfache API schreiben

**Szenario B: PHP-Backend**
- JSON-Verwaltung serverseitig
- API für Leaderboard
- Integration mit vonflandern.org
- Bessere Sicherheit

### APIs / Libraries

**Erforderlich:**
- Polkadot.js API
- Polkadot.js Extension API

**Optional:**
- Chart.js (für Statistiken)
- PDF.js (für PDF-Preview)

---

## Änderungen gegenüber Version 2.0

### Punktesystem komplett überarbeitet

🔄 **Neue Formel:**
- Vorher: `maxPoints` mit `gracePeriod` und linearem Abfall danach
- Jetzt: `(tQuestion_ms - verstricheneZeit_ms) × pointsPerMillisecond`

✅ **Vorteile:**
- Keine Ungerechtigkeit durch Grace Period
- Millisekunden-Genauigkeit
- Praktisch keine Gleichstände im Leaderboard
- Einfachere, fairere Formel
- Belohnt wirklich schnelle Spieler maximal

### Entfernte Variablen

❌ `maxPoints` - nicht mehr benötigt (dynamisch berechnet)  
❌ `gracePeriod` - keine Schonzeit mehr

### Neue Variablen

✅ `pointsPerMillisecond` - Punktwert pro Millisekunde (Dezimalzahl)

### Neue Regel: Level-Score Minimum

✅ **Minimum-Regel:**
- Level-Score kann nicht negativ sein
- Wenn nach allen Fragen negativ → wird auf 0 gesetzt
- Verhindert "Schulden" und Frustration
- Einzelne Fragen können weiterhin negativ sein (temporär)

### Anpassungen in Datenstruktur

**questions.json:**
- Entfernt: `maxPoints`, `gracePeriod`
- Hinzugefügt: `pointsPerMillisecond`

**players.json:**
- Hinzugefügt: `detailedScores` mit `timeMs` pro Frage
- `score` auf Level-Ebene: Minimum = 0

---

## Offene Punkte / Nice-to-Have

### Mögliche Erweiterungen

- [ ] Achievements/Badges System
- [ ] Daily Challenges
- [ ] Freunde einladen / Challenges
- [ ] Detaillierte Statistiken (Erfolgsrate pro Thema)
- [ ] Sprachauswahl (Deutsch/Englisch)
- [ ] Mobile App Version
- [ ] NFT als Belohnung für Vollständigkeit
- [ ] Integration mit Polkadot Governance
- [ ] Community-erstellte Fragen
- [ ] Experten-Modus (härtere Fragen, mehr Punkte)
- [ ] Ranglisten nach Durchschnittszeit pro Level
- [ ] "Perfektes Level" Badge (alle Fragen < 5s beantwortet)

### Zu klärende Fragen

1. **Hosting:** 
   - Subdomain von vonflandern.org?
   - Eigene Domain?

2. **Fragen-Erstellung:** 
   - Wer erstellt die Fragen?
   - Review-Prozess?
   - Community-Input?

3. **Wallet-Sicherheit:**
   - Signatur-Verifikation implementieren?
   - Session-Management?

4. **Mehrfach-Accounts:**
   - Akzeptabel oder weitere Maßnahmen?
   - IP-Tracking (problematisch für DSGVO)?

5. **Anti-Cheat:**
   - Wie verhindern wir Script-basierte Auto-Clicker?
   - Timer-Manipulation clientseitig?

---

## Nächste Schritte

1. ✅ Konzept finalisieren (Version 3.0)
2. ⬜ Technologie-Stack festlegen
3. ⬜ Design/Mockups erstellen
4. ⬜ PDFs für Level 1-5 erstellen
5. ⬜ Fragen für Level 1-5 schreiben
6. ⬜ Prototyp entwickeln (Level 1-3)
7. ⬜ Wallet-Integration testen
8. ⬜ Millisekunden-Timer testen & kalibrieren
9. ⬜ Beta-Testing mit ausgewählten Nutzern
10. ⬜ Feedback einarbeiten
11. ⬜ Launch

---

## Kontakt & Feedback

**Projekt:** vonFlandern Polkadot Quiz  
**Website:** vonflandern.org  
**Validator:** vonFlandern/VFDB  

---

**Dokumenten-Ende**
