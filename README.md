# 🎮 Polkadot Quiz

Ein interaktives Quiz zum Testen und Vertiefen deines Wissens über Polkadot.

![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat&logo=php&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- **3 Quiz-Level** mit progressivem Schwierigkeitsgrad
  - Level 1: Polkadot Basics
  - Level 2: Polkadot Architektur (Relay Chain, Parachains, XCM)
  - Level 3: Economics & Governance (NPoS, Staking, Treasury)
- **Wallet-Integration** für Polkadot SS58-Adressen
- **Leaderboard-System** zum Vergleich mit anderen Teilnehmern
- **Timer & Punktesystem** mit Bonuspunkten für schnelle Antworten
- **Hint-System** für zusätzliche Hilfestellungen
- **PDF-Downloads** mit Wissensbasis zu jedem Level
- **Responsive Design** für Desktop und Mobile

## 🚀 Installation

### Voraussetzungen

- PHP 7.4 oder höher
- Webserver (Apache/Nginx) oder XAMPP/WAMP
- Schreibrechte für `data/` Ordner

### Setup

1. **Repository klonen**
   ```bash
   git clone https://github.com/vonFlandern/polkadot-quiz.git
   cd polkadot-quiz
   ```

2. **Konfiguration anpassen**
   ```bash
   # config.php bearbeiten und an deine Umgebung anpassen
   nano config.php
   ```

3. **Berechtigungen setzen**
   ```bash
   chmod 755 data/
   chmod 644 data/*.json
   ```

4. **Im Browser öffnen**
   ```
   http://localhost/polkadot-quiz/
   ```

## 📂 Projektstruktur

```
polkadot-quiz/
├── api/                      # Backend API-Endpunkte
│   ├── get-leaderboard.php   # Leaderboard abrufen
│   ├── get-player.php        # Spielerdaten abrufen
│   ├── save-score.php        # Score speichern
│   ├── register-player.php   # Spieler registrieren
│   └── convert-address.php   # SS58 Adresskonvertierung
├── assets/
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript-Module
│   │   ├── quiz-engine.js    # Quiz-Logik
│   │   ├── timer.js          # Timer-Funktion
│   │   ├── ui.js             # UI-Interaktionen
│   │   └── wallet.js         # Wallet-Integration
│   └── img/                  # Bilder & Logos
├── data/
│   ├── questions.json        # Quiz-Fragen & Antworten
│   ├── config.json           # Quiz-Konfiguration
│   └── players.json          # Spielerdaten (wird automatisch erstellt)
├── downloads/                # PDF-Downloads
├── index.php                 # Hauptseite
├── leaderboard.php           # Leaderboard-Seite
└── config.php                # Server-Konfiguration
```

## 🎯 Wie es funktioniert

### Quiz-Ablauf

1. **Wallet verbinden** (optional): Spieler können ihre Polkadot-Wallet verbinden
2. **Level auswählen**: Zwischen Level 1-3 wählen
3. **Quiz starten**: Fragen mit Multiple-Choice-Antworten
4. **Punkte sammeln**: 
   - Schnelle Antworten = mehr Punkte
   - Hints nutzen = Punktabzug
   - Zeit verlängern = Punktabzug
5. **Score eintragen**: Nach Abschluss im Leaderboard erscheinen

### Punktesystem

- Basispunkte werden nach Zeit berechnet: `Zeit × pointsPerMillisecond`
- Bonus für Zeitüberschuss: `übrigeSekunden × timeAddBonus`
- Abzug für Hints: `hintPenalty` Punkte
- Abzug für Zeitverlängerung: `timeAddPenalty` Punkte

## 🔧 Konfiguration

### Quiz-Fragen hinzufügen

Bearbeite `data/questions.json` um neue Levels oder Fragen hinzuzufügen:

```json
{
  "question": "Was ist Polkadot?",
  "answers": [
    "Eine Blockchain-Plattform für Interoperabilität",
    "Eine Kryptowährung"
  ],
  "answerCount": 2,
  "correct": 0,
  "hint": "Es verbindet verschiedene Blockchains...",
  "explanation": "Polkadot ist eine Blockchain-Plattform...",
  "tQuestion": 30,
  "pointsPerMillisecond": 0.02
}
```

### Server-Einstellungen

Passe `config.php` an deine Umgebung an:

```php
define('BASE_URL', '/polkadot-quiz/');
define('DATA_DIR', __DIR__ . '/data/');
```

## 🛠️ Technologie-Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: PHP 7.4+
- **Daten**: JSON-basierte Speicherung
- **Wallet**: Polkadot.js Integration für SS58-Adressen

## 📊 Leaderboard

Das Leaderboard zeigt die besten Spieler mit:
- Spielername
- Polkadot-Adresse (anonymisiert)
- Gesamtscore über alle Level
- Level-spezifische Scores

## 🤝 Contributing

Beiträge sind willkommen! So kannst du mitmachen:

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📝 Lizenz

Dieses Projekt steht unter der MIT-Lizenz.

## 🐛 Bug Reports

Bitte öffne ein Issue auf GitHub wenn du Bugs findest oder Verbesserungsvorschläge hast.

## 🌟 Roadmap

- [ ] Mehr Quiz-Level hinzufügen
- [ ] Mehrsprachige Unterstützung
- [ ] NFT-Badges für Quiz-Erfolge
- [ ] On-Chain Leaderboard
- [ ] Integration mit Polkadot Governance

## 👥 Autor

**vonFlandern** - [GitHub](https://github.com/vonFlandern)

## 🙏 Acknowledgments

- Polkadot Community für die Inspiration
- Web3 Foundation für die Entwicklung von Polkadot
- Alle Contributors und Tester

---

⭐ Falls dir dieses Projekt gefällt, gib ihm einen Star auf GitHub!
