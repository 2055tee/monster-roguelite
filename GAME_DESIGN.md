# Monster Roguelite — Game Design Reference

Engine-agnostic reference for the game's rules, formulas, and content, extracted from the live web implementation. Written so it can be rebuilt on another engine (e.g. Roblox/Lua) without needing to read the Next.js/Supabase codebase. Every formula and number here is the exact one running in production, not a draft.

For implementation-specific notes (DB schema, file paths, framework quirks), see `CLAUDE.md` instead — this file is scoped to *what the game is*, not *how this particular build works*.

---

## 1. Core Loop

1. Player has an account and a roster of monsters, starting with **3 starter monsters** (one each of Sprigling, Cinderpup, Pebblet, see §6) at level 2, auto-assigned to the 3 team slots.
2. From the hub, the player picks one of 4 actions: **Dungeon**, **Inventory**, **Shop**, or **Reforge**.
3. A **dungeon run** is a fixed sequence of 6 rooms: `combat → combat → rest → combat → rest → boss`.
   - **Combat rooms**: turn-based battles against 1-2 wild monsters (§5).
   - **Rest rooms**: choose either "Heal Team" (free, restores 50% HP) or "Open Chest" (random item, no healing) — a real tradeoff each time.
   - **Boss room**: a single stronger enemy (always 3 levels above the dungeon's `enemyLevel`).
4. On defeating the boss, the player gets one **catch attempt** at that dungeon's boss species (§7).
5. On finishing the run (win or lose), the player earns gold, XP for the whole team, and — on a full clear only — upgrade scrap.
6. **No permadeath.** A fainted monster just needs time to heal (real-time cooldown, skippable with gold) before it can fight again.
7. Between runs, the player can buy gear/scrap from the hourly-restocking **shop** and **reforge** owned equipment to make it stronger.

---

## 2. Monster Stats

Every monster (starter or caught) has 4 base stats: **HP, ATK, DEF, SPD**.

### 2.1 Stat rolls
When a monster is created (starter grant or a successful catch), each of the 4 stats gets an independent **roll multiplier**, uniform random in `[0.90, 1.10]`, rounded to 3 decimal places. This roll is permanent — it never changes again for that monster's lifetime.

### 2.2 Effective stats
```
effectiveStat = floor( speciesBaseStat * rollMultiplier * (1 + 0.10 * (level - 1)) )
```
Then equipment and reforge bonuses are layered on top (equipment only affects the single stat it targets — see §8):
```
finalStat = floor( effectiveStat * (1 + equipmentBonus) )   // only for the stat the equipped item targets
```

### 2.3 Power
A single scalar used for matchmaking/difficulty math and catch-chance performance scoring:
```
power(stats) = stats.hp / 5 + stats.atk * 2 + stats.def * 1.5 + stats.spd
```
Team power (used when starting a run) is the **average** power across the 3 team monsters — deliberately averaged, not summed, so fielding a weak filler monster doesn't disproportionately tank the score.

### 2.4 Rarity label (cosmetic only — does not affect stats)
Derived from the mean of the 4 roll multipliers on a monster:
| Mean of 4 rolls | Label |
|---|---|
| `< 0.95` | Common |
| `0.95 – 1.05` | Uncommon |
| `1.05 – 1.08` | Rare |
| `> 1.08` | Prime |

This is purely a flavor label shown in the UI — it has no gameplay effect. (Do not confuse with **item rarity**, an unrelated system — see §8.)

---

## 3. Abilities

Every monster has 2-3 abilities: **Basic Attack** (always, free, no cooldown) + its species' fixed **signature ability** + **1 ability rolled once** (at creation, permanent) from that species' 3-ability pool.

| Ability | Power | Cooldown | Effect |
|---|---|---|---|
| Strike (basic attack) | 1.0× | 0 | Plain damage, always available |
| Heavy Blow | 1.9× | 3 rounds | Large single-target damage |
| Swift Strike | 1.15× | 2 rounds | Damage + grants **first-strike priority** next round |
| Venom Fang | 0.8× | 3 rounds | Damage + poisons target: 6% of its max HP per round for 3 rounds |
| Bulwark | — | 3 rounds | Self: heal 15% max HP + halve incoming damage for 1 round |
| War Cry | — | 4 rounds | Team-wide: +25% ATK for 3 rounds |
| Mend | — | 3 rounds | Heal one ally for 30% of their max HP |

### 3.1 Damage formula
```
raw       = attacker.atk * abilityPower * (100 / (100 + target.def))
typeMult  = element type multiplier (§4) — 1.25 / 0.80 / 1.00
variance  = 0.95 + rng() * 0.10        // ±5%
damage    = raw * typeMult * variance
```
Modifiers: **War Cry** multiplies the caster's ATK by 1.25 for the duration; **Bulwark** halves incoming damage on the shielded target for 1 round.

### 3.2 Turn order
Per round: sort all combatants by SPD descending. Ties are broken by a seeded-random tiebreak (not player-visible, but deterministic and reproducible from the run's RNG seed — see §12). A monster that used **Swift Strike** gets forced first-strike priority at the start of the *next* round, overriding normal SPD ordering for that entry only.

### 3.3 No permadeath, fainting
A monster reaching 0 HP is "fainted," not removed. Fainted allies:
- Cannot act.
- Cannot be targeted by Mend (heal targeting only allows non-fainted allies).
- Still earn full XP if their team wins/clears rooms.
- Recover only via the real-time healing system (§10), triggered after the run ends.

---

## 4. Elements

Every species has exactly one element (v1, locked). **8 elements total**: a 5-element core cycle, plus **Normal** (neutral to everyone), plus a **Light/Dark** rivalry pair (neutral to everyone except each other).

### 4.1 The core cycle
```
Fire → Nature → Earth → Electric → Water → (back to Fire)
```
Each element deals bonus damage to the element it points to, and takes bonus damage from whichever element points *at* it:

| Element | Beats | Weak to |
|---|---|---|
| Fire | Nature | Water |
| Nature | Earth | Fire |
| Earth | Electric | Nature |
| Electric | Water | Earth |
| Water | Fire | Electric |

### 4.2 Normal, Light, Dark
- **Normal**: no advantage or disadvantage against anything, in either direction — always a neutral matchup, both attacking and defending.
- **Light** and **Dark**: bonus damage against **each other only** (a mutual rivalry — whichever one attacks the other gets the advantage multiplier). Both deal and take **neutral** damage against every other element (the 5-cycle and Normal).

### 4.3 Damage multiplier
One multiplier, applied once per hit, layered into the damage formula (§3.1):

| Matchup | Multiplier |
|---|---|
| Attacker has type advantage | **×1.25** |
| Attacker has type disadvantage | **×0.80** |
| Neutral (includes Normal vs. anything, and any element vs. Normal) | ×1.00 |

This stacks multiplicatively with the existing variance roll and any active War Cry/Bulwark modifiers — it does not replace them.

### 4.4 Species → element mapping (v1)
| Species | Element |
|---|---|
| Sprigling | Nature |
| Cinderpup | Fire |
| Pebblet | Earth |
| Zaplet | Electric |
| Thornmaw | Dark |
| Emberfang | Fire |
| Glacierhorn | Earth |
| Voidmaw | Dark |

**Light** and **Normal** are currently unused by any species in the v1 roster — reserved for future additions. It's intentional that some elements (Fire, Earth, Dark) have 2 species while others have exactly 1 — there's no requirement for even coverage.

---

## 5. Dungeons & Combat Rooms

4 fixed dungeons, difficulty tiers 1-4, same 6-room layout for all (`combat, combat, rest, combat, rest, boss`):

| Dungeon | Tier | Enemy Lv | Enemies/room | Boss species | Boss Lv | Base catch rate | Gold reward |
|---|---|---|---|---|---|---|---|
| Verdant Hollow | 1 | 0 | 1 | Thornmaw | 3 | 60% | 20 |
| Emberfall Cave | 2 | 8 | 2 | Emberfang | 11 | 50% | 45 |
| Frostspire Ruins | 3 | 15 | 2 | Glacierhorn | 18 | 40% | 80 |
| Voidmaw Depths | 4 | 24 | 2 | Voidmaw | 27 | 30% | 140 |

*Boss level is always `enemyLevel + 3`.* Regular combat-room enemies are drawn randomly from the dungeon's enemy species pool. **Verdant Hollow is specifically tuned (1 enemy/room, low enemy level) to be reliably winnable by a fresh 3-starter team** — the other 3 dungeons are intentionally harder, later-game content and are not guaranteed-clearable with a low-level team.

### 5.1 Expected pace / performance scoring
Computed once at run start, used later for catch-chance scoring:
```
expectedTurnsPerRoom = clamp( round( 6 / (teamPower / bossPower) ), 3, 15 )
totalExpectedTurns   = expectedTurnsPerRoom * 4     // 4 combat rooms total (3 regular + 1 boss)
```
At the end of the run:
```
performance = clamp( totalExpectedTurns / actualTotalTurns, 0.5, 1.5 )
```
Performance > 1 means the player cleared faster than expected (rewarded); < 1 means slower (penalized). See §7 for how this feeds catch chance.

### 5.2 Rest rooms
Two choices, no take-backs once chosen:
- **Heal Team**: every team monster heals 50% of max HP (fainted monsters included — they come back at 50% HP).
- **Open Chest**: roll one item from the global weighted item drop table (§8.4) — no healing this room.

---

## 6. Monster Species (v1 roster)

8 species, base stats below are the *unmultiplied* species baseline (see §2.2 for how level/rolls scale these). Element is the new §4 system — see §4.4 for the rationale.

| Species | Element | HP | ATK | DEF | SPD | Rarity tier | Min dungeon tier | Signature ability | Ability pool (roll 1 of 3) |
|---|---|---|---|---|---|---|---|---|---|
| Sprigling 🌱 | Nature | 45 | 11 | 9 | 10 | 1 | 1 | Mend | Heavy Blow, Bulwark, Swift Strike |
| Cinderpup 🔥 | Fire | 42 | 14 | 7 | 12 | 1 | 1 | Heavy Blow | Swift Strike, War Cry, Venom Fang |
| Pebblet 🪨 | Earth | 55 | 10 | 14 | 6 | 1 | 1 | Bulwark | Heavy Blow, Mend, War Cry |
| Zaplet ⚡ | Electric | 38 | 13 | 6 | 16 | 1 | 1 | Swift Strike | Heavy Blow, Venom Fang, War Cry |
| Thornmaw 🪲 | Dark | 70 | 16 | 12 | 11 | 2 | 1 | Venom Fang | Heavy Blow, Bulwark, War Cry |
| Emberfang 🐺 | Fire | 88 | 22 | 14 | 15 | 3 | 2 | War Cry | Heavy Blow, Swift Strike, Venom Fang |
| Glacierhorn 🦬 | Earth | 120 | 28 | 22 | 12 | 4 | 3 | Bulwark | Heavy Blow, Mend, War Cry |
| Voidmaw 🕳️ | Dark | 150 | 38 | 26 | 20 | 5 | 4 | Heavy Blow | Venom Fang, Swift Strike, War Cry |

Starters (Sprigling, Cinderpup, Pebblet) are granted at **level 2**. Caught monsters are granted at the dungeon boss's level (`enemyLevel + 3`).

**Species art**: painterly illustrations + transparent-background icons exist for all 8 (see `public/monsters/` in the repo) — useful as direct visual reference when modeling/re-illustrating for another engine.

---

## 7. Catching

After defeating a dungeon's boss, the player gets exactly one catch attempt at that boss (before finalizing the run):

```
faintPenalty = 0.10 * numberOfFaintedTeamMembers
consumableBonus = sum of any catch-boosting lures used (see §8.3, stacks additively)

catchChance = clamp(
  dungeon.baseCatchRate * performance - faintPenalty + consumableBonus,
  0.10,   // floor
  0.90    // ceiling
)
```
A single random roll `[0,1)` against this chance determines success. On success, the caught monster is generated exactly like a starter (fresh independent stat rolls per §2.1, 2 abilities per §3) at the boss's level, and joins the roster (bench, not auto-teamed).

---

## 8. Items & Equipment

### 8.1 Categories
- **Equipment**: passive, persistent (not consumed on use), max 1 equipped per monster. **Owned per-copy** — each individual copy you own tracks its own upgrade level (see §9 Reforge) independently of other copies of the same item.
- **Consumables**: quantity-stacked, used once. 3 catch-chance lures + 1 instant-heal.

### 8.2 The 16-item equipment catalog
4 stat lines × 4 rarities. Each rarity tier of a line is a **separate named item** (not the same item at different levels — reforge, §9, is the *additional* per-copy upgrade on top of this):

| Stat line | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| ATK | Minor Charm — +10% | Charm of Force — +18% | Charm of Conquest — +28% | Charm of Ascendance — +40% |
| DEF | Guard Plate — +15% | Bastion Plate — +24% | Aegis Plate — +36% | Sovereign Plate — +50% |
| SPD | Swift Band — +15% | Gale Band — +24% | Tempest Band — +36% | Zephyr Band — +50% |
| HP | Vital Locket — +12% | Locket of Vigor — +20% | Locket of Vitality — +30% | Locket of Eternity — +42% |

Equipping an item modifies **only the one stat it targets** — e.g. Minor Charm only affects ATK, nothing else.

### 8.3 Consumables
| Item | Rarity | Effect |
|---|---|---|
| Lure Bait | Common | +15 percentage points to catch chance |
| Prime Lure | Rare | +30pp catch chance |
| Grand Lure | Epic | +45pp catch chance |
| Field Elixir | Rare | Instantly finishes a monster's healing cooldown — **hub-only**, no mid-run use |

Multiple catch lures can be applied to the same catch attempt; their bonuses add together.

### 8.4 Chest / drop table
Rest-room chests and any other "random item" roll draw from one global weighted table (weight = relative chance, not a percentage):

| Item | Weight | Item | Weight |
|---|---|---|---|
| Minor Charm | 22 | Charm of Force | 9 |
| Charm of Conquest | 4 | Charm of Ascendance | 1 |
| Guard Plate | 18 | Bastion Plate | 8 |
| Aegis Plate | 3 | Sovereign Plate | 1 |
| Swift Band | 15 | Gale Band | 7 |
| Tempest Band | 3 | Zephyr Band | 1 |
| Vital Locket | 15 | Locket of Vigor | 7 |
| Locket of Vitality | 3 | Locket of Eternity | 1 |
| Lure Bait | 18 | Prime Lure | 9 |
| Field Elixir | 3 | Grand Lure | 2 |

(Total weight 150 — an item's drop probability is `itsWeight / 150`.)

---

## 9. Reforge (equipment upgrading)

Any owned equipment copy can be upgraded, `+1` at a time, up to a cap determined by **that item's own rarity**:

| Rarity | Max reforge level |
|---|---|
| Common | +6 |
| Rare | +9 |
| Epic | +12 |
| Legendary | +15 |

**Bonus formula** — each level multiplies the item's base effect value:
```
effectiveBonus = baseEffectValue * (1 + 0.05 * reforgeLevel)
```
Example: a Minor Charm (base +10% ATK) at +6 → `0.10 * 1.30 = 0.13` → **+13% ATK**. A Locket of Eternity (base +42% HP) at max +15 → `0.42 * 1.75 = 0.735` → **+73.5% max HP**.

**Cost & odds** — each attempt costs **1 upgrade scrap of the item's own rarity** (no substituting a different tier), and the chance to succeed reaching level `+N` is:
```
successChance = clamp( (100 - 5*N) / 100, 0.05, 1.0 )
```
So `+1` = 95%, `+10` = 50%, `+15` = 25% (floor 5% at the extreme).

**On failure**: the scrap is still consumed, but the item's level **does not change** — no downgrade, no destruction. This is a deliberate design choice matching the game's no-punishing-losses philosophy (same spirit as no permadeath).

Reforging an equipped item applies its new bonus immediately, in combat — no need to unequip/re-equip.

---

## 10. Currency, Scrap & Healing

### 10.1 Gold
Earned from clearing dungeons (table in §5). Spent in the shop (§11). No other sinks currently.

### 10.2 Upgrade scrap
4 tiers matching item rarity (common/rare/epic/legendary), tracked as simple counters per player (not stackable items in an inventory grid — just 4 numbers).

**Sources:**
- **Dungeon clears** (full clear only — a loss or abandon awards zero): `1 + floor(rng() * 3)` total units (uniform 1, 2, or 3), with each unit's rarity tier rolled independently from a table that skews toward rarer tiers at higher dungeon difficulty:

| Dungeon tier | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| 1 | 85% | 13% | 2% | 0% |
| 2 | 65% | 27% | 7% | 1% |
| 3 | 45% | 35% | 17% | 3% |
| 4 | 25% | 38% | 29% | 8% |

- **The hourly shop** (§11) — buyable as a bundle.

### 10.3 Healing
- Real-time cooldown: `min(monsterLevel, 12) * 5` seconds (caps at 60s so high levels don't punish you with slow healing).
- Skippable early by spending gold: `cost = max(5, ceil(remainingSeconds / 10))`.
- A "Field Elixir" consumable instantly finishes one monster's healing (hub only).
- Fainted monsters use the exact same timer/mechanic as "below max HP" monsters — no separate, longer penalty for fainting vs. just being hurt.

---

## 11. Shop

A single **global** stock, shared by every player, that deterministically re-rolls every real-world clock hour (`XX:00`) — not per-player, not on-demand.

- **5-6 item listings** (mixed equipment/consumables, at least 2 of each guaranteed) **plus exactly 1 scrap listing**, every hour.
- Each rarity tier appears with weighted odds: Common 55%, Rare 28%, Epic 13%, Legendary 4% (applies per-listing, independently).
- The scrap listing's tier is uniform 1-in-4 across all 4 rarities (no gating — legendary scrap can appear even in the first hour a player plays), sold as a bundle of 3, at a price scaling with rarity.
- **Prices** (gold):

| Category | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| Equipment | 60 | 150 | 360 | 800 |
| Consumable | 25 | 60 | 140 | 300 |
| Scrap (per unit, ×3 for the bundle) | 20 | 50 | 120 | 260 |

- Each listing is buyable **once per hour, per player** — buying doesn't affect what other players see (stock is global/shared, purchase-state is per-player).
- Unsold stock simply vanishes at the top of the hour; nothing carries over or gets reserved.

---

## 12. Determinism / Fairness

Every random roll that affects a real outcome (enemy picks in a room, chest drops, catch attempts, stat rolls on catch, reforge attempts, scrap drops) is drawn from a **seeded RNG stream tied to that specific run or profile**, and the "cursor" position in that stream is persisted after every roll. This means:
- A run's entire outcome is reproducible/auditable from its seed.
- No roll can be silently re-rolled or client-manipulated — the server is the sole authority on both the seed and the roll.
- The only *exception* is the shop, which is intentionally reproducible from nothing but the public hour-number (no persisted state needed at all, by design — see §11).

For a Roblox port, the exact same principle applies: **never trust the client with anything that changes state** (damage rolls, catch rolls, drop rolls, currency changes) — always resolve on the server and only send the client the result.

---

## 13. UI Flow Summary (for reference when designing screens)

```
Login/Signup
  └─ Hub  (shows: gold, scrap counts, team-of-3 panel)
       ├─ Dungeon → pick 1 of 4 → Run screen
       │     Run: [Room N of 6] → Enter Room →
       │        combat room  → turn-based battle → win/lose
       │        rest room    → Heal or Chest choice
       │        boss room    → battle → Catch Attempt screen → Run Complete summary
       │        (loss at any point) → Defeat screen (partial XP only, no gold/scrap)
       ├─ Inventory → Equipment (per-copy list w/ reforge level) + Consumables (qty list)
       ├─ Shop → Equipment zone / Consumables zone / Scrap listing, hourly countdown
       └─ Reforge → scrap balance + per-instance upgrade cards (chance, cost, current/next bonus)
```

Team management (assign to slot 0/1/2, equip/unequip, view full stat breakdown) happens from a **Roster** screen reachable from the Hub's team panel.

---

## 14. Explicitly Out of Scope (v1)

These were considered but deliberately not built — worth knowing so a port doesn't accidentally "fix" something that was left out on purpose:
- No PvP / multiplayer combat (single-player only).
- No selling/salvaging items or monsters for currency.
- No higher-tier scrap substituting for a lower tier in reforge (exact rarity match required).
- No inventory/instance caps (you can own unlimited copies of anything).
- No per-room difficulty scaling within a single dungeon — only the whole-dungeon expected pace matters for catch-chance scoring (§5.1).
