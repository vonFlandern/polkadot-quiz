# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Language Preference

**IMPORTANT**: Please respond in German (Deutsch) when working on this project. The developer prefers German for all interactions, code comments, commit messages, and documentation related to this codebase.

---

## Project Overview

**Polkadot Quiz** is an interactive, gamified educational platform for learning about the Polkadot blockchain ecosystem. It features:
- Wallet-based authentication (Polkadot.js, Talisman, SubWallet)
- Millisecond-precise scoring system
- 15 progressive levels with varying difficulty
- Competitive leaderboard (first attempt only)
- Power-ups (hints and time extensions)

**Tech Stack**: Vanilla JavaScript frontend + PHP backend + JSON file storage (no database)
**Environment**: XAMPP (Apache + PHP) on Windows

---

## Development Commands

### Running the Application
```bash
# Start XAMPP Apache and navigate to:
http://localhost/Quiz/

# Or if in a different XAMPP htdocs path:
http://localhost/<your-path>/Quiz/
```

### Testing
- No automated tests currently exist
- Manual testing via browser and Polkadot wallet extensions
- Check browser console (F12) for JavaScript errors
- Check PHP error logs in XAMPP control panel

### File Permissions
Ensure `data/` directory is writable by PHP:
```bash
chmod 755 data/
chmod 644 data/*.json
```

---

## High-Level Architecture

### Frontend Architecture (Vanilla JS - Class-Based)

The frontend is organized into **4 main classes** that work together:

#### 1. `QuizEngine` (quiz-engine.js)
**Purpose**: Core game logic and state management
**Responsibilities**:
- Load config and questions from JSON
- Manage level state (score, hints, time-adds)
- Calculate points based on millisecond-precise timing
- Enforce minimum score rule (level score ≥ 0)
- Save/load player data via API calls

**Key Methods**:
- `startLevel(levelNumber)` - Initialize level state
- `calculatePoints(elapsedMs, isCorrect, hintUsed, timeAddUsed)` - Scoring formula
- `calculateLevelResult()` - Apply minimum-rule (score cannot be negative)
- `saveLevelResult()` - POST to `api/save-score.php`

#### 2. `QuizUI` (ui.js)
**Purpose**: UI state management and screen transitions
**Responsibilities**:
- Screen flow (start → wallet → level-overview → question → feedback → complete)
- Event handler registration (wallets, buttons, countdowns)
- Wallet account selection and display
- Player name management (change name modal)

**Key Patterns**:
- Single event listener registration (prevents duplicates via `eventListenersInitialized` flag)
- Countdown cleanup (clears intervals to prevent double-execution)
- Account display uses **Polkadot-formatted** addresses (first 12 chars)

#### 3. `WalletManager` (wallet.js)
**Purpose**: Polkadot wallet integration
**Responsibilities**:
- Detect available extensions (polkadot-js, talisman, subwallet)
- Connect and fetch accounts
- Future: Message signing for verification

**Important**: Wallet accounts return **generic (Substrate)** addresses by default. These are converted to Polkadot format (prefix `1`) for display only.

#### 4. `QuizTimer` (timer.js)
**Purpose**: Millisecond-precise time measurement
**Uses**: `performance.now()` for high-resolution timing

---

### Backend Architecture (PHP + JSON)

#### API Endpoints (RESTful-style)
All endpoints in `api/` directory, respond with JSON:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `register-player.php` | POST | Create/update player account |
| `save-score.php` | POST | Save level completion data |
| `get-player.php` | POST | Fetch player data by wallet address |
| `get-leaderboard.php` | GET | Top 100 players ranked by totalScore |
| `check-name.php` | POST | Verify username availability |
| `suggest-name.php` | POST | Generate unique username |
| `convert-address.php` | POST | Convert SS58 addresses between formats |

#### Shared Configuration (`config.php`)
**Provides**:
- `loadJSON($filename)` - Read from `data/` directory
- `saveJSON($filename, $data)` - Write with file locking (LOCK_EX)
- `isValidPolkadotAddress($address)` - Regex validation
- `isPlayerNameAllowed($name)` - Profanity filter & character set validation
- `checkPlayerNameAvailability($name, $walletAddress)` - Complete name validation pipeline
- `jsonResponse()` / `errorResponse()` - Standardized API responses
- CORS headers for API access

#### SS58 Address Handling
**Critical Concept**: Polkadot uses SS58 address encoding with different network prefixes:
- **Generic (Substrate)**: Prefix `5` - Used as **PRIMARY KEY** in storage
- **Polkadot**: Prefix `1` - Used for **DISPLAY ONLY**

**Two Implementations**:
1. `SS58AddressConverter.php` - Uses GMP + Sodium (faster, preferred)
2. `SS58AddressConverterFallback.php` - Pure PHP fallback

**Pattern Used Everywhere**:
```php
// Store GENERIC address as primary key
$genericAddress = $walletAddress; // Original from wallet
$polkadotAddress = $walletAddress;

// Convert for display
try {
    $polkadotAddress = SS58AddressConverter::toPolkadot($walletAddress);
} catch (Exception $e) {
    // Fallback: use generic for both
}

// Save both
$player = [
    'genericAddress' => $genericAddress,      // PRIMARY KEY
    'polkadotAddress' => $polkadotAddress,    // Display only
    'walletAddress' => $genericAddress,       // Backward compatibility
    // ...
];
```

**Why This Matters**: Players connecting with different wallet extensions may present addresses in different formats. Using generic as primary key ensures consistency.

---

### Data Model (JSON Files)

#### `data/config.json`
```json
{
  "gameSettings": {},
  "branding": { "title", "logo", "colors" },
  "integration": { "allowIframe", "corsOrigins" }
}
```

**Note**: Level count is automatically determined from `questions.json` via `Object.keys(questions).length`.

#### `data/questions.json`
Structured as `level1`, `level2`, etc. Each level contains:
```json
{
  "level1": {
    "catId": 1,
    "levelTitle": "Level Title",
    "levelInfo": "Description...",
    "pdfUrl": "/downloads/level1.pdf",
    "pdfTitle": "PDF Title",
    "hintCount": 3,              // Hints available for this level
    "timeAddCount": 2,           // Time additions available for this level
    "minCorrect": 5,             // Minimum correct answers to pass (absolute count)
    "questions": [
      {
        "question": "...",
        "answers": ["A", "B", "C", "D"],
        "answerCount": 4,
        "correct": 0,
        "hint": "...",
        "explanation": "...",
        "tQuestion": 30,              // Seconds
        "pointsPerMillisecond": 0.02, // Scoring rate
        "hintPenalty": 20,
        "timeAddPenalty": 10,
        "timeAddBonus": 15
      }
    ]
  }
}
```

**Variable Question Counts**: Each level can have 3-20 questions (determined by array length).
**Level-specific Settings**: `hintCount`, `timeAddCount`, and `minCorrect` (absolute number of required correct answers) can differ per level.

#### `data/profanity-words.json`
```json
{
  "de": ["word1", "word2"],  // German profanity list (LDNOOBW)
  "en": ["word1", "word2"],  // English profanity list (LDNOOBW)
  "whitelist": ["assassin", "cockpit"]  // False positive exceptions
}
```

**Purpose**: Wordlists for player name filtering to prevent inappropriate names.
**Source**: LDNOOBW (List of Dirty, Naughty, Obscene, and Otherwise Bad Words)
**Features**: 
- 67 German + 75 English profanity words
- Leetspeak detection (e.g., "a$$" → "ass", "h3ll" → "hell")
- Whitelist for legitimate words (e.g., "assessment", "scunthorpe")
- Used by `isPlayerNameAllowed()` in config.php

#### `data/players.json`
```json
{
  "players": [
    {
      "genericAddress": "5F25E...",     // PRIMARY KEY
      "polkadotAddress": "13xNP...",    // For display
      "playerName": "Alice",
      "nameHistory": [...],
      "totalScore": 8450,               // Sum of firstAttempt scores
      "totalTime": 245,
      "completedLevels": 15,
      "levels": {
        "1": {
          "firstAttempt": {             // COUNTS for leaderboard
            "score": 420,
            "passed": true,
            "timestamp": "...",
            // ...
          },
          "bestAttempt": {               // Best of all attempts
            "score": 420,
            "passed": true
          },
          "attempts": 1,
          "unlocked": true                // Level progression flag
        }
      }
    }
  ]
}
```

**Key Concepts**:
- `firstAttempt`: Immutable after first play, counts for leaderboard
- `bestAttempt`: Updated if subsequent attempts score higher
- `unlocked`: Set to `true` when level is passed (can be on repeat attempt!)
- `totalScore` = sum of all `firstAttempt.score` values
- Level progression: Next level unlocks when `unlocked === true`

---

## Critical Business Logic

### Scoring System (Millisecond-Precise)

**Formula**:
```javascript
// Per question
tQuestion_ms = tQuestion × 1000  // e.g., 30s = 30,000ms
elapsedTime_ms = performance.now() - startTime
remainingTime_ms = tQuestion_ms - elapsedTime_ms

if (isCorrect && remainingTime_ms > 0) {
  points = Math.round(remainingTime_ms × pointsPerMillisecond)
  if (hintUsed) points -= hintPenalty
  if (timeAddUsed) points -= timeAddPenalty
} else {
  points = 0
}
```

**Level Score Minimum Rule**:
```javascript
// Individual questions CAN have negative points
questionPoints = [..., 50, -10, 20, -5, 100]

// But level total cannot be negative
levelScore = sum(questionPoints)
if (levelScore < 0) levelScore = 0
```

**Implementation**: Enforced in both:
- `quiz-engine.js` → `calculateLevelResult()`
- `api/save-score.php` → Line 82

### Level Progression Logic

**First Attempt** (counts for leaderboard):
```php
// save-score.php
if (!isset($player['levels'][$levelKey])) {
    $player['levels'][$levelKey] = [
        'firstAttempt' => $levelData,
        'bestAttempt' => $levelData,
        'attempts' => 1,
        'unlocked' => $levelData['passed']  // ← Unlock if passed
    ];

    $player['totalScore'] += $levelData['score'];  // ← Adds to leaderboard
}
```

**Subsequent Attempts** (practice mode):
```php
else {
    $player['levels'][$levelKey]['attempts']++;

    // Update bestAttempt if better
    if ($levelData['score'] > $currentBestScore) {
        $player['levels'][$levelKey]['bestAttempt'] = $levelData;
    }

    // IMPORTANT: Unlock even on repeat!
    if ($levelData['passed'] && !$player['levels'][$levelKey]['unlocked']) {
        $player['levels'][$levelKey]['unlocked'] = true;
        // Player can now access next level
    }

    // Does NOT add to totalScore!
}
```

**UI Display Logic** (ui.js, line 634):
```javascript
// Level is playable if:
const isUnlocked = levelNum === 1 || highestUnlockedLevel >= (levelNum - 1);

// Where highestUnlockedLevel is max of:
const unlockedLevels = Object.keys(playerLevels)
    .filter(key => playerLevels[key].unlocked === true)
    .map(key => parseInt(key));
const highestUnlockedLevel = Math.max(...unlockedLevels, 0);
```

### Name Change and Uniqueness

**Player Name Constraints**:
- 3-20 characters
- Latin character set only: `[a-zA-Z0-9äöüÄÖÜß\s\-_\.]`
- No profanity (German/English via LDNOOBW wordlists)
- Case-insensitive uniqueness check
- Exceptions: Same wallet can update own name
- Name history tracked in `nameHistory` array

**Validation Flow**:
1. Character set validation (Latin alphabet + German umlauts)
2. Profanity filter check:
   - Direct word matching (case-insensitive)
   - Leetspeak pattern detection (e.g., "a$$" → "ass", "h3ll" → "hell")
   - Whitelist bypass for false positives (e.g., "assessment", "cockpit")
3. Length validation (3-20 characters)
4. Uniqueness check (case-insensitive, except for same wallet)
5. Frontend checks via `api/check-name.php`
6. Backend enforces in both `register-player.php` and `save-score.php`
7. All name changes logged with timestamp

**Profanity Filter Implementation** (`config.php`):
```php
function isPlayerNameAllowed($name) {
    // 1. Character set restriction (Latin + German)
    if (!preg_match('/^[a-zA-Z0-9äöüÄÖÜß\s\-_\.]+$/u', $name)) {
        return ['allowed' => false, 'reason' => 'Invalid characters'];
    }
    
    // 2. Load profanity lists from JSON
    $wordlists = loadJSON('profanity-words.json');
    $profanityWords = array_merge($wordlists['de'], $wordlists['en']);
    $whitelist = $wordlists['whitelist'];
    
    // 3. Check whitelist first
    foreach ($whitelist as $whitelisted) {
        if (stripos($name, $whitelisted) !== false) {
            return ['allowed' => true];
        }
    }
    
    // 4. Direct profanity check
    foreach ($profanityWords as $badWord) {
        if (stripos($name, $badWord) !== false) {
            return ['allowed' => false, 'reason' => 'Inappropriate content'];
        }
    }
    
    // 5. Leetspeak pattern check (a→4@, e→3, i→1!, o→0, s→5$, etc.)
    // Convert name to lowercase and apply leetspeak reversal
    // Check again against profanity list
    
    return ['allowed' => true];
}
```

**Leetspeak Map**:
- `a` → `[a4@]`, `e` → `[e3]`, `i` → `[i1!]`, `o` → `[o0]`
- `s` → `[s5$]`, `t` → `[t7+]`, `l` → `[l1]`, `g` → `[g9]`, `b` → `[b8]`

---

## Common Development Tasks

### Adding a New Level
1. Edit `data/questions.json`:
   ```json
   "level4": {
     "levelInfo": "...",
     "pdfUrl": "/downloads/level4.pdf",
     "questions": [...]
   }
   ```
2. Add corresponding PDF to `downloads/` (optional but recommended)
3. Update `data/config.json` if `totalLevels` changes
4. Test: Start quiz, complete level 3, verify level 4 unlocks

### Modifying Scoring Formula
**Locations to update**:
1. `assets/js/quiz-engine.js` → `calculatePoints()` method
2. Document changes in concept document: `concept/Polkadot-Quiz-Konzept.md`

**Test**:
```javascript
// In browser console after completing a question:
quizEngine.levelState.questionScores
// Verify points calculation matches expected formula
```

### Debugging API Issues
1. Enable error display in `config.php` (already enabled):
   ```php
   error_reporting(E_ALL);
   ini_set('display_errors', 1);
   ```
2. Check PHP error logs in XAMPP control panel
3. Inspect Network tab in browser DevTools (F12)
4. Common issues:
   - File permissions on `data/*.json`
   - JSON syntax errors after manual edits
   - Concurrent write conflicts (solved by file locking)

### Testing Wallet Integration
**Without Real Wallet**:
- Modify `wallet.js` to return mock accounts:
```javascript
async connect() {
    // Mock for testing
    return [{
        address: '5F25EmKKwnaRUHGdkTG7RmPLtSG2g3uXSexGaC9d8FdT53zz',
        name: 'Test Account'
    }];
}
```

**With Real Wallet**:
- Install Polkadot.js extension
- Create test accounts
- Open browser console to see connection logs

---

## Important Constraints and Gotchas

### 1. SS58 Address Format Confusion
**Problem**: Different wallets return different address formats.

**Solution**: Always store `genericAddress` as primary key, convert for display only.

**Code Pattern**:
```javascript
// Frontend: When selecting account
walletManager.selectAccount({
    address: account.genericAddress,           // Generic for backend
    polkadotAddress: account.polkadotAddress  // Polkadot for UI
});
```

```php
// Backend: When searching for player
foreach ($playersData['players'] as $p) {
    $storedGeneric = $p['genericAddress'] ?? $p['walletAddress'];
    if ($storedGeneric === $genericAddress) {
        // Match found
    }
}
```

### 2. Event Listener Duplication
**Problem**: UI event listeners can register multiple times if screens are revisited.

**Solution**: Use flag in `QuizUI`:
```javascript
if (this.eventListenersInitialized) {
    return; // Skip re-registration
}
this.eventListenersInitialized = true;
```

Or clone-and-replace pattern for dynamic elements:
```javascript
const newBtn = oldBtn.cloneNode(true);
oldBtn.replaceWith(newBtn);
newBtn.addEventListener('click', handler);
```

### 3. Countdown Interval Cleanup
**Problem**: Countdown can trigger multiple times if level is restarted quickly.

**Solution**: Always clear previous interval:
```javascript
if (this.countdownInterval) {
    clearInterval(this.countdownInterval);
    this.countdownInterval = null;
}
this.countdownInterval = setInterval(...)
```

### 4. Level Key Type Ambiguity
**Problem**: Level keys in `players.json` can be strings or integers.

**Solution**: Always convert to string when accessing:
```javascript
const levelKey = levelNum.toString();
const levelStats = playerLevels[levelNum] || playerLevels[levelKey];
```

### 5. JSON File Locking
**Problem**: Concurrent writes can corrupt `players.json`.

**Solution**: PHP's `saveJSON()` uses `flock(LOCK_EX)` - never bypass this!

### 6. Negative Scores
**Common Mistake**: Forgetting to apply minimum rule at level completion.

**Enforcement Points**:
- Frontend: `quiz-engine.js` line 220
- Backend: `save-score.php` line 82

**Test Case**:
```javascript
// If all questions get hints/timeAdds and are answered slowly:
questionScores = [-10, -5, -15, 5, -10]
sum = -35
levelScore = Math.max(0, -35) = 0 // ✓ Correct
```

---

## File Structure Reference

```
Quiz/
├── index.php                  # Main entry point
├── leaderboard.php            # Leaderboard display
├── config.php                 # Shared PHP utilities
├── SS58AddressConverter.php   # Address format converter (GMP)
├── SS58AddressConverterFallback.php # Pure PHP fallback
│
├── api/                       # Backend API endpoints
│   ├── register-player.php
│   ├── save-score.php
│   ├── get-player.php
│   ├── get-leaderboard.php
│   ├── check-name.php
│   ├── suggest-name.php
│   └── convert-address.php
│
├── assets/
│   ├── css/
│   │   ├── quiz-core.css
│   │   ├── quiz-standalone.css
│   │   └── countdown-styles.css
│   └── js/
│       ├── quiz-engine.js     # Core game logic
│       ├── ui.js              # UI state management
│       ├── wallet.js          # Wallet integration
│       └── timer.js           # Millisecond timer
│
├── data/                      # JSON data storage
│   ├── config.json            # Game settings
│   ├── questions.json         # All levels and questions
│   ├── players.json           # Player scores & progress
│   └── profanity-words.json   # Profanity filter wordlists
│
├── downloads/                 # Level PDFs
│   └── level1_polkadot_basics.pdf
│
└── concept/                   # Documentation
    └── Polkadot-Quiz-Konzept.md  # Detailed design specs (German)
```

---

## Integration with vonflandern.org

The quiz can be embedded via iframe:
```html
<iframe src="https://quiz.vonflandern.org/"
        width="100%" height="800px"
        style="border: none;">
</iframe>
```

CORS is configured in `config.php` to allow embedding from `vonflandern.org`.

---

## Future Considerations

**Planned Features** (see `concept/Polkadot-Quiz-Konzept.md`):
- Signature-based wallet verification
- Anti-cheat measures (timer manipulation detection)
- NFT rewards for completion
- Community-submitted questions
- Multi-language support (English)

**Technical Debt**:
- No database (JSON files become slow with many players)
- No caching layer
- Per-question hint/timeAdd tracking not implemented
- Session management is basic (sessionStorage only)

**Migration Path to Database**:
If player count exceeds ~1000:
1. Schema maps directly to current JSON structure
2. Keep `genericAddress` as PRIMARY KEY
3. Add indexes on `playerName` (UNIQUE), `totalScore` (for leaderboard)
4. Replace `loadJSON()`/`saveJSON()` calls with PDO queries

---

## Terminology

- **Generic Address**: Substrate address (prefix `5`), used as storage key
- **Polkadot Address**: Network-specific format (prefix `1`), display only
- **First Attempt**: Initial level completion, counts for leaderboard
- **Best Attempt**: Highest score across all attempts, for personal stats
- **Unlocked**: Level passed and next level accessible
- **Minimum Rule**: Level score cannot be negative (enforced at completion)
- **Grace Period**: Removed in v3.0 - points decay immediately from t=0

---

## Contact

**Project**: vonFlandern Polkadot Quiz
**Validator**: vonFlandern/VFDB
**Concept Version**: 3.0 (dated 2024-12-07)
**Implementation**: v0.1.0 (initial commit aa5321c)
