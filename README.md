# Water Marks

A turn-based tactical grid war in the browser, inspired by Fire Emblem: The Sacred Stones. Up to three sides fight over forts, thrones and caves, recruit and level units, promote them, and try to win by holding most of the map or by taking the enemy throne.

It is plain HTML, CSS and JavaScript (ES modules) with no build step.

> This is an unofficial fan project. It is not affiliated with Nintendo or Intelligent Systems. See [LICENSE](LICENSE) for what is and is not covered.

**Contents**
[Running it](#running-it) · [Controls](#controls) · [The turn](#the-turn) · [Winning](#winning) · [Units and stats](#units-and-stats) · [Combat](#combat) · [Weapons](#weapons) · [Experience and leveling](#experience-and-leveling) · [Promotion](#promotion) · [Classes](#classes) · [Terrain](#terrain) · [Forts, thrones and caves](#forts-thrones-and-caves) · [Gold and the shop](#gold-and-the-shop) · [Items](#items) · [Staves](#staves) · [Status effects](#status-effects) · [Class abilities](#class-abilities) · [Ballistae](#ballistae) · [Monsters](#monsters) · [The CPU](#the-cpu) · [Menus and interface](#menus-and-interface) · [Saving](#saving-and-loading) · [Making maps](#making-maps) · [Tuning](#tuning) · [Project layout](#project-layout) · [Credits](#credits)

---

## Running it

Browsers refuse ES modules from `file://` pages, so serve the folder:

```
python serve.py        (py serve.py on Windows)
```

This opens `http://localhost:8000/` in your browser. It serves `.js` with the right type and turns caching off.

**Hosting:** the game is fully static, so GitHub Pages works. Paths are case sensitive there, so keep folder and file names exactly as the code writes them (`assets/`, `js/`, `maps/`).

The game also has two small developer tools: `tilepicker.html` (read tile coordinates from the tile sheet) and `pixeleditor.html` (edit sprite sheets, merge PNGs).

---

## Controls

The game works with the on-screen controller, the keyboard, or by tapping the map.

| Action | On-screen | Keyboard |
|---|---|---|
| Move cursor | UP / DOWN / LEFT / RIGHT | Arrow keys or WASD |
| Select / confirm | SELECT | Space or Enter |
| Back / cancel | BACK | Esc, Z or Backspace |
| Jump to next / previous unit that can act | RT / LT | E / Q |

- **Tapping the map** moves the cursor to that tile. Tapping the tile the cursor is already on selects it. While choosing an attack or staff target, tapping a valid target selects it straight away.
- **Menus** use the same inputs: directions move the highlight, SELECT confirms, BACK goes up a level.
- **Units list** screens use LT / RT to change page.

---

## The turn

There are three sides: **Blue** (team 1), **Red** (team 2) and **Green** (team 3). They play in that order, and the turn counter goes up each time Blue's side starts again.

**When a side's phase starts**
1. If it is a CPU side, its forts and caves choose what to queue.
2. Reinforcements spawn from its forts, caves and thrones.
3. Its poisoned units take damage.
4. Its Pure Water resistance bonuses drop by 1.

**During the phase** each of its units may act once. A unit's action is: optionally move, then optionally do one thing (attack, use a staff, capture, shop, and so on), then it is done and turns grey.

**When the phase ends** (the player picks END TURN from the context menu, or the CPU finishes):
1. Thrones with no Lord on them count a turn of absence.
2. Its sleeping units count down one turn.
3. Every unit becomes ready again for next time.

A side's controller is chosen when the game is started (see [The CPU](#the-cpu)). Two humans means hot-seat play.

---

## Winning

A side wins by either:

- **Holding forts:** a team holds at least **75%** of *all* forts on the map (neutral forts count in the total). Checked every time a fort or throne changes hands.
- **Taking a throne:** a Lord captures the other team's throne.

Only **Blue and Red** can win (`CONTENDING_TEAMS` in `victory.js`). Green can lose every fort and the game goes on, and its thrones do not decide the game. After a win the board freezes and you can view the map or return to the main menu.

---

## Units and stats

Every unit has these stats:

| Stat | Meaning |
|---|---|
| **HP** | Hit points. A unit at 0 is removed. |
| **Str / Mag** | Attack power. Physical classes use Str, casters use Mag. |
| **Skl** | Skill: adds to hit and critical chance. |
| **Spd** | Speed: attack speed and avoid. |
| **Lck** | Luck: adds to avoid, lowers enemy crits, and raises lucky-weapon odds. |
| **Def** | Defense against physical attacks. |
| **Res** | Resistance against magic. |
| **Con** | Constitution: how much weapon weight a unit can carry without slowing down. |
| **Mov** | Movement points per move. |

Each unit also has a level, EXP (out of 100), up to **5 inventory slots**, weapon ranks for the types its class can use, and growth rates and stat caps that come from its class.

---

## Combat

You attack by choosing a target and a weapon in range. A combat preview shows damage, hit chance, crit chance and the number of strikes for both sides before you confirm.

### The numbers

**Damage** = weapon might + attacker's Str or Mag + triangle bonus − defender's Def or Res − terrain defense. It cannot go below 0.

- **Physical weapons** (swords, lances, axes, bows, monster claws) use Str against Def.
- **Magic tomes** (Anima, Light, Dark) use Mag against Res. A Pure Water bonus adds to Res.
- **Magic swords:** the Runesword is always magic. The Light Brand and Wind Sword are magic only when used at range 2.
- **Effective weapons** multiply the weapon's might by **3** against their targets (horseback, armored, flying, dragon, monster).
- **Fliers** get no terrain bonuses.

**Hit chance** = weapon hit + 2 × Skl + Lck ÷ 2 + triangle bonus + S-rank bonus − avoid, kept between 0 and 100.
**Avoid** = 2 × the defender's attack speed + Lck + terrain avoid.

**Critical chance** = weapon crit + Skl ÷ 2 + class bonus + S-rank bonus − defender's Lck. A critical hit deals **triple** damage.

**Attack speed** = Spd, minus however much the weapon's weight exceeds Con.

### Weapon triangle

| Attacker | Beats | Loses to |
|---|---|---|
| Sword | Axe | Lance |
| Axe | Lance | Sword |
| Lance | Sword | Axe |
| Anima | Light | Dark |
| Light | Dark | Anima |
| Dark | Anima | Light |

Winning the triangle gives +1 damage and +15 hit; losing gives −1 and −15. Bows, staves and monster weapons are outside the triangle.

### Who strikes, and how often

1. The attacker strikes.
2. If the defender survives and has a weapon that reaches the attacker, it **counters**.
3. A unit with **4 or more** attack speed over its opponent strikes a second time (a "follow-up").
4. **Brave** weapons make each strike two hits in a row.

A defender cannot counter if it is asleep or stoned, has no usable weapon in range, or if either weapon says it cannot be countered (long-range tomes, ballistae). A ballista crew cannot counter either.

### Other combat rules

- **Weapons lose a use only on a hit.** A broken weapon disappears and the next usable one is equipped.
- **Plunder:** a unit that defeats an enemy takes any "plunder" items it carries (such as braces).
- **Walls and snags** can be attacked like units (see [Terrain](#terrain)).
- **Class skills** (Sure Strike, Silencer, Pierce, Great Shield, Slayer) can trigger in combat; see [Class abilities](#class-abilities).

---

## Weapons

Weapon types: **Sword, Lance, Axe, Bow, Anima, Light, Dark** (Staves are separate).

Each weapon has: a **rank** (E to S), **range**, **weight**, **might**, **hit**, **crit**, **uses**, **WExp** (weapon experience per use) and sometimes an effect.

- **Range:** most weapons hit adjacent tiles. Bows hit exactly range 2 (never adjacent). Ranged weapons list a minimum and maximum; long-range tomes reach 3 to 10.
- **Usable weapons:** a unit can use a weapon if its rank in that type is equal to or higher than the weapon's rank. Weapons with no rank (monster weapons) can be used by anyone.
- **Equipping:** the equipped weapon always sits in the first slot. You can equip only before the unit acts.
- **Special weapons:**
  - *Brave* (two hits per strike), *Killer* (high crit), *Poison* (poisons on a hit).
  - *Reavers and slayers* (the triangle flips in your favor and against a rival type).
  - *Nosferatu* (heals for the damage dealt), *Luna* (ignores Res), *Eclipse* (halves the target's current HP; cannot be countered).
  - *Rapier, Armorslayer, Wyrmslayer, Horseslayer and the like* (effective against horseback, armored or dragon units).
  - Legendary weapons carry stat bonuses in their description and have no price.

### Weapon ranks and S rank

Weapon EXP is earned per use. The rank thresholds are:

| Rank | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| WExp | 1 | 31 | 71 | 121 | 181 | 251 |

A critical or finishing blow earns double. There is a rank cap by tier: **trainees reach C, other unpromoted classes A, promoted classes S**. A unit with **S rank** in a weapon's type gets +5 hit and +5 crit with it. Monster weapons and the long-range sword attacks give no weapon EXP. A weapon type a class cannot use is locked, but its EXP stays recorded for later promotions.

### Lucky weapons

When a unit is created with no preset items, it can get a bonus "lucky" weapon. The chance is **Lck × 2.5%**. If it succeeds, the game walks down a list from the highest rank the unit can use, each rank given a chance (S 5%, A 10%, B 20%, C 30%, D 40%, E 50%). Unobtainable and special items are excluded. Settings are in `luckyWeapon.js`.

---

## Experience and leveling

### The leveling factor

`LVL_FACTOR` in `exp.js` (set to **2**) scales how levels work:

- Each stat **rolls its growth `LVL_FACTOR` times** per level-up.
- Levels are `1/LVL_FACTOR` as many: **max level 10** (trainees **5**), and **promotion at level 5**.
- EXP, steal EXP and class skill chances still use the original 1 to 20 scale, so balance is unchanged.

Set `LVL_FACTOR = 1` to get the classic 1 to 20 system. Use a whole number.

### Earning EXP

EXP is shown out of 100. Every 100 EXP is a level. After every fight a unit gets:

- **For dealing damage:** about `(31 + enemy level − your level) ÷ your class power`, minimum 1. A miss gives 1; a hit that does no damage gives half.
- **For a kill:** a large bonus on top, based on the enemy's level and tier. Bosses, thieves, rogues and assassins give extra. A **Silencer** kill multiplies the bonus.
- **Promoted enemies** count as higher level.
- **Class power:** trainees 1; clerics, soldiers, troubadours, thieves, priests and dancers 2; everyone else 3. The Demon King is 5.
- **All EXP is multiplied** (`EXP_MULTIPLIER`).
- A unit that is defeated gets nothing. A defender that cannot counter gets 1 EXP.

A level-up rolls each stat's growth rate. A growth of 130% means a guaranteed +1 plus a 30% chance of a second. Gains stop at the class's stat cap. At the level cap a unit stops gaining EXP.

**Staves** give their own EXP per use, and **stealing** gives EXP too.

### Gold from kills

Defeating a unit gives its side gold equal to **10 × the EXP the killer gained**.

---

## Promotion

A unit can promote when it reaches the promotion level (**5** with `LVL_FACTOR = 2`).

| Tier | How it promotes |
|---|---|
| **Trainee** (level cap 5) | Promotes freely once at the cap. |
| **Middle tier** | Needs a promotion item in its inventory, which is used up. A class-specific item is used first, otherwise a **Master Seal**. |
| **Promoted** | Cannot promote. |

**Promotion items** (class crests): Hero Crest (Mercenary, Myrmidon, Fighter), Knight Crest (Cavalier, Knight), Orion's Bolt (Archer), Elysian Whip (Pegasus Knight, Wyvern Rider), Guiding Ring (Mage, Monk, Priest, Cleric, Shaman, Troubadour), Ocean Seal (Thief, Pirate). Master Seal works for any middle-tier class.

**What promotion does:**
- The unit gets the class's promotion stat gains (limited by the new class's caps), changes class, and returns to **level 1 with 0 EXP**. The old level is shown in brackets: `(5) 1`.
- It keeps its weapon EXP log. Weapon types the new class cannot use are locked, and ranks rise to the new class's base ranks.
- Monsters drop weapons their new class cannot use, and trade their old claw for the new class's own.
- The promoted class becomes **buyable in the shop** for that team.
- The fort the unit came from remembers the promotion (see below), and every other unit of the same class from that fort gets the stat gains too.
- Promoting makes units heavier. If it pushes the home fort over its population cap, the weakest same-class units are removed from the map.

### Promotion records and spawns

Every fort, cave and throne records, per class, the best level reached and which class and level it was promoted from. New units spawn from these records. A new Swordmaster, for example, is built as a trainee at the promotion level, promoted to Myrmidon, raised to at least the promotion level again, promoted to Swordmaster, and finally raised to the level recorded for Swordmasters. So spawned units carry the stat gains of the whole chain.

Units bought at the shop start from scratch: a middle-tier unit comes from a promotion-level trainee, and a promoted unit comes from a promotion-level middle-tier unit.

---

## Classes

Promotion paths (a class can become any of the classes after the arrow):

**Human**

| Class | Promotes to |
|---|---|
| Lord | Great Lord |
| Trainee | Mercenary, Myrmidon |
| Recruit | Cavalier, Knight |
| Pupil | Mage, Shaman, Monk |
| Journeyman | Fighter, Pirate |
| Mercenary | Hero, Ranger |
| Myrmidon | Swordmaster, Assassin |
| Cavalier | Paladin, Great Knight |
| Knight | General, Great Knight |
| Archer | Sniper, Ranger |
| Fighter | Warrior, Hero |
| Pirate | Berserker, Warrior |
| Thief | Assassin, Rogue |
| Pegasus Knight | Falcoknight, Wyvern Knight |
| Wyvern Rider | Wyvern Lord, Wyvern Knight |
| Mage | Sage, Mage Knight |
| Monk / Priest | Bishop, Sage |
| Cleric | Bishop, Valkyrie |
| Shaman | Druid, Summoner |
| Troubadour | Valkyrie, Mage Knight |

Soldier, Brigand, Dancer, Phantom and Manakete do not promote. Necromancer is a promoted-tier class with no class that promotes into it. (yet)

**Monsters** (see [Monsters](#monsters)):

```
Revenant   -> Entombed -> Cyclops
           -> Mogall   -> Arch Mogall, Gorgon
           -> Bael     -> Elder Bael
           -> Mauthe Doog -> Gwyllgi
Bonewalker -> Wight    -> Cyclops
           -> Gargoyle -> Deathgoyle
           -> Tarvos   -> Maelduin
```

**Tiers:** trainee classes (Trainee, Recruit, Pupil, Journeyman, Revenant, Bonewalker), middle tier (most base classes, plus Entombed and Wight), and promoted classes.

**Movement types** decide terrain costs: foot, mounted, armored, mage, flier, pirate, fighter and spider.

Each class has its own base stats, growth rates, stat caps and weapon ranks. These are in `CLASS_DATA` in `units.js` (taken from Serenes Forest).

---

## Terrain

| Terrain | Def | Avoid | Notes |
|---|---|---|---|
| Plain, Floor, Sand, Bridge | 0 | 0 | Cost 1. |
| Forest | 1 | 20 | Slows most units. |
| Desert | 0 | 5 | Slow for foot, mounted and armored; mages and fliers cross freely. |
| Mountain | 1 | 30 | Very slow on foot; **mounted units cannot enter**. |
| Peak | 2 | 40 | Only fliers (and pirates and fighters, slowly) can enter. |
| Ruins | 1 | 10 | |
| River | 0 | 0 | Cost 5 (6 for armor); pirates and fliers cross easily. |
| Lake | 0 | 0 | Fliers and pirates only. |
| Fort, Cave, Throne | 2 | 20 | Strongholds. |
| Shop | 0 | 10 | Units standing here can shop. |
| Wall | | | Impassable. |
| Weak wall | | | Impassable until destroyed. 30 HP. |
| Snag | | | Blocks ground units, fliers pass. 30 HP. |

- **Breaking things:** any unit can attack a weak wall or snag with a weapon in range. Damage is Str or Mag plus weapon might (minimum 1), and there is no counter. A broken weak wall becomes Floor. A broken snag becomes Plain, and any river beside it becomes a crossable **snag bridge**. A flier standing on a snag protects it from attack.
- **Fliers** ignore terrain defense and avoid bonuses.
- Units can pass through friends but not enemies (Rogues and Assassins can pass through enemies). A unit cannot stop on an occupied tile.

---

## Forts, thrones and caves

### Forts

- **Capture:** any unit standing on an enemy or neutral fort can **CAPTURE** it (ends its action). The fort changes owner, resets its roster and records, and takes the lowest unused fort number for its new owner.
- **Reinforcements:** at the start of its owner's phase, a fort spawns the unit at the front of its **queue**, if the fort tile is empty and the **population cap (8)** allows it. The unit goes to the back of the queue so units rotate.
- **Population:** each living unit whose home is that fort counts by weight: trainees 1 (Pupil 1.25), other units 2, promoted units 3, +0.25 for casters, +0.25 for mounted, +0.5 for fliers. Phantoms count 0.
- **Home fort:** a unit has a home only if it spawned from, or started on, a fort its team owns. Everyone else is "fort 0" and counts toward no population.
- **Roster:** a fort offers the team's default classes (trainees for Blue and Red, base monsters for Green). If a unit **starts on** a fort or cave, that spawner only offers that unit's class. Promoting or buying a class adds it to the fort's roster.
- **Managing a human fort:** select an empty tile that is one of your forts (context menu, **FORT**). You can queue up to **3** units, remove the last, or clear the queue. Each entry shows its class, weight and recorded level.
- **Recorded levels:** a fort remembers the best level reached by each class from it, and new spawns come out at that level.
- CPU sides pick their own queues each turn: a random class, weighted toward ones with lower recorded levels for variety.

### Thrones

- Only a **Lord** can capture a throne. Taking another contender's throne wins the game.
- If a team's Lord dies, its throne **respawns** him after the absence timer (2 turns) at his recorded level. A Lord standing on his own throne does not block respawns.

### Caves

- Caves spawn units exactly like forts but have **no population cap**, so they spawn forever. They are the monster factories on many maps.
- They **cannot be captured**. A unit standing on a cave its team does not own gets **DESTROY**, which ends its action and turns the cave into a **Peak**. Neutral caves can be destroyed by anyone.
- A cave offers the team's default roster, or only the class of the unit that started on it.

---

## Gold and the shop

Each team starts with **1000 gold**. It is earned by defeating units (10 × EXP) and by selling items.

Stand on a **Shop** tile and choose **SHOP**. Completing any purchase or sale ends the unit's action.

**Buy**
- **Items** by category (swords, lances, axes, bows, Anima, Light, Dark, staves, consumables). The price is the item's worth, and your inventory must have room. Gems and unobtainable items are not sold.
- **Units:** adds a class to the roster of a fort you own (you choose which). Price is **population weight × 1000**. Unit classes that are never buyable: Lords, Dancers, Phantoms, Manakete and every monster. Promoted and many middle-tier classes (Cavalier, Knight, Fighter, Pirate, Mage, Monk, Shaman, Priest, Wyvern Rider, Pegasus Knight, Brigand, Mercenary, Myrmidon, Soldier) only appear **after your team has promoted into them** (or used a Brace).
- **Ballistae:** upgrade or reload a ballista that one of your units is standing on (see [Ballistae](#ballistae)).

**Sell**
- Normal items sell for **half their worth, scaled by the uses left**. Gems sell for full worth. Items with no worth cannot be sold.

---

## Items

Each unit carries **5 items**. A crewed ballista does not use a slot.

**Consumables that work**

| Item | Effect |
|---|---|
| Vulnerary | Restores 10 HP (3 uses). |
| Elixir | Restores all HP (3 uses). |
| Pure Water | +7 Res that drops by 1 each of your phases. |
| Antitoxin | Cures poison. |
| Lunar Brace / Solar Brace | Unlocks Wyvern Rider / Pegasus Knight for the shop, and adds it to a fort of your choice free. |
| Promotion items | See [Promotion](#promotion). |
| Gems | Sell for 2500 / 5000 / 10000. |

Use items from the **ITEMS** screen. Using an item ends the unit's action. A viewing-only screen (enemies, or a unit that has acted) shows items without use buttons.

**Data only for now:** stat boosters (Angelic Robe, Energy Ring and the like), keys and lockpicks, Member and Silver Cards, Torch, Juna Fruit, Metis's Tome, Fili Shield and Hoplon Guard exist as items but have no effect in play yet.

**Trading:** units can **TRADE** with an adjacent ally. Pick an item, then a slot on the other unit. Choosing an occupied slot swaps the two items.

**Retreating:** a unit that has not moved can **RETREAT** (not Lords), removing itself from the map with no EXP or gold. It asks for confirmation first.

---

## Staves

Healing, curing and status staves are implemented. Staves cost a use each time, grant weapon EXP and class EXP, and are used on a target in range.

| Staff | Effect |
|---|---|
| Heal / Mend | Restores the target's HP by the user's Mag + 10 / + 20. |
| Recover | Fully restores HP. |
| Physic | Heals at a distance (range 1 to Mag ÷ 2). |
| Restore | Removes every status from an ally. |
| Sleep | Puts an enemy to sleep (range 1 to Mag ÷ 2). |

The remaining staves in `staves.js` (Fortify, Silence, Berserk, Warp, Rescue, Torch, Hammerne, Unlock, Barrier, Latona, and the monster Nightmare) are listed but not yet usable.

---

## Status effects

| Status | Effect | How it ends |
|---|---|---|
| **Poison** | At the start of the unit's phase it loses 20% of max HP (at least 1). Poison cannot kill; it stops at 1 HP. | Antitoxin or Restore. |
| **Sleep** | The unit cannot move, act or counter, and is drawn grey. | Ends after **3** of its own phases. |
| **Stone** | As sleep, but permanent. Enemy critical chance against it is **+50**. | Restore only. |

Poison weapons (Poison sword, axe, lance, bow and claws) poison on a hit. The Gorgon Egg's Stone spell and the Sleep staff inflict the others. A unit with several statuses shows them one at a time in turn. A blocked hit (Great Shield) inflicts nothing.

---

## Class abilities

| Class | Ability |
|---|---|
| Thief | **Steal:** take one item from an adjacent enemy (not equipped monster weapons). Gives EXP. Needs a free slot. |
| Rogue | Steal, and **Pass** (move through enemies). |
| Assassin | Pass, and **Silencer:** a critical hit has a 50% chance to kill outright. |
| Summoner | **Summon:** place a Phantom on an adjacent tile. One at a time. It matches the summoner's level, gives no EXP, and does not count toward population. |
| Bishop | **Slayer:** counts as an effective weapon (×3) against monsters. |
| Sniper | **Sure Strike:** each strike can be an automatic hit. |
| General | **Great Shield:** can negate an incoming hit. |
| Wyvern Knight | **Pierce:** can ignore the target's defense. |
| Swordmaster, Berserker | +15 critical chance. |

Sure Strike, Great Shield and Pierce each trigger with a chance of **1.5% × the attacker's level** (on the classic 1 to 20 scale). Great Shield uses the *attacker's* level.

---

## Ballistae

A ballista is a siege weapon placed on the map.

- **Crew:** an **Archer or Sniper** standing on a ballista can choose **BALLISTA** to man it. Entering sets the unit's movement to 0 and replaces its weapons with the ballista (inventory weapons are unusable while crewed). The unit is hidden and the occupied ballista art is drawn in its place.
- **Firing:** long range, **neither side can counter**, effective against fliers. Ballista uses are tracked on the tile (5 each).
- **Leaving:** choose **EXIT** to leave. A spent ballista ejects its crew automatically, and the unit moves again normally. If you cancel a move or an attack, the unit leaves the ballista it entered.
- **Types:** Ballista (range 3 to 10), Iron Ballista (range 3 to 15, stronger), Killer Ballista (extra crit).
- **Shop:** from the shop's BALLISTAE section you can upgrade a ballista your unit is on, or reload it for half the pro-rated price.
- **ITEMS** screen shows the crewed ballista as an extra last entry so you can see its uses.

---

## Monsters

Monsters are mostly Green's army and use weapons with no rank (claws, fangs, eyes, breath) that **any unit can use**, have **unlimited uses**, cannot be bought, sold or stolen, and give no weapon EXP.

- **Starting weapons:** each monster class has a default (Revenant: Rotten Claw, Bael: Poison Claw, Mogall: Evil Eye, Gorgon: Demon Surge, and so on).
- **Promotion:** the claw is replaced with the new class's own, or dropped, and weapons the new class cannot use are discarded.
- **CPU monsters** roll **once**, when they first reach the promotion level, for a **50%** chance to promote. A failure means they never do. A monster that passes promotes on its next turn, and the next tier gets a fresh roll.
- Monster forts and caves start with just **Revenant and Bonewalker** and gain promoted forms as units promote.
- Cyclops, Gorgon and the like use normal weapons after promotion.
- Special monsters: the **Gorgon Egg** (inflicts stone), **Draco Zombie** and the **Demon King** (huge stats, `DemonLight` weapon).

---

## The CPU

Any team that is not human-controlled is CPU. Units have an AI mode: **attack** (the default for CPU sides) or **defend** (a guard that never moves and attacks only things in reach). A map can give any unit an `ai`.

A CPU unit takes its turn in priority order, and does the first thing that applies:

1. Use a **brace** it carries.
2. **Promote** if able (monsters only if their one roll passed).
3. **Drink** a healing item at 50% HP or less; use an Antitoxin if poisoned.
4. **Heal** an ally with a staff.
5. **Steal** (thieves with room).
6. **Attack** the best target worth fighting. Fights are scored by damage dealt against damage taken, kill chances and status effects. Weak units avoid fights they would lose, and Lords only take even-or-better fights. CPU units refuse to end a move inside the reach of a guard they cannot beat.
7. **Shop trips** (rolled once): a promotion item, a new unit class for a fort, or a healing item.
8. **Advance** toward a goal, and capture or destroy what they stand on.

**Where they go:**
- Enemy **thrones** are everyone's objective. Non-Lords also go for neutral forts, **enemy caves** and forts in rival corners.
- **Lords** only head for thrones, and only with an escort of at least 2 nearby (and wait to heal when below half HP if a healer exists).
- About three units become **escorts** that stay within 5 tiles of the Lord.
- Units plan routes through **bridges** as waypoints when that is not a huge detour.
- They **dig through** weak walls and snags that sit on their shortest route.
- Healers follow wounded allies.

CPU moves and animations can be sped up independently in **Options > Speed**.

---

## Menus and interface

**Title screen:** NEW GAME (choose a map, then who is human), LOAD GAME, and SETTINGS (themes).

**Choosing controllers:** each map lists which teams may be human. If more than one team is allowed you get a **Controllers** screen to toggle each team between HUMAN and CPU. At least one team must be human. Every other team is always CPU.

**The map:** a unit is selected by choosing it. Blue tiles show where it can move, red tiles its attack reach, and green its staff reach. A blue arrow with a tail shows the path as you move the cursor.

**The unit menu:** selecting a unit's own tile, or moving it, opens one menu with these actions as they apply:

ATTACK · STEAL · SUMMON · STAFF · CAPTURE · DESTROY · PROMOTE · SHOP · TRADE · BALLISTA / EXIT · ITEMS · STATS · RETREAT (before moving only) · WAIT

- **BACK** on the action list undoes a move. Cancelling an attack after a move also undoes the move.
- **STATS** shows stats and a weapon-rank page. **ITEMS** shows the inventory with item details and EQUIP or USE.
- Enemies and units that already acted show only ITEMS and STATS (from the context menu).

**The context menu:** choose an empty tile, an enemy, or a unit that has acted. Offers CHECK STATS / ITEMS (for a unit), FORT or CAVE (your own empty spawner), UNITS, OPTIONS, SAVE GAME, END TURN.

**Units list:** a table of a team's units on three pages (General, Stats, Weapon Ranks). Click a column to sort. Selecting a row moves the cursor to that unit.

**Options:** themes (Classic, Forest, Royal, Dark), speed (Animation, CPU Step, CPU Anim: Slow / Normal / 2x / 4x / Instant), and zoom (x0.25 to x2).

**Info panels:** under the map, one shows the tile under the cursor (terrain, avoid, defense, wall HP, fort owner and next queued unit) and one the unit (level, HP, EXP or status, home fort).

**Camera:** the view is 20 tiles wide at x1 and follows the cursor with a 3-tile margin. Settings are remembered in the browser.

---

## Saving and loading

- **SAVE GAME** is in the context menu. It is only available on a human side with nothing in progress (no unit selected, no pending move or attack).
- It writes a JSON file through the browser's file picker, or downloads it where that is not supported. Files are named like `watermarks-turn6-blue-20261122-1518.json`.
- A save holds the turn and side, gold, who is human, unlocked unit classes and promotion sources, the cursor, and the full map with every tile's state and every unit and item.
- **LOAD GAME** from the title screen validates the file and refuses damaged or oversized ones.
- If a save was made on a side that is now CPU, the CPU takes over when loaded.
- Saves made before the controller option load with team 1 human.

---

## Making maps

A map is a JavaScript file in `maps/` registered in `maps/index.js` (an entry with an `id`, a `name` and a `load` function that imports the file). It exports:

```js
export const MAP_LAYOUT = `
  . . . T T .
  . O . ~ ~ .
  H . . B . $
`;

// Who starts owning which stronghold.
export const STRONGHOLD_OWNERS = [
  { x: 1, y: 1, team: 1 },
  { x: 0, y: 2, team: 1 }
];

export const STARTING_UNITS = [
  { x: 0, y: 2, unit: "Lord", team: 1 },
  { x: 2, y: 1, unit: "Fighter", team: 2, level: 4, ai: "defend" }
];

// Optional.
export const BALLISTAS = [{ x: 3, y: 2, type: "Iron Ballista" }];
export const HUMAN_TEAMS = [1, 2];     // teams a player may control
```

**Layout symbols**

| Symbol | Terrain | Symbol | Terrain |
|---|---|---|---|
| `.` | Plain | `M` | Mountain |
| `T` | Forest | `P` | Peak |
| `~` | River | `L` | Lake |
| `S` | Sand | `D` | Desert |
| `F` | Floor | `R` | Ruins |
| `B` | Bridge | `#` | Wall |
| `W` | Weak wall | `G` | Snag |
| `O` | Fort | `C` | Cave |
| `H` | Throne | `h` | Throne back (decoration) |
| `$` | Shop | | |

Rows must all be the same width, and every coordinate must be inside the map.

**Starting unit fields:** `x`, `y`, `unit` (class name), `team`, and optionally `level`, `exp`, `hp`, `ai` (`"attack"` or `"defend"`), `items` (a list of item class names, or objects to set properties like `plunder: true`), `ranks` (set weapon ranks), and `promotedFrom` with `fromLevel` (build a promoted unit from its earlier class).

- A unit that starts on a fort or cave its team owns makes that spawner offer only that unit's class.
- A unit with `items` gets exactly that inventory. Without it, the unit gets default weapons and a chance of a lucky weapon.
- Give `HUMAN_TEAMS` only the teams that should be playable. If it has one team, the controller screen is skipped.

---

## Tuning

Most balance numbers are constants near the top of their files.

| Setting | File | Default |
|---|---|---|
| `LVL_FACTOR` (rolls per level, level scale) | `exp.js` | 2 |
| `FORT_WIN_PERCENT`, `CONTENDING_TEAMS` | `victory.js` | 75, [1, 2] |
| Starting gold | `gameState.js` (`teamGold`) | 1000 |
| `MAX_INVENTORY` | `inventory.js` | 5 |
| Fort `popCap`, `MAX_QUEUE` | `terrain.js`, `strongholds.js` | 8, 3 |
| Unit price per weight | `shopMenu.js` | 1000 |
| Lucky weapon chances | `luckyWeapon.js` | see above |
| Poison, sleep, stone numbers | `status.js` | 20%, 3 turns, +50 crit |
| Which sides are CPU | chosen at game start | |
| CPU shop, fight and escort numbers | `cpu.js` | |
| Monster promotion chance | `cpu.js` (`MONSTER_PROMO_CHANCE`) | 50% |
| View size, scroll margin, zoom steps | `camera.js` | 20 tiles, 3 |
| Animation timing | `combatAnimation.js`, `sprites.js` | |
| Themes | `styles.css`, `settings.js` | |

---

## Project layout

```
index.html        the page
styles.css        all styling and themes
serve.py          local test server
LICENSE
assets/           sprite sheet and tile sheet (not covered by the license)
maps/             map files and index.js
js/
  main.js         startup, input, new game and load
  gameState.js    grid, turn, side, gold
  map.js          map loading and terrain building
  terrain.js      terrain classes
  units.js        class data (CLASS_DATA) and unit classes
  combat.js       damage, hit, crit, triangle, effectiveness
  exp.js          EXP, leveling, weapon ranks, LVL_FACTOR
  promotion.js    promotion rules and gains
  strongholds.js  forts, thrones, caves, queues, spawning, records
  abilities.js    class abilities and stealing
  status.js       poison, sleep, stone, temporary Res
  inventory.js    items, equipping, durability, ballistae
  luckyWeapon.js  bonus weapons
  summon.js       phantoms
  pathfinding.js  movement and distance maps
  cpu.js          the computer player
  victory.js      win conditions
  saveGame.js     save and load
  camera.js, gameArea.js, sprites.js, tileset.js, cursor.js, input.js
  unitInfo.js, tileInfo.js, settings.js, utils.js, errorBanner.js
  items/          item and weapon data by type
  menus/          unitMenu, actions, movementMenu, attackMenu, combat menus,
                  shop, trade, steal, summon, staff, context, units list,
                  title screen, level-up screen, turn handling
```

---

## Credits

- Game code: see [LICENSE](LICENSE).
- Class, item and weapon data are based on the community reference at Serenes Forest.
- Map sprites and tiles come from Fire Emblem: The Sacred Stones, with the sprite sheet ripped by a third party (credited on the sheet). Those images belong to their owners and are not part of the license.
