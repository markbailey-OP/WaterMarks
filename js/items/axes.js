import { Item } from "./items.js";

// Parent class for all axes
export class Axe extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Axe", name);
    
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

// Standard axes
export class IronAxe extends Axe {
  constructor() {
    super("Iron Axe", {
      rank: "E", wt: 10, might: 8, hit: 75, crit: 0,
      uses: 45, worth: 270, wExp: 1
    });
  }
}

export class SteelAxe extends Axe {
  constructor() {
    super("Steel Axe", {
      rank: "D", wt: 15, might: 11, hit: 65, crit: 0,
      uses: 30, worth: 360, wExp: 2
    });
  }
}

export class SilverAxe extends Axe {
  constructor() {
    super("Silver Axe", {
      rank: "A", wt: 12, might: 15, hit: 70, crit: 0,
      uses: 20, worth: 1000, wExp: 1
    });
  }
}

// Special-effect axes
export class PoisonAxe extends Axe {
  constructor() {
    super("Poison Axe", {
      rank: "D", wt: 10, might: 4, hit: 60, crit: 0,
      uses: 40, worth: null, wExp: 1, poison: true,
      effect: "Poisons on contact"
    });
  }
}

export class BraveAxe extends Axe {
  constructor() {
    super("Brave Axe", {
      rank: "B", wt: 16, might: 10, hit: 65, crit: 0,
      uses: 30, worth: 7500, wExp: 1, brave: true,
      effect: "Allows 2 consecutive hits"
    });
  }
}

export class KillerAxe extends Axe {
  constructor() {
    super("Killer Axe", {
      rank: "C", wt: 11, might: 11, hit: 65, crit: 30,
      uses: 20, worth: 1000, wExp: 1
    });
  }
}

export class Halberd extends Axe {
  constructor() {
    super("Halberd", {
      rank: "D", wt: 15, might: 10, hit: 60, crit: 0,
      uses: 18, worth: 810, wExp: 1,
      effect: "Effective against horseback units"
    });
  }
}

export class Hammer extends Axe {
  constructor() {
    super("Hammer", {
      rank: "D", wt: 15, might: 10, hit: 55, crit: 0,
      uses: 20, worth: 800, wExp: 2,
      effect: "Effective against armoured units"
    });
  }
}

export class DevilAxe extends Axe {
  constructor() {
    super("Devil Axe", {
      rank: "E", wt: 18, might: 18, hit: 55, crit: 0,
      uses: 20, worth: 880, wExp: 8,
      effect: "User may damage themselves"
    });
  }
}

// Ranged axes
export class HandAxe extends Axe {
  constructor() {
    super("Hand Axe", {
      rank: "E", range: [1, 2], wt: 12,
      might: 7, hit: 60, crit: 0,
      uses: 20, worth: 300, wExp: 1
    });
  }
}

export class Tomahawk extends Axe {
  constructor() {
    super("Tomahawk", {
      rank: "A", range: [1, 2], wt: 14,
      might: 13, hit: 65, crit: 0,
      uses: 15, worth: 3000, wExp: 1
    });
  }
}

export class Hatchet extends Axe {
  constructor() {
    super("Hatchet", {
      rank: "E", range: [1, 2], wt: 5,
      might: 4, hit: 85, crit: 0,
      uses: 50, worth: null, wExp: 1
    });
  }
}

// Weapon triangle axes
export class Swordreaver extends Axe {
  constructor() {
    super("Swordreaver", {
      rank: "C", wt: 13, might: 11, hit: 65, crit: 5,
      uses: 15, worth: 2100, wExp: 2,
      effect: "Good against swords, bad against lances"
    });
  }
}

export class Swordslayer extends Axe {
  constructor() {
    super("Swordslayer", {
      rank: "C", wt: 13, might: 11, hit: 80, crit: 5,
      uses: 20, worth: 2000, wExp: 1,
      effect: "Good against swords, bad against lances; effective against sword-fighting units"
    });
  }
}

// Effective and rare axes
export class DragonAxe extends Axe {
  constructor() {
    super("Dragon Axe", {
      rank: "C", wt: 11, might: 12, hit: 60, crit: 0,
      uses: 30, worth: 4500, wExp: 1,
      effect: "Effective against dragon units"
    });
  }
}

export class Fiendcleaver extends Axe {
  constructor() {
    super("Fiendcleaver", {
      rank: "E", wt: 10, might: 8, hit: 75, crit: 5,
      uses: 60, worth: null, wExp: 1,
      effect: "Effective against monsters; unobtainable without codes"
    });
  }
}

export class BattleAxe extends Axe {
  constructor() {
    super("Battle Axe", {
      rank: "B", wt: 15, might: 13, hit: 60, crit: 5,
      uses: 20, worth: 1000, wExp: 1
    });
  }
}

// Legendary axe
export class Garm extends Axe {
  constructor() {
    super("Garm", {
      rank: "S", wt: 13, might: 20, hit: 75, crit: 0,
      uses: 30, worth: null, wExp: 1,
      effect: "Speed +5; effective against monsters"
    });
  }
}