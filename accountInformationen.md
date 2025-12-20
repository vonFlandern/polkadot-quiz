# Account-Informationen für Account Overview

Basierend auf der Recherche von polkadot-js/api und polkadot-js/apps.

## 1. Account-Rollen im Netzwerk

### 1.1 Staking-Rollen

#### Validator
- **Beschreibung**: Account, der Blöcke validiert und Transaktionen verarbeitet
- **API-Abfrage**: `api.query.staking.validators(accountId)`
- **Daten-Typ**: `ValidatorPrefs` mit `commission` und `blocked` Status
- **Anzeige**: Badge "Validator" + Commission-Rate (z.B. "5.00%")

#### Nominator
- **Beschreibung**: Account, der Validatoren nominiert und anteilige Rewards erhält
- **API-Abfrage**: `api.query.staking.nominators(accountId)`
- **Daten-Typ**: `Nominations` mit `targets` (Array von nominierten Validator-Accounts)
- **Anzeige**: Badge "Nominator" + Anzahl nominierter Validatoren (z.B. "16 Validators")

#### Stash Account
- **Beschreibung**: Haupt-Account mit gebundenen Staking-Tokens
- **API-Abfrage**: `api.query.staking.bonded(stashId)` → liefert Controller
- **Hinweis**: Controller-Konzept ist veraltet (deprecated seit Runtime-Update)

### 1.2 Nomination Pool Rollen

#### Pool Member
- **Beschreibung**: Mitglied in einem Nomination Pool
- **API-Abfrage**: `api.query.nominationPools.poolMembers(accountId)`
- **Daten**: Pool ID, Points, Unbonding Eras

#### Pool Roles
- **Root**: Admin-Rechte für Pool-Management
- **Nominator**: Kann Validatoren für den Pool nominieren
- **Bouncer**: Kann Mitglieder verwalten

## 2. Staking-Informationen

### 2.1 Balance-Status

#### Total Bonded
- **Quelle**: `stakingLedger.total`
- **Beschreibung**: Gesamtbetrag an gebundenen Token
- **Format**: Balance mit Decimals (z.B. "1,234.5678 DOT")

#### Active Stake
- **Quelle**: `stakingLedger.active`
- **Beschreibung**: Aktiv im Staking verwendeter Betrag
- **Unterschied zu Total**: Total = Active + Unlocking

#### Unlocking (siehe Chunks-Erklärung unten)
- **Quelle**: `stakingLedger.unlocking[]`
- **Beschreibung**: Array von Chunks, die entbonded werden
- **Anzeige**: Summe + Era-Countdown pro Chunk

#### Redeemable
- **Berechnung**: Chunks, deren Era bereits vergangen ist
- **Aktion**: Mit `api.tx.staking.withdrawUnbonded()` abhebbar

### 2.2 Exposure & Rewards

#### Validator Exposure
- **Quelle**: `api.query.staking.erasStakers(era, validatorId)`
- **Daten**: `total`, `own`, `others[]` (Nominatoren)
- **Verwendung**: Zeigt Backing durch Nominatoren

#### Claimed Rewards
- **Quelle**: `stakingLedger.claimedRewards`
- **Beschreibung**: Array von Eras, für die Rewards bereits ausgezahlt wurden
- **Anzeige**: Anzahl + Liste der Eras

## 3. Governance & Democracy

### 3.1 Democracy (Legacy)

#### Active Votes
- **Quelle**: `api.query.democracy.votingOf(accountId)`
- **Daten**: Referendum IDs, Vote Direction (Aye/Nay), Locked Balance, Conviction
- **Anzeige**: Anzahl aktiver Votes + gesperrtes Guthaben

#### Democracy Locks
- **Beschreibung**: Token, die durch Conviction Voting gesperrt sind
- **Lock-Period**: `conviction * enactmentPeriod` (z.B. 6x conviction = 6 * 28 Tage)
- **Unlock**: Automatisch nach Ablauf + `api.tx.democracy.unlock()`

### 3.2 OpenGov (Conviction Voting)

#### Conviction Locks
- **Quelle**: `api.query.convictionVoting.votingFor(accountId, classId)`
- **Track-based**: Separate Locks pro Governance-Track
- **Daten**: Voting-Balance, End Block, Class ID, Referendum IDs

#### Delegations
- **Quelle**: `api.query.convictionVoting.votingFor()` → Type `Delegating`
- **Anzeige**: Delegierter Account + Track + Balance

## 4. Proxy-System

### 4.1 Proxy-Typen
- **Any**: Alle Operationen erlaubt
- **NonTransfer**: Alles außer Balance-Transfers
- **Governance**: Nur Governance-Operationen
- **Staking**: Nur Staking-Operationen
- **IdentityJudgement**: Nur Identity-Judgements
- **CancelProxy**: Nur Proxy-Entfernungen

### 4.2 Proxy-Informationen
- **Quelle**: `api.query.proxy.proxies(accountId)`
- **Daten**: Array von `{ delegate: AccountId, proxyType, delay }`
- **Anzeige**: Liste der Proxy-Accounts mit Typ und Delay

## 5. Identity-System

### 5.1 On-Chain Identity
- **Quelle**: `api.query.identity.identityOf(accountId)` (Relay Chain)
- **Quelle**: `apiSystemPeople.query.identity.identityOf(accountId)` (People Chain)

#### Felder:
- `display`: Display Name
- `legal`: Legal Name
- `web`: Website URL
- `email`: Email-Adresse
- `twitter`: Twitter Handle
- `github`: GitHub Username
- `discord`: Discord Username
- `matrix`: Matrix ID
- `pgpFingerprint`: PGP-Fingerprint

### 5.2 Sub-Identities
- **Quelle**: `api.query.identity.subsOf(parentAccount)`
- **Anzeige**: Liste von Sub-Accounts mit ihren Sub-Namen

### 5.3 Judgements
- **Quelle**: Teil von `identityOf` → `judgements` Array
- **Typen**: Unknown, FeePaid, Reasonable, KnownGood, OutOfDate, LowQuality, Erroneous
- **Anzeige**: Status-Badge (z.B. "Verified" für KnownGood)

## 6. Multisig-Informationen

### 6.1 Multisig-Approvals
- **Quelle**: `api.query.multisig.multisigs(accountId, callHash)`
- **Daten**: Pending Approvals, Threshold, Timepoint

### 6.2 Multisig-Configuration
- **Anzeige**: 
  - Threshold (z.B. "2 of 3")
  - Liste der Signatories
  - Pending Call Hashes

## 7. Vesting-Informationen

### 7.1 Vesting Schedule
- **Quelle**: `api.query.vesting.vesting(accountId)` (Asset Hub)
- **Daten**: 
  - `locked`: Gesperrter Betrag
  - `perBlock`: Freigabe pro Block
  - `startingBlock`: Start-Block

### 7.2 Vesting-Status
- **Berechnung**: Basierend auf Current Block vs Starting Block
- **Anzeige**: 
  - Noch gesperrt
  - Pro Block freigegeben
  - Nächster Vest-Zeitpunkt

## 8. ERKLÄRUNG: Unlocking Chunks

### 8.1 Was sind Chunks?

**Chunks** (Unlocking Chunks) sind einzelne Portions von Token, die sich im Unbonding-Prozess befinden.

#### Datenstruktur:
```typescript
interface UnlockChunk {
  value: Balance;  // Betrag in Planck (kleinste Einheit)
  era: EraIndex;   // Era-Nummer, wann die Token freigegeben werden
}
```

### 8.2 Wie entstehen Chunks?

Chunks entstehen, wenn ein Staker Token entbondet:

1. **Unbond-Transaktion**: `api.tx.staking.unbond(amount)`
2. **Chunk-Erstellung**: System erstellt neuen Chunk mit:
   - `value`: Unbonded Amount
   - `era`: Current Era + Bonding Duration (28 Eras)
3. **Hinzufügen**: Chunk wird zu `stakingLedger.unlocking[]` hinzugefügt

### 8.3 Bonding Duration

- **Polkadot**: 28 Eras (≈ 28 Tage)
- **Kusama**: 28 Eras (≈ 7 Tage, da schnellere Eras)
- **Konstante**: `api.consts.staking.bondingDuration`

### 8.4 Maximum Chunks

- **Limit**: `MaxUnlockingChunks` (typisch 32)
- **Konstante**: `api.consts.staking.maxUnlockingChunks`
- **Fehler**: "NoMoreChunks" wenn Limit erreicht
- **Lösung**: `withdrawUnbonded()` aufrufen, um alte Chunks zu entfernen

### 8.5 Chunk-Lifecycle

```
1. Bonded Tokens
   ↓ unbond(100 DOT)
2. Unlocking Chunk erstellt
   { value: 100 DOT, era: 1234 }
   ↓ Wait 28 Eras
3. Era 1234 erreicht
   Chunk ist nun "redeemable"
   ↓ withdrawUnbonded(1)
4. Chunk entfernt
   Token auf "free balance" übertragen
```

### 8.6 Chunk-Visualisierung im UI

**Empfohlene Darstellung**:

```
📊 Unlocking Schedule:
┌─────────────────────────────────────┐
│ 100.00 DOT  →  12 Eras (12 days)    │
│  50.00 DOT  →  18 Eras (18 days)    │
│  25.00 DOT  →  25 Eras (25 days)    │
├─────────────────────────────────────┤
│ Total Unlocking: 175.00 DOT         │
│ Redeemable Now: 0.00 DOT            │
└─────────────────────────────────────┘
```

**Code-Beispiel** (aus api-derive):
```javascript
function calculateUnlocking(stakingLedger, currentEra) {
  return stakingLedger.unlocking
    .filter(chunk => chunk.era > currentEra)
    .map(chunk => ({
      value: chunk.value,
      remainingEras: chunk.era - currentEra,
      unlockTime: remainingEras * 24 * 60 * 60 * 1000 // ms
    }));
}
```

### 8.7 Redeemable Chunks

**Berechnung**:
```javascript
function redeemableSum(stakingLedger, currentEra) {
  return stakingLedger.unlocking
    .filter(chunk => chunk.era <= currentEra)
    .reduce((sum, chunk) => sum + chunk.value, 0);
}
```

### 8.8 Chunk-Operationen

#### Rebond
- **Funktion**: `api.tx.staking.rebond(amount)`
- **Effekt**: Nimmt Token aus Unlocking-Chunks zurück in Active Stake
- **Verwendung**: Wenn man Unbond rückgängig machen will

#### Withdraw Unbonded
- **Funktion**: `api.tx.staking.withdrawUnbonded(numSlashingSpans)`
- **Effekt**: Entfernt redeemable Chunks und überträgt auf free balance
- **Parameter**: Anzahl der Slashing Spans (typisch 0)

## 9. Weitere nützliche Informationen

### 9.1 Session & Era Info
- **Current Era**: `api.query.staking.currentEra()`
- **Active Era**: `api.query.staking.activeEra()`
- **Era Duration**: `api.consts.staking.sessionsPerEra * sessionLength`

### 9.2 Slashing Info
- **Slashing Spans**: `api.query.staking.slashingSpans(accountId)`
- **Unapplied Slashes**: `api.query.staking.unappliedSlashes(era)`

### 9.3 Account Flags
- **Is Stash**: Hat `bonded` Entry
- **Is Nominator**: Hat `nominators` Entry
- **Is Validator**: Hat `validators` Entry mit non-empty prefs
- **Is Chilled**: Nicht aktiv im Staking (kein Active/Exposure)

### 9.4 Nomination Pool Status
- **Pool State**: Open, Blocked, Destroying
- **Pool Metadata**: Name, Icon
- **Pool Commission**: Commission-Rate für Pool-Operator

## 10. Implementierungs-Empfehlungen

### 10.1 Priorität für Account Overview

**High Priority** (sollte definitiv angezeigt werden):
1. ✅ Account Role Badge (Validator/Nominator/Pool Member)
2. ✅ Total Bonded + Active Stake
3. ✅ Unlocking Chunks mit Countdown
4. ✅ Redeemable Amount (falls > 0)
5. ✅ Identity Display Name + Judgement Status

**Medium Priority** (nützlich):
6. ⚡ Democracy/OpenGov Locks
7. ⚡ Proxy-Status (Anzahl)
8. ⚡ Validator Commission (falls Validator)
9. ⚡ Nominated Validators (falls Nominator)

**Low Priority** (optional):
10. 📋 Vesting Schedule
11. 📋 Multisig Configuration
12. 📋 Sub-Identities
13. 📋 Claimed Rewards History

### 10.2 API-Calls für komplettes Profil

```javascript
// Alle Daten mit einem Derive-Call:
const stakingInfo = await api.derive.staking.account(address);
// Enthält: controller, nominators, rewardDestination, 
//          stakingLedger, validatorPrefs, etc.

// Zusätzlich:
const identity = await api.derive.accounts.identity(address);
const proxies = await api.query.proxy.proxies(address);
const democracyLocks = await api.derive.democracy.locks(address);
```

### 10.3 Performance-Optimierung

- **Batching**: Mehrere Queries parallel mit `Promise.all()`
- **Caching**: Account-Daten cachen (TTL: 60 Sekunden)
- **Lazy Loading**: Weniger wichtige Daten erst bei Bedarf laden
- **Subscription**: Real-time Updates via WebSocket für Staking-Daten

## 11. Beispiel-Output für Account Overview

```
╔═══════════════════════════════════════════════════╗
║  ACCOUNT OVERVIEW                                 ║
╠═══════════════════════════════════════════════════╣
║  Address: 15oF4...KQdw                           ║
║  Identity: Alice ✓ (KnownGood)                   ║
║                                                   ║
║  🎯 Role: Nominator                              ║
║     ├─ Nominating: 16 Validators                 ║
║     └─ Next Era: Active                          ║
║                                                   ║
║  💰 Staking Balance:                             ║
║     ├─ Total Bonded: 1,234.56 DOT                ║
║     ├─ Active Stake: 1,100.00 DOT                ║
║     ├─ Unlocking: 134.56 DOT (3 chunks)          ║
║     └─ Redeemable: 0.00 DOT                      ║
║                                                   ║
║  📅 Unlocking Schedule:                          ║
║     ├─ 100.00 DOT → 12 days (Era 1234)          ║
║     ├─  20.00 DOT → 18 days (Era 1240)          ║
║     └─  14.56 DOT → 25 days (Era 1247)          ║
║                                                   ║
║  🗳️  Governance:                                 ║
║     ├─ Active Votes: 3 referenda                 ║
║     ├─ Locked: 50.00 DOT (Conviction 6x)         ║
║     └─ Unlock in: 168 days                       ║
║                                                   ║
║  🔗 Proxies: 2 configured                        ║
║     ├─ 0x1234... (Staking)                       ║
║     └─ 0x5678... (Governance)                    ║
╚═══════════════════════════════════════════════════╝
```

## 12. Quellen & Links

- **Polkadot.js API**: https://github.com/polkadot-js/api
- **Polkadot.js Apps**: https://github.com/polkadot-js/apps
- **Staking Guide**: https://wiki.polkadot.network/docs/learn-staking
- **Chunks Dokumentation**: API-Derive `staking/account.ts`
- **Type Definitions**: `@polkadot/types/interfaces/staking`
