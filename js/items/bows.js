
import { Item } from "./items.js";

// Parent class for all bows
export class Bow extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Bow", name);
    
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

// Standard bows
export class IronBow extends Bow {
  constructor() {
    super("Iron Bow", {
      rank: "E", range: 2, wt: 5, might: 6,
      hit: 85, crit: 0, uses: 45, worth: 540,
      wExp: 1,
      effect: "Effective against flying units"
    });
  }
}

export class SteelBow extends Bow {
  constructor() {
    super("Steel Bow", {
      rank: "D", range: 2, wt: 9, might: 9,
      hit: 70, crit: 0, uses: 30, worth: 720,
      wExp: 1,
      effect: "Effective against flying units"
    });
  }
}

export class SilverBow extends Bow {
  constructor() {
    super("Silver Bow", {
      rank: "A", range: 2, wt: 6, might: 13,
      hit: 75, crit: 0, uses: 20, worth: 1600,
      wExp: 1,
      effect: "Effective against flying units"
    });
  }
}

// Special-effect bows
export class PoisonBow extends Bow {
  constructor() {
    super("Poison Bow", {
      rank: "D", range: 2, wt: 5, might: 4,
      hit: 65, crit: 0, uses: 40, worth: null,
      wExp: 1, poison: true,
      effect: "Poisons on contact; effective against flying units"
    });
  }
}

export class KillerBow extends Bow {
  constructor() {
    super("Killer Bow", {
      rank: "C", range: 2, wt: 7, might: 9,
      hit: 75, crit: 30, uses: 20, worth: 1400,
      wExp: 1,
      effect: "Effective against flying units"
    });
  }
}

export class BraveBow extends Bow {
  constructor() {
    super("Brave Bow", {
      rank: "B", range: 2, wt: 12, might: 10,
      hit: 70, crit: 0, uses: 30, worth: 7500,
      wExp: 1, brave: true,
      effect: "Allows 2 consecutive hits; effective against flying units"
    });
  }
}

export class ShortBow extends Bow {
  constructor() {
    super("Short Bow", {
      rank: "D", range: 2, wt: 3, might: 5,
      hit: 85, crit: 10, uses: 22, worth: 1760,
      wExp: 2,
      effect: "Effective against flying units"
    });
  }
}

export class Longbow extends Bow {
  constructor() {
    super("Longbow", {
      rank: "D", range: [2, 3], wt: 10, might: 5,
      hit: 65, crit: 0, uses: 20, worth: 2000,
      wExp: 1,
      effect: "Extended range; effective against flying units"
    });
  }
}

// Ballistae (map siege weapons). Iron and Killer extend Ballista.
// worth is used by the shop upgrade prices.
export class Ballista extends Bow {
  constructor(name = "Ballista", stats = {}) {
    super(name, {
      rank: "E",
      range: [3, 10],
      wt: 20,
      might: 8,
      hit: 60,
      crit: 0,
      uses: 5,
      worth: 1000,
      wExp: 4,
      noCounter: true,
      effect: "Usable by Archers and Snipers only while manning a ballista; effective against flying units; neither side can counter",
      ...stats
    });
  }
}

export class IronBallista extends Ballista {
  constructor() {
    super("Iron Ballista", {
      rank: "E",
      range: [3, 15],
      wt: 20,
      might: 13,
      hit: 60,
      crit: 0,
      uses: 5,
      worth: 3000,
      wExp: 4,
      noCounter: true,
      effect: "Usable by Archers and Snipers only while manning a ballista; effective against flying units; neither side can counter"
    });
  }
}

export class KillerBallista extends Ballista {
  constructor() {
    super("Killer Ballista", {
      rank: "E",
      range: [3, 10],
      wt: 20,
      might: 12,
      hit: 65,
      crit: 10,
      uses: 5,
      worth: 5000,
      wExp: 4,
      noCounter: true,
      effect: "Usable by Archers and Snipers only while manning a ballista; effective against flying units; neither side can counter"
    });
  }
}

// Rare bow
export class BeaconBow extends Bow {
  constructor() {
    super("Beacon Bow", {
      rank: "E", range: 2, wt: 5, might: 6,
      hit: 85, crit: 5, uses: 60, worth: null,
      wExp: 1,
      effect: "Effective against monsters and flying units; unobtainable without codes"
    });
  }
}

// Legendary bow
export class Nidhogg extends Bow {
  constructor() {
    super("Nidhogg", {
      rank: "S", range: 2, wt: 7, might: 18,
      hit: 80, crit: 0, uses: 30, worth: null,
      wExp: 1,
      effect: "Luck +5; effective against monsters and flying units"
    });
  }
}