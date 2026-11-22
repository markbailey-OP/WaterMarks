
/*
  Sword data based on Serenes Forest:
  Fire Emblem: The Sacred Stones

  Item -> Sword -> Individual weapon
*/
import { Item } from "./items.js";

export class Sword extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Sword", name);

    this.rank = "E";
    this.range = 1;
    this.wt = 5;
    this.might = 5;
    this.hit = 90;
    this.crit = 0;
    this.wExp = 1;
    this.equipped = false;

    Object.assign(this, stats);
    this.maxUses = this.uses;
  }
}

// Standard swords
export class IronSword extends Sword {
  constructor() {
    super("Iron Sword");
  }
}

export class SlimSword extends Sword {
  constructor() {
    super("Slim Sword", {
      wt: 2, might: 3, hit: 100, crit: 5,
      uses: 30, worth: 480
    });
  }
}

export class SteelSword extends Sword {
  constructor() {
    super("Steel Sword", {
      rank: "D", wt: 10, might: 8, hit: 75,
      uses: 30, worth: 600
    });
  }
}

export class SilverSword extends Sword {
  constructor() {
    super("Silver Sword", {
      rank: "A", wt: 8, might: 13, hit: 80,
      uses: 20, worth: 1500
    });
  }
}

// Blades
export class IronBlade extends Sword {
  constructor() {
    super("Iron Blade", {
      rank: "D", wt: 12, might: 9, hit: 70,
      uses: 35, worth: 980, wExp: 2
    });
  }
}

export class SteelBlade extends Sword {
  constructor() {
    super("Steel Blade", {
      rank: "C", wt: 14, might: 11, hit: 65,
      uses: 25, worth: 980, wExp: 2
    });
  }
}

export class SilverBlade extends Sword {
  constructor() {
    super("Silver Blade", {
      rank: "A", wt: 13, might: 14, hit: 60,
      uses: 15, worth: 1800, wExp: 2
    });
  }
}

// Special swords
export class PoisonSword extends Sword {
  constructor() {
    super("Poison Sword", {
      rank: "D", wt: 6, might: 3, hit: 70,
      uses: 40, worth: null, poision: true,
      effect: "Poisons on contact"
    });
  }
}

export class Rapier extends Sword {
  constructor() {
    super("Rapier", {
      rank: "D", wt: 5, might: 7, hit: 95, crit: 10,
      uses: 40, worth: null, wExp: 2,
      effect: "Effective against horseback and armoured units"
    });
  }
}

export class BraveSword extends Sword {
  constructor() {
    super("Brave Sword", {
      rank: "B", wt: 12, might: 9, hit: 75,
      uses: 30, worth: 7500, brave: true,
      effect: "Allows 2 consecutive hits"
    });
  }
}

export class Shamshir extends Sword {
  constructor() {
    super("Shamshir", {
      rank: "D", wt: 5, might: 8, hit: 75, crit: 35,
      uses: 20, worth: 1200,
      effect: "Restricted weapon availability"
    });
  }
}

export class KillingEdge extends Sword {
  constructor() {
    super("Killing Edge", {
      rank: "C", wt: 7, might: 9, hit: 75, crit: 30,
      uses: 20, worth: 1300
    });
  }
}

export class Armorslayer extends Sword {
  constructor() {
    super("Armorslayer", {
      rank: "D", wt: 11, might: 8, hit: 80,
      uses: 18, worth: 1260,
      effect: "Effective against armoured units"
    });
  }
}

export class Wyrmslayer extends Sword {
  constructor() {
    super("Wyrmslayer", {
      rank: "C", wt: 5, might: 8, hit: 75,
      uses: 30, worth: 4500,
      effect: "Effective against dragon units"
    });
  }
}

// Magic swords
export class LightBrand extends Sword {
  constructor() {
    super("Light Brand", {
      rank: "C", range: [1, 2], wt: 9, might: 9, hit: 70,
      uses: 25, worth: 1250,
      effect: "Magic Sword (Light) at range"
    });
  }
}

export class Runesword extends Sword {
  constructor() {
    super("Runesword", {
      rank: "A", range: [1, 2], wt: 11, might: 12, hit: 65,
      uses: 15, worth: 3300,
      effect: "Magic Sword (Dark); drains HP from enemy"
    });
  }
}

export class WindSword extends Sword {
  constructor() {
    super("Wind Sword", {
      rank: "B", range: [1, 2], wt: 9, might: 9, hit: 70,
      uses: 40, worth: 8000,
      effect: "Magic Sword (Anima); effective against flying units"
    });
  }
}

// Weapon triangle
export class Lancereaver extends Sword {
  constructor() {
    super("Lancereaver", {
      rank: "C", wt: 9, might: 9, hit: 75, crit: 5,
      uses: 15, worth: 1800, wExp: 2,
      effect: "Good against Lances, bad against Axes"
    });
  }
}

export class Zanbato extends Sword {
  constructor() {
    super("Zanbato", {
      rank: "D", wt: 11, might: 6, hit: 85,
      uses: 18, worth: 1260,
      effect: "Effective against horseback units"
    });
  }
}

// Rare and special weapons
export class Shadowkiller extends Sword {
  constructor() {
    super("Shadowkiller", {
      rank: "E", wt: 5, might: 5, hit: 90, crit: 5,
      uses: 60, worth: null,
      effect: "Effective against monsters; normally unobtainable"
    });
  }
}

export class Sieglinde extends Sword {
  constructor() {
    super("Sieglinde", {
      rank: "S", wt: 9, might: 16, hit: 90,
      uses: 30, worth: null,
      effect: "Strength +5; effective against monsters"
    });
  }
}

export class Audhulma extends Sword {
  constructor() {
    super("Audhulma", {
      rank: "S", wt: 9, might: 18, hit: 85,
      uses: 30, worth: null,
      effect: "Resistance +5; effective against monsters"
    });
  }
}