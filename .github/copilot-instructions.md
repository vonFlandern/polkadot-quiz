# Copilot Instructions for Polkadot Quiz

## Project Overview
Interactive gamified Polkadot blockchain quiz with wallet authentication, millisecond-precise scoring, and competitive leaderboards. Built with **Vanilla JavaScript (class-based)** frontend + **PHP backend** + **JSON file storage** (no database). Runs on **XAMPP** (Apache + PHP) on Windows.

## Architecture Patterns

### Frontend: 5 Core Classes (Vanilla JS)
- **QuizEngine** ([quiz-engine.js](assets/js/quiz-engine.js)) - Game logic, scoring, state management
- **QuizUI** ([ui.js](assets/js/ui.js)) - Screen transitions, event handlers, loading spinner, dynamic UI design
- **WalletManager** ([wallet.js](assets/js/wallet.js)) - Polkadot wallet integration
- **QuizTimer** ([timer.js](assets/js/timer.js)) - High-precision timing with `performance.now()`
- **OnChainService** ([onchain-service.js](assets/js/onchain-service.js)) - Multi-chain data aggregation (Asset Hub + Relay + People)

### Backend: Shared Utilities + API Endpoints
- **config.php** - `loadJSON()/saveJSON()` with file locking, CORS headers, validation helpers
- All [api/](api/) endpoints return standardized JSON via `jsonResponse()/errorResponse()`

## Critical Conventions

### SS58 Address Handling (MOST IMPORTANT!)
Polkadot uses different address formats. **Always** use this pattern:

```php
// Backend: Store GENERIC (prefix 5) as PRIMARY KEY
$genericAddress = $walletAddress; // Original from wallet
$polkadotAddress = SS58AddressConverter::toPolkadot($walletAddress); // For display

$player = [
    'genericAddress' => $genericAddress,     // PRIMARY KEY for lookups
    'polkadotAddress' => $polkadotAddress,   // Display only
    'walletAddress' => $genericAddress       // Backward compatibility
];
```

**Why**: Different wallet extensions return addresses in different formats. Generic ensures consistency.

### Scoring System: Minimum Rule
```javascript
// Individual question scores CAN be negative (hints/time-adds)
questionScores = [50, -10, 20, -5, 100]

// But level total CANNOT be negative
levelScore = Math.max(0, sum(questionScores)) // Enforced in quiz-engine.js AND save-score.php
```

### Level Progression: firstAttempt vs bestAttempt
```json
{
  "levels": {
    "1": {
      "firstAttempt": { "score": 420 },  // Immutable, counts for leaderboard
      "bestAttempt": { "score": 450 },   // Updated if subsequent attempts better
      "unlocked": true                    // Next level accessible
    }
  },
  "totalScore": 8450  // Sum of ALL firstAttempt scores
}
```

**Key**: `totalScore` ONLY includes first attempts. Practice runs update `bestAttempt` but don't affect leaderboard.

### Event Listener Deduplication
**Problem**: UI screens can reload, causing duplicate listeners.

```javascript
// Pattern 1: Flag check (ui.js)
if (this.eventListenersInitialized) return;
this.eventListenersInitialized = true;

// Pattern 2: Clone-and-replace for dynamic elements
const newBtn = oldBtn.cloneNode(true);
oldBtn.replaceWith(newBtn);
newBtn.addEventListener('click', handler);
```

### Automatic Player Registration (NEW!)
**"Continue to Quiz" creates complete player dataset BEFORE quiz starts**:

```javascript
// ui.js lines 336-376
showSpinner('Registering player...');
await fetch('api/register-player.php', {
    body: JSON.stringify({ walletAddress: address, playerName: null })
});
showSpinner('Loading on-chain data...');
await loadOnChainData(address, true, 'polkadot'); // BLOCKING!
hideSpinner();
showLevelOverview(); // Has complete dataset now
```

**Backend**: `register-player.php` accepts `playerName: null` for initial registration (validation skipped).

### Loading Spinner Pattern
**Polkadot Logo Spinner** (rotating logo, NO text):

```javascript
// Show spinner
this.showSpinner('Any text'); // Text ignored, only logo shown

// Hide spinner
this.hideSpinner();
```

**Used for**:
- Wallet account loading
- Player registration
- On-chain data loading (blocking)
- Refresh operations
- Network switching

### Dynamic UI Design Based on Progress
**Hamburger Menu & Header adapt to player's category**:

```javascript
// ui.js lines 661-707
applyAccountDesign(playerData) {
    const currentCategory = playerData.player?.currentCategory || 0;
    const categoryObj = quizEngine.getCategoryById(categoryId);
    const design = categoryObj.designSettings.account;
    
    // Set CSS variables
    root.style.setProperty('--account-header-color-left', design.header.colorLeft);
    root.style.setProperty('--account-menu-hamburger', design.headerMenu.colorHamburger);
    // ...
}
```

**Categories define colors** in [data/categories.json](data/categories.json) → `designSettings.account`

### JSON File Locking
**Never bypass** `saveJSON()` in config.php! Uses `flock(LOCK_EX)` to prevent concurrent write corruption.

```php
// Always use this wrapper
saveJSON('players.json', $playersData);

// Not this!
file_put_contents(QUIZ_DATA . '/players.json', json_encode($data)); // ❌ NO LOCK
```

## Development Workflow

### Running the Application
```bash
# Start XAMPP Apache, then navigate to:
http://localhost/Quiz/
```

### Testing Without Wallet
Modify [wallet.js](assets/js/wallet.js):
```javascript
async connect() {
    return [{ address: '5F25EmKKwnaRUHGdkTG7RmPLtSG2g3uXSexGaC9d8FdT53zz', name: 'Test' }];
}
```

### Adding a New Level
1. Edit [data/questions.json](data/questions.json) - add new level with structure:
   ```json
   "levelX": {
     "catId": X,
     "levelTitle": "Title",
     "levelInfo": "Description",
     "pdfUrl": "downloads/levelX.pdf",
     "pdfTitle": "PDF Title",
     "hintCount": 3,
     "timeAddCount": 2,
     "minCorrect": 2,
     "questions": [...]
   }
   ```
2. Add PDF to [downloads/](downloads/)
3. Test: Complete previous level, verify new level unlocks (level count is auto-detected)

### Debugging API Issues
- PHP errors: XAMPP Control Panel → Logs
- Network requests: Browser F12 → Network tab
- Common: File permissions (`chmod 755 data/`), JSON syntax errors

## Data Model Gotchas

### Level Key Type Ambiguity
Level keys in `players.json` can be strings or integers. Always normalize:
```javascript
const levelKey = levelNum.toString();
const stats = playerLevels[levelNum] || playerLevels[levelKey];
```

### Name Validation Pipeline
**Complete validation in [config.php](config.php) via `checkPlayerNameAvailability()` + `isPlayerNameAllowed()`**:

1. **Character Set Restriction** - Latin alphabet only + German umlauts:
   ```php
   preg_match('/^[a-zA-Z0-9äöüÄÖÜß\s\-_\.]+$/u', $name)
   ```
   **Reason**: Prevent Arabic/Chinese characters for leaderboard readability

2. **Profanity Filter** ([data/profanity-words.json](data/profanity-words.json)):
   - **Wordlists**: 67 German + 75 English words from LDNOOBW (List of Dirty, Naughty, Obscene, and Otherwise Bad Words)
   - **Whitelist**: `['assassin', 'assemble', 'assessment', 'cockpit', 'scunthorpe', 'penistone', 'sussex', 'essex']` - prevents false positives
   - **Leetspeak Detection**: Converts patterns like `a$$` → `ass`, `h3ll` → `hell`, `@dmin` → `admin`
     - Map: `a→[a4@], e→[e3], i→[i1!], o→[o0], s→[s5$], t→[t7+], l→[l1], g→[g9], b→[b8]`
   - **Check order**: Whitelist first (bypass), direct match, then leetspeak patterns

3. **Length Validation** - 3-20 characters

4. **Uniqueness Check**:
   - Case-insensitive checks via [api/check-name.php](api/check-name.php)
   - Exception: Same wallet can update their own name
   - History tracked in `nameHistory` array

**Usage**:
```php
// In register-player.php and save-score.php
if ($playerName !== null) {
    $validation = checkPlayerNameAvailability($playerName, $walletAddress);
    if (!$validation['available']) {
        errorResponse($validation['reason']);
    }
}
```

**Important**: `checkPlayerNameAvailability()` skips players with `playerName: null` to avoid PHP deprecation warnings with `strcasecmp()`.

## File Structure
- [index.php](index.php) - Main entry point, includes Polkadot spinner overlay
- [config.php](config.php) - Shared utilities (ALWAYS use these functions)
  - `loadJSON()/saveJSON()` - File locking for concurrent writes
  - `isPlayerNameAllowed()` - Profanity filter & character validation (~70 lines)
  - `checkPlayerNameAvailability()` - Complete name validation pipeline
- [SS58AddressConverter.php](SS58AddressConverter.php) - Address format conversion (GMP + Sodium)
- [SS58AddressConverterFallback.php](SS58AddressConverterFallback.php) - Pure PHP fallback
- **[data/](data/)** - `config.json`, `questions.json`, `categories.json`, `players.json`, `profanity-words.json`
  - ⚠️ **NOT in Git repository** (`.gitignore`) - Only available in local development
  - `players.json` is auto-generated on first registration
  - `profanity-words.json` contains LDNOOBW wordlists (German/English) + whitelist
  - When analyzing GitHub repo, these files won't be visible

## Language Preference
- **Code**: English (variable names, function names, class names)
- **Comments in code**: German
- **Documentation & commit messages**: German
- **AI responses in chat**: German
