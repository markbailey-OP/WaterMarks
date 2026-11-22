import { Item } from "./items.js";

// Parent class for all lances
export class Lance extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Lance", name);
    
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

// Standard lances
export class IronLance extends Lance {
  constructor() {
    super("Iron Lance", {
      rank: "E", wt: 8, might: 7, hit: 80, crit: 0,
      uses: 45, worth: 360, wExp: 1
    });
  }
}

export class SlimLance extends Lance {
  constructor() {
    super("Slim Lance", {
      rank: "E", wt: 4, might: 4, hit: 85, crit: 5,
      uses: 30, worth: 420, wExp: 1
    });
  }
}

export class SteelLance extends Lance {
  constructor() {
    super("Steel Lance", {
      rank: "D", wt: 13, might: 10, hit: 70, crit: 0,
      uses: 30, worth: 480, wExp: 2
    });
  }
}

export class SilverLance extends Lance {
  constructor() {
    super("Silver Lance", {
      rank: "A", wt: 10, might: 14, hit: 75, crit: 0,
      uses: 20, worth: 1200, wExp: 1
    });
  }
}

// Special-effect lances
export class ToxinLance extends Lance {
  constructor() {
    super("Toxin Lance", {
      rank: "E", wt: 8, might: 4, hit: 65, crit: 0,
      uses: 40, worth: null, wExp: 1, poison: true,
      effect: "Poisons on contact"
    });
  }
}

export class BraveLance extends Lance {
  constructor() {
    super("Brave Lance", {
      rank: "B", wt: 14, might: 10, hit: 70, crit: 0,
      uses: 30, worth: 7500, wExp: 1, brave: true,
      effect: "Allows 2 consecutive hits"
    });
  }
}

export class KillerLance extends Lance {
  constructor() {
    super("Killer Lance", {
      rank: "C", wt: 9, might: 10, hit: 70, crit: 30,
      uses: 20, worth: 1200, wExp: 1
    });
  }
}

export class Horseslayer extends Lance {
  constructor() {
    super("Horseslayer", {
      rank: "D", wt: 13, might: 7, hit: 70, crit: 0,
      uses: 16, worth: 1040, wExp: 1,
      effect: "Effective against horseback units"
    });
  }
}

// Ranged lances
export class Javelin extends Lance {
  constructor() {
    super("Javelin", {
      rank: "E", range: [1, 2], wt: 11,
      might: 6, hit: 65, crit: 0,
      uses: 20, worth: 400, wExp: 1
    });
  }
}

export class Spear extends Lance {
  constructor() {
    super("Spear", {
      rank: "B", range: [1, 2], wt: 10,
      might: 12, hit: 70, crit: 5,
      uses: 15, worth: 9000, wExp: 1
    });
  }
}

export class ShortSpear extends Lance {
  constructor() {
    super("Short Spear", {
      rank: "C", range: [1, 2], wt: 12,
      might: 9, hit: 60, crit: 0,
      uses: 18, worth: 900, wExp: 1
    });
  }
}

// Weapon triangle lance
export class Axereaver extends Lance {
  constructor() {
    super("Axereaver", {
      rank: "C", wt: 11, might: 10, hit: 70, crit: 5,
      uses: 15, worth: 1950, wExp: 2,
      effect: "Good against axes, bad against swords"
    });
  }
}

// Character-specific lance
export class Reginleif extends Lance {
  constructor() {
    super("Reginleif", {
      rank: "D", wt: 8, might: 10, hit: 80, crit: 10,
      uses: 45, worth: 7200, wExp: 2,
      effect: "Effective against horseback and armoured units"
    });
  }
}

// Special and rare lances
export class BrightLance extends Lance {
  constructor() {
    super("Bright Lance", {
      rank: "E", wt: 8, might: 7, hit: 80, crit: 5,
      uses: 60, worth: null, wExp: 1,
      effect: "Effective against monsters; unobtainable without codes"
    });
  }
}

export class Dragonspear extends Lance {
  constructor() {
    super("Dragonspear", {
      rank: "C", wt: 8, might: 10, hit: 70, crit: 0,
      uses: 30, worth: 4500, wExp: 1,
      effect: "Effective against dragon units"
    });
  }
}

export class Vidofnir extends Lance {
  constructor() {
    super("Vidofnir", {
      rank: "S", wt: 11, might: 15, hit: 85, crit: 0,
      uses: 30, worth: null, wExp: 1,
      effect: "Defence +5; effective against monsters"
    });
  }
}

export class Siegmund extends Lance {
  constructor() {
    super("Siegmund", {
      rank: "S", wt: 11, might: 17, hit: 80, crit: 0,
      uses: 30, worth: null, wExp: 1,
      effect: "Strength +5; effective against monsters"
    });
  }
}

export class HeavySpear extends Lance {
  constructor() {
    super("Heavy Spear", {
      rank: "D", wt: 14, might: 9, hit: 70, crit: 0,
      uses: 16, worth: 1200, wExp: 1,
      effect: "Effective against armoured units"
    });
  }
}