
import { Item } from "./items.js";

// Parent class for all Light magic tomes
export class Light extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Light", name);
    
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

// Basic Light magic

export class Lightning extends Light {
  constructor() {
    super("Lightning", {
      rank: "E",
      range: [1, 2],
      wt: 6,
      might: 4,
      hit: 95,
      crit: 5,
      uses: 35,
      wExp: 1,
      worth: 630,
      effect: "NONE"
    });
  }
}

export class Shine extends Light {
  constructor() {
    super("Shine", {
      rank: "D",
      range: [1, 2],
      wt: 8,
      might: 6,
      hit: 90,
      crit: 8,
      uses: 30,
      wExp: 2,
      worth: 900,
      effect: "NONE"
    });
  }
}

export class Divine extends Light {
  constructor() {
    super("Divine", {
      rank: "C",
      range: [1, 2],
      wt: 12,
      might: 8,
      hit: 85,
      crit: 10,
      uses: 25,
      wExp: 1,
      worth: 2500,
      effect: "NONE"
    });
  }
}

// Long-range Light magic

export class Purge extends Light {
  constructor() {
    super("Purge", {
      rank: "B",
      range: [3, 10],
      wt: 20,
      might: 10,
      hit: 75,
      crit: 5,
      uses: 5,
      wExp: 3,
      worth: 3000,
      noCounter: true,
      effect: "NONE"
    });
  }
}

// Advanced Light magic

export class Aura extends Light {
  constructor() {
    super("Aura", {
      rank: "A",
      range: [1, 2],
      wt: 15,
      might: 12,
      hit: 85,
      crit: 15,
      uses: 20,
      wExp: 1,
      worth: 8000,
      effect: "NONE"
    });
  }
}

// Legendary Light tome

export class Ivaldi extends Light {
  constructor() {
    super("Ivaldi", {
      rank: "S",
      range: [1, 2],
      wt: 10,
      might: 17,
      hit: 90,
      crit: 5,
      uses: 30,
      wExp: 1,
      worth: "N/A",
      effect: "Defense +5; effective against monsters."
    });
  }
}