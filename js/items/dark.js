
import { Item } from "./items.js";

// Parent class for all Dark magic tomes
export class Dark extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Dark", name);
    
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

// Basic Dark magic

export class Hex extends Dark {
  constructor() {
    super("Hex", {
      rank: "E",
      range: [1, 2],
      wt: 6,
      might: 6,
      hit: 70,
      crit: 0,
      uses: 50,
      wExp: 1,
      worth: 600,
      effect: "NONE"
    });
  }
}

export class Flux extends Dark {
  constructor() {
    super("Flux", {
      rank: "D",
      range: [1, 2],
      wt: 8,
      might: 9,
      hit: 80,
      crit: 0,
      uses: 45,
      wExp: 1,
      worth: 900,
      effect: "NONE"
    });
  }
}

export class Luna extends Dark {
  constructor() {
    super("Luna", {
      rank: "C",
      range: [1, 2],
      wt: 12,
      might: 0,
      hit: 50,
      crit: 10,
      uses: 30,
      wExp: 1,
      worth: 4200,
      ignoresRes: true,
      effect: "Ignores the enemy's Resistance."
    });
  }
}

export class Nosferatu extends Dark {
  constructor() {
    super("Nosferatu", {
      rank: "C",
      range: [1, 2],
      wt: 14,
      might: 10,
      hit: 70,
      crit: 0,
      uses: 20,
      wExp: 1,
      worth: 3200,
      drain: 1,
      effect: "User recovers HP equal to damage dealt."
    });
  }
}

// Long-range Dark magic

export class Eclipse extends Dark {
  constructor() {
    super("Eclipse", {
      rank: "B",
      range: [3, 10],
      wt: 12,
      might: 0,
      hit: 30,
      crit: 0,
      uses: 5,
      wExp: 8,
      worth: 4000,
      halvesHp: true,
      noCounter: true,
      effect: "Halves the enemy's current HP; cannot be countered."
    });
  }
}

// Advanced Dark magic

export class Fenrir extends Dark {
  constructor() {
    super("Fenrir", {
      rank: "A",
      range: [1, 2],
      wt: 18,
      might: 15,
      hit: 70,
      crit: 0,
      uses: 20,
      wExp: 1,
      worth: 9000,
      effect: "NONE"
    });
  }
}

// Legendary Dark tomes

export class Gleipnir extends Dark {
  constructor() {
    super("Gleipnir", {
      rank: "S",
      range: [1, 2],
      wt: 20,
      might: 23,
      hit: 80,
      crit: 0,
      uses: 30,
      wExp: 3,
      worth: "N/A",
      effect: "Skill +5."
    });
  }
}

export class Naglfar extends Dark {
  constructor() {
    super("Naglfar", {
      rank: "S",
      range: [1, 2],
      wt: 18,
      might: 25,
      hit: 95,
      crit: 0,
      uses: "N/A",
      wExp: 1,
      worth: "N/A",
      effect: "NONE"
    });
  }
}