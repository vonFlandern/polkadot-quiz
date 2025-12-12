# 🎮 Polkadot Quiz

An interactive quiz to test and deepen your knowledge about Polkadot.

![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat&logo=php&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> **Note:** This is currently a test version with 3 sample quiz levels. More comprehensive content is in development.

## ✨ Features

- **3 Test Quiz Levels** with progressive difficulty
  - Level 1: Polkadot Basics
  - Level 2: Polkadot Architecture (Relay Chain, Parachains, XCM)
  - Level 3: Economics & Governance (NPoS, Staking, Treasury)
- **Wallet Integration** for Polkadot SS58 addresses
- **Leaderboard System** to compare with other participants
- **Timer & Points System** with bonus points for fast answers
- **Hint System** for additional help
- **PDF Downloads** with knowledge base for each level
- **Responsive Design** for desktop and mobile

## 🚀 Installation

### Prerequisites

- PHP 7.4 or higher
- Web server (Apache/Nginx) or XAMPP/WAMP
- Write permissions for `data/` folder

### Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/vonFlandern/polkadot-quiz.git
   cd polkadot-quiz
   ```

2. **Adjust configuration**
   ```bash
   # Edit config.php and adjust to your environment
   nano config.php
   ```

3. **Set permissions**
   ```bash
   chmod 755 data/
   chmod 644 data/*.json
   ```

4. **Open in browser**
   ```
   http://localhost/polkadot-quiz/
   ```

## 📂 Project Structure

```
polkadot-quiz/
├── api/                      # Backend API endpoints
│   ├── get-leaderboard.php   # Fetch leaderboard
│   ├── get-player.php        # Fetch player data
│   ├── save-score.php        # Save score
│   ├── register-player.php   # Register player
│   └── convert-address.php   # SS58 address conversion
├── assets/
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript modules
│   │   ├── quiz-engine.js    # Quiz logic
│   │   ├── timer.js          # Timer function
│   │   ├── ui.js             # UI interactions
│   │   └── wallet.js         # Wallet integration
│   └── img/                  # Images & logos
├── data/
│   ├── questions.json        # Quiz questions & answers
│   ├── config.json           # Quiz configuration
│   └── players.json          # Player data (auto-generated)
├── downloads/                # PDF downloads
├── index.php                 # Main page
├── leaderboard.php           # Leaderboard page
└── config.php                # Server configuration
```

## 🎯 How It Works

### Quiz Flow

1. **Connect Wallet** (optional): Players can connect their Polkadot wallet
2. **Select Level**: Choose between Level 1-3
3. **Start Quiz**: Answer multiple-choice questions
4. **Collect Points**: 
   - Fast answers = more points
   - Using hints = point deduction
   - Extending time = point deduction
5. **Submit Score**: Appear on the leaderboard after completion

### Points System

- Base points calculated by time: `time × pointsPerMillisecond`
- Bonus for remaining time: `remainingSeconds × timeAddBonus`
- Deduction for hints: `hintPenalty` points
- Deduction for time extension: `timeAddPenalty` points

## 🔧 Configuration

### Adding Quiz Questions

Edit `data/questions.json` to add new levels or questions:

```json
{
  "question": "What is Polkadot?",
  "answers": [
    "A blockchain platform for interoperability",
    "A cryptocurrency"
  ],
  "answerCount": 2,
  "correct": 0,
  "hint": "It connects different blockchains...",
  "explanation": "Polkadot is a blockchain platform...",
  "tQuestion": 30,
  "pointsPerMillisecond": 0.02
}
```

### Server Settings

Adjust `config.php` to your environment:

```php
define('BASE_URL', '/polkadot-quiz/');
define('DATA_DIR', __DIR__ . '/data/');
```

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: PHP 7.4+
- **Data**: JSON-based storage
- **Wallet**: Polkadot.js integration for SS58 addresses

## 📊 Leaderboard

The leaderboard displays top players with:
- Player name
- Polkadot address (anonymized)
- Total score across all levels
- Level-specific scores

## 📝 License

This project is licensed under the MIT License.

## 🐛 Bug Reports

Please open an issue on GitHub if you find bugs or have suggestions for improvements.

## 👥 Author

**vonFlandern** - [GitHub](https://github.com/vonFlandern)

---

⭐ If you like this project, give it a star on GitHub!
