# 🎮 Polkadot Quiz

An interactive quiz to test and deepen your knowledge about Polkadot.

![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat&logo=php&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> **Note:** This is currently a test version with 3 sample quiz levels. More comprehensive content is in development.

## ✨ Features

### Quiz System
- **3 Test Quiz Levels** with progressive difficulty
  - Level 1: Polkadot Basics
  - Level 2: Polkadot Architecture (Relay Chain, Parachains, XCM)
  - Level 3: Economics & Governance (NPoS, Staking, Treasury)
- **Timer & Points System** with bonus points for fast answers
- **Hint System** for additional help
- **PDF Downloads** with knowledge base for each level

### Blockchain Integration
- **Wallet Integration** (Polkadot.js, Talisman, SubWallet)
- **Multi-Chain Aggregation**
  - Asset Hub: Balance overview (Transferable, Reserved, Frozen)
  - Relay Chain: Balances + Staking info + OpenGov votes
  - People Chain: On-chain Identity with verification badges
- **Network Support**: Polkadot & Kusama with auto-switching
- **Real-time Balance Display** with correct decimals (10 for DOT, 12 for KSM)
- **Sub-Identity Support** with parent info inheritance
- **Registrar Verification Badges** (Web3 Foundation, Certus One, Chevdor)

### Social Features
- **Leaderboard System** to compare with other participants
- **On-Chain Identity Display** with verified badges
- **Responsive Design** for desktop and mobile

### User Experience
- **Polkadot Logo Loading Spinner** - Rotating logo during async operations
- **Automatic Player Registration** - Complete dataset created before quiz starts
- **Blocking On-Chain Data Load** - All blockchain data loaded before Level Overview
- **Dynamic UI Design** - Hamburger menu adapts to player progress (categories)

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
├── api/                          # Backend API endpoints
│   ├── get-leaderboard.php       # Fetch leaderboard
│   ├── get-player.php            # Fetch player data
│   ├── save-score.php            # Save score
│   ├── register-player.php       # Register player
│   ├── save-onchain-data.php     # Save multi-chain data
│   ├── convert-address.php       # SS58 address conversion
│   ├── check-name.php            # Name availability check
│   └── suggest-name.php          # Generate unique names
├── assets/
│   ├── css/                      # Stylesheets
│   │   ├── quiz-core.css         # Core quiz styles
│   │   └── quiz-standalone.css   # Standalone page styles
│   ├── js/                       # JavaScript modules
│   │   ├── quiz-engine.js        # Quiz logic
│   │   ├── timer.js              # High-precision timer
│   │   ├── ui.js                 # UI interactions
│   │   ├── wallet.js             # Wallet integration
│   │   └── onchain-service.js    # Multi-chain aggregation
│   └── img/                      # Images & logos
├── data/
│   ├── questions.json            # Quiz questions & answers
│   ├── categories.json           # Level categories
│   ├── config.json               # Quiz configuration
│   ├── profanity-words.json      # Name filter wordlists
│   └── players.json              # Player data + on-chain cache
├── downloads/                    # PDF downloads
├── index.php                     # Main page
├── leaderboard.php               # Leaderboard page
├── config.php                    # Server configuration
├── SS58AddressConverter.php      # Address format converter
└── SS58AddressConverterFallback.php  # Pure PHP fallback
```

## 🎯 How It Works

### Quiz Flow

1. **Connect Wallet**: Players connect their Polkadot wallet (Polkadot.js, Talisman, SubWallet)
2. **Auto-Registration**: Player registered in database with blockchain data loaded (blocking)
3. **Choose Name**: Set unique player name (3-20 characters, profanity-filtered)
4. **Select Level**: Choose from available levels based on progress
5. **Start Quiz**: Answer multiple-choice questions with timer
6. **Collect Points**: 
   - Fast answers = more points
   - Using hints = point deduction
   - Extending time = point deduction
7. **Submit Score**: First attempt counts for leaderboard, subsequent attempts for practice

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

## � Multi-Chain Integration

### Architecture

The quiz integrates real-time blockchain data from 3 chains:

1. **Asset Hub** (required)
   - Native token balances (DOT/KSM)
   - Transferable, Reserved, Frozen amounts
   - Primary balance source after token migration

2. **Relay Chain** (optional)
   - Legacy balances + Staking information
   - Active stake, Unlocking schedule
   - OpenGov voting participation (16 tracks)

3. **People Chain** (optional)
   - On-chain Identity display
   - Sub-Identity support with parent info
   - Registrar verification badges

### Data Flow

1. Connect to Asset Hub (sequential, required)
2. Connect to Relay + People in parallel
3. Aggregate data from all chains
4. Cache for 10 minutes (session storage + backend)
5. Auto-refresh every 10 minutes

### Loading States

**Polkadot Logo Spinner** (rotating logo, no text):
- Wallet account loading
- Player registration
- On-chain data loading (blocking)
- Data refresh operations
- Network switching

**Automatic Player Registration Flow**:
1. User clicks "Continue to Quiz"
2. Spinner shows (registration phase)
3. Player created in `players.json` with `playerName: null`
4. Spinner updates (loading on-chain data)
5. Blocking load of all blockchain data (Asset Hub + Relay + People)
6. Level Overview shown with complete dataset
7. Name input modal appears (if no name set)

### Supported Networks

- **Polkadot**: 10 decimals, Asset Hub + Relay + People
- **Kusama**: 12 decimals, Asset Hub + Relay + People

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (class-based), CSS3, HTML5
- **Backend**: PHP 7.4+
- **Data**: JSON-based storage (no database)
- **Wallet**: Polkadot.js, Talisman, SubWallet integration
- **Blockchain**: Polkadot.js API for multi-chain queries
- **Address Format**: SS58 encoding with GMP + Sodium (fallback: pure PHP)

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
