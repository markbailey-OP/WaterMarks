import { Item } from "./items.js";

export class Anima extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Anima", name);

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

// Basic Anima magic

export class Fire extends Anima {
  constructor() {
    super("Fire", {
      rank: "E",
      range: [1, 2],
      wt: 4,
      might: 5,
      hit: 90,
      crit: 0,
      uses: 40,
      wExp: 1,
      worth: 560,
      effect: "NONE"
    });
  }
}

export class Thunder extends Anima {
  constructor() {
    super("Thunder", {
      rank: "D",
      range: [1, 2],
      wt: 6,
      might: 8,
      hit: 80,
      crit: 5,
      uses: 35,
      wExp: 1,
      worth: 700,
      effect: "NONE"
    });
  }
}

export class Elfire extends Anima {
  constructor() {
    super("Elfire", {
      rank: "C",
      range: [1, 2],
      wt: 10,
      might: 10,
      hit: 85,
      crit: 0,
      uses: 30,
      wExp: 2,
      worth: 1200,
      effect: "NONE"
    });
  }
}

// Long-range Anima magic

export class Bolting extends Anima {
  constructor() {
    super("Bolting", {
      rank: "B",
      range: [3, 10],
      wt: 20,
      might: 12,
      hit: 60,
      crit: 0,
      uses: 5,
      wExp: 1,
      worth: 2500,
      noCounter: true,
      effect: "NONE"
    });
  }
}

// Advanced Anima magic

export class Fimbulvetr extends Anima {
  constructor() {
    super("Fimbulvetr", {
      rank: "A",
      range: [1, 2],
      wt: 12,
      might: 13,
      hit: 80,
      crit: 0,
      uses: 20,
      wExp: 1,
      worth: 6000,
      effect: "NONE"
    });
  }
}

export class Excalibur extends Anima {
  constructor() {
    super("Excalibur", {
      rank: "S",
      range: [1, 2],
      wt: 13,
      might: 18,
      hit: 90,
      crit: 10,
      uses: 30,
      wExp: 1,
      worth: "N/A",
      effect: "Speed +5; effective against monsters."
    });
  }
}

// Special Anima tome
// This tome cannot normally be obtained without codes.

export class Alacalibur extends Anima {
  constructor() {
    super("Alacalibur", {
      rank: "B",
      range: [1, 2],
      wt: 2,
      might: 8,
      hit: 85,
      crit: 0,
      uses: 20,
      wExp: 1,
      worth: 1100,
      effect: "Effective against flying units; cannot normally be obtained."
    });
  }
}