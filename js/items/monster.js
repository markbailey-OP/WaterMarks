/*
  Monster weapon data based on Serenes Forest:
  The Sacred Stones > Inventory > Monster Weapons
  Stone, Evil Eye, Crimson Eye and Dragonstone are not in that table; their
  stats come from fe8.triangleattack.com / Fire Emblem Wiki.

  Monster weapons have no rank (rank: null), so canUseWeapon() lets any unit
  use them. They have unlimited uses ("N/A", like Naglfar), cannot be bought,
  sold, or rolled as lucky weapons (worth null, no rank), and give no WExp.
  Give them to a unit through its map entry: items: ["FieryFang"].
*/
import { Item } from "./items.js";
import { Dark } from "./dark.js";
import { Staff } from "./staves.js";

// Parent class for physical (and special) monster weapons.
export class Monster extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Monster", name);

    this.rank = null;
    this.range = 1;
    this.wt = 0;
    this.might = 0;
    this.hit = 0;
    this.crit = 0;
    this.wExp = 0;
    this.uses = "N/A";
    this.worth = null;
    this.equipped = false;

    Object.assign(this, stats);
    this.maxUses = this.uses;
  }
}

// Shared defaults for the Dark-type monster weapons: they count as Dark
// magic (magic damage, Dark triangle) but need no Dark rank.
const DARK_MONSTER = { rank: null, wExp: 0, uses: "N/A", worth: null };

// ==========================================
// CLAWS AND FANGS
// ==========================================

export class FieryFang extends Monster {
  constructor() {
    super("Fiery Fang", { wt: 5, might: 5, hit: 90 });
  }
}

export class Hellfang extends Monster {
  constructor() {
    super("Hellfang", { wt: 8, might: 13, hit: 80 });
  }
}

export class RottenClaw extends Monster {
  constructor() {
    super("Rotten Claw", { wt: 8, might: 7, hit: 80 });
  }
}

export class FetidClaw extends Monster {
  constructor() {
    super("Fetid Claw", { wt: 10, might: 12, hit: 75 });
  }
}

export class SharpClaw extends Monster {
  constructor() {
    super("Sharp Claw", { wt: 14, might: 14, hit: 65 });
  }
}

export class PoisonClaw extends Monster {
  constructor() {
    super("Poison Claw", {
      wt: 10, might: 6, hit: 65, poison: true,
      effect: "Poisons on contact"
    });
  }
}

export class LethalTalon extends Monster {
  constructor() {
    super("Lethal Talon", {
      wt: 12, might: 10, hit: 60, poison: true,
      effect: "Poisons on contact"
    });
  }
}

// ==========================================
// EYES, BREATH AND SPECIAL WEAPONS
// ==========================================

export class EvilEye extends Dark {
  constructor() {
    super("Evil Eye", { ...DARK_MONSTER, range: [1, 2], wt: 6, might: 7, hit: 85 });
  }
}

export class CrimsonEye extends Dark {
  constructor() {
    super("Crimson Eye", {
      ...DARK_MONSTER, range: [1, 2], wt: 13, might: 14, hit: 70, crit: 5
    });
  }
}

export class WretchedAir extends Monster {
  constructor() {
    super("Wretched Air", {
      range: [1, 2], wt: 0, might: 10, hit: 100,
      effect: "Strength +10, Skill +10, Defence +20, Resistance +10. " +
        "Ignores the enemy's defence."
    });
  }
}

export class DemonLight extends Monster {
  constructor() {
    super("Demon Light", {
      range: [1, 3], wt: 0, might: 15, hit: 60,
      effect: "Magic +10, Skill +10, Luck +10, Defence +10, Resistance +15."
    });
  }
}

export class Ravager extends Monster {
  constructor() {
    super("Ravager", {
      wt: 0, might: 15, hit: 85, crit: 10,
      effect: "Strength +15, Skill +15, Defence +15, Resistance +10."
    });
  }
}

export class Dragonstone extends Monster {
  constructor() {
    super("Dragonstone", {
      wt: 0, might: 16, hit: 100, crit: 15,
      effect: "Strength +12, Skill +12, Defence +15, Resistance +20. " +
        "Effective against monsters."
    });
  }
}

// ==========================================
// DARK MONSTER MAGIC
// ==========================================

export class DemonSurge extends Dark {
  constructor() {
    super("Demon Surge", {
      ...DARK_MONSTER, range: [1, 2], wt: 10, might: 11, hit: 80
    });
  }
}

export class Shadowshot extends Dark {
  constructor() {
    super("Shadowshot", {
      ...DARK_MONSTER, range: [3, 10], wt: 20, might: 13, hit: 70, crit: 5, noCounter: true,
    });
  }
}

export class Stone extends Dark {
  constructor() {
    super("Stone", {
      ...DARK_MONSTER, range: [1, 3], wt: 8, might: 0, hit: 65,
      inflicts: "stone", noDamage: true,
      effect: "Petrifies the target."
    });
  }
}

// ==========================================
// MONSTER STAFF
// ==========================================

export class Nightmare extends Staff {
  constructor() {
    super("Nightmare", {
      rank: null, range: [1, 3], uses: 1, wExp: 0, exp: 0, worth: null, inflicts: "sleep",
      effect: "Sends all enemies in range to sleep (not implemented)."
    });
  }
}
