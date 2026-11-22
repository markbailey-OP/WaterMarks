import { Item } from "./items.js";

export class Staff extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Staff", name);
    
    this.rank = "E";
    this.range = 1;
    this.exp = 11;
    this.wExp = 1;
    
    Object.assign(this, stats);
    this.maxUses = this.uses;
  }
}

export class Heal extends Staff {
  constructor() {
    super("Heal", {
      heal: 10,
      rank: "E",
      range: 1,
      uses: 30,
      wExp: 2,
      exp: 30,
      worth: 600,
      effect: "Restores an adjacent ally's HP by the user's Magic + 10."
    });
  }
}

export class Mend extends Staff {
  constructor() {
    super("Mend", {
      heal: 20,
      rank: "D",
      range: 1,
      uses: 20,
      wExp: 3,
      exp: 60,
      worth: 1000,
      effect: "Restores an adjacent ally's HP by the user's Magic + 20."
    });
  }
}

export class Recover extends Staff {
  constructor() {
    super("Recover", {
      heal: "full",
      rank: "C",
      range: 1,
      uses: 15,
      wExp: 3,
      exp: 80,
      worth: 2250,
      effect: "Fully restores an adjacent ally's HP."
    });
  }
}

export class Physic extends Staff {
  constructor() {
    super("Physic", {
      heal: 10,
      rank: "B",
      range: "1~Mag/2",
      uses: 15,
      wExp: 3,
      exp: 80,
      worth: 3750,
      effect: "Restores a distant ally's HP by the user's Magic + 10."
    });
  }
}

export class Fortify extends Staff {
  constructor() {
    super("Fortify", {
      rank: "A",
      range: "1~Mag/2",
      uses: 8,
      wExp: 5,
      exp: 100,
      worth: 8000,
      effect: "Restores allies' HP within casting range by the user's Magic + 10."
    });
  }
}

export class Restore extends Staff {
  constructor() {
    super("Restore", {
      rank: "C",
      range: 1,
      uses: 10,
      wExp: 3,
      exp: 60,
      worth: 2000,
      cures: true,
      effect: "Removes an adjacent ally's status condition."
    });
  }
}

// Status-effect staves

export class Silence extends Staff {
  constructor() {
    super("Silence", {
      rank: "B",
      range: "1~Mag/2",
      uses: 3,
      wExp: 5,
      exp: 60,
      worth: 1200,
      effect: "Silences an enemy, preventing them from using magic or staves."
    });
  }
}

export class Sleep extends Staff {
  constructor() {
    super("Sleep", {
      rank: "B",
      range: "1~Mag/2",
      uses: 3,
      wExp: 5,
      exp: 70,
      worth: 1500,
      inflicts: "sleep",
      effect: "Puts an enemy to sleep, preventing movement and attacks."
    });
  }
}

export class Berserk extends Staff {
  constructor() {
    super("Berserk", {
      rank: "B",
      range: "1~Mag/2",
      uses: 3,
      wExp: 5,
      exp: 80,
      worth: 1800,
      effect: "Causes an enemy to attack nearby units indiscriminately."
    });
  }
}

// Movement and utility staves

export class Warp extends Staff {
  constructor() {
    super("Warp", {
      rank: "A",
      range: 1,
      uses: 5,
      wExp: 7,
      exp: 85,
      worth: 7500,
      effect: "Teleports an ally to a traversable map square within the user's Magic-based limit."
    });
  }
}

export class Rescue extends Staff {
  constructor() {
    super("Rescue", {
      rank: "B",
      range: "1~Mag/2",
      uses: 3,
      wExp: 7,
      exp: 80,
      worth: 1800,
      effect: "Brings a distant ally to a space adjacent to the caster."
    });
  }
}

export class Torch extends Staff {
  constructor() {
    super("Torch", {
      rank: "D",
      range: "1~Mag/2",
      uses: 10,
      wExp: 5,
      exp: 35,
      worth: 1000,
      effect: "Lights up an area in Fog of War; the effect decreases each turn."
    });
  }
}

export class Hammerne extends Staff {
  constructor() {
    super("Hammerne", {
      rank: "C",
      range: 1,
      uses: 3,
      wExp: 8,
      exp: 70,
      worth: 1800,
      effect: "Repairs an ally's weapon or staff to full uses."
    });
  }
}

export class Unlock extends Staff {
  constructor() {
    super("Unlock", {
      rank: "D",
      range: [1, 2],
      uses: 10,
      wExp: 5,
      exp: 47,
      worth: 1500,
      effect: "Opens a door that would normally require a door key."
    });
  }
}

export class Barrier extends Staff {
  constructor() {
    super("Barrier", {
      rank: "C",
      range: 1,
      uses: 15,
      wExp: 4,
      exp: 47,
      worth: 2250,
      effect: "Increases an ally's Resistance by 7; the bonus decreases each turn."
    });
  }
}

// Legendary staff

export class Latona extends Staff {
  constructor() {
    super("Latona", {
      rank: "S",
      range: "All",
      uses: 3,
      wExp: 1,
      exp: 100,
      worth: "N/A",
      effect: "Restores HP and cures status conditions for all other units on the map."
    });
  }
}