
export class Terrain {
  constructor(name) {
    this.name = name;

    this.avd = 0;
    this.def = 0;
    this.color = "#ffffff";
    this.unit = undefined;

    this.traversable = true;
    this.moveWeight = 1;

    this.moveCost = {
      foot: 1,
      mount: 1,
      armor: 1,
      mage: 1,
      flier: 1
    };
  }
}

export class River extends Terrain {
  constructor() {
    super("River");
    this.color = "#6fa8dc";
    this.moveWeight = 5;

    this.moveCost = {
      foot: 5,
      mount: 5,
      armor: 6,
      mage: 5,
      pirate: 2,
      flier: 1
    };
  }
}

export class Snag extends Terrain {
  constructor() {
    super("Snag");
    this.color = "#a61c00";
    this.traversable = true;
    this.moveWeight = 0;
    this.maxHp = 30;
    this.hp = this.maxHp;

    this.moveCost = {
      foot: 0,
      mount: 0,
      armor: 0,
      mage: 0,
      flier: 1
    };
  }
}

export class SnagBridge extends Terrain {
  constructor() {
    super("SnagBridge");
    this.color = "#669188";
  }
}

export class Wall extends Terrain {
  constructor() {
    super("Wall");
    this.color = "#434343";
    this.traversable = false;
    this.moveWeight = 0;

    this.moveCost = {
      foot: 0,
      mount: 0,
      armor: 0,
      mage: 0,
      flier: 0
    };
  }
}

export class WeakWall extends Terrain {
  constructor() {
    super("WeakWall");
    this.color = "#999999";
    this.traversable = false;
    this.maxHp = 30;
    this.hp = this.maxHp;
  }
}

export class Plain extends Terrain {
  constructor() {
    super("Plain");
    this.color = "#6aa84f";
  }
}

export class Sand extends Terrain {
  constructor() {
    super("Sand");
    this.color = "#ffd966";
  }
}

export class Floor extends Terrain {
  constructor() {
    super("Floor");
    this.color = "#cccccc";
  }
}

export class Bridge extends Terrain {
  constructor() {
    super("Bridge");
    this.color = "#e69138";
  }
}

export class Desert extends Terrain {
  constructor() {
    super("Desert");
    this.color = "#f1c232";
    this.avd = 5;
    this.moveWeight = 2;

    this.moveCost = {
      foot: 2,
      mount: 3,
      armor: 4,
      mage: 1,
      flier: 1
    };
  }
}

export class Ruins extends Terrain {
  constructor() {
    super("Ruins");
    this.color = "#999999";
    this.def = 1;
    this.avd = 10;
  }
}

export class Lake extends Terrain {
  constructor() {
    super("Lake");
    this.color = "#1155cc";
    this.traversable = true;
    this.moveWeight = 0;

    this.moveCost = {
      foot: 0,
      mount: 0,
      armor: 0,
      mage: 0,
      pirate: 2,
      flier: 1
    };
  }
}

export class Forest extends Terrain {
  constructor() {
    super("Forest");
    this.color = "#38761d";
    this.def = 1;
    this.avd = 20;
    this.moveWeight = 2;

    this.moveCost = {
      foot: 2,
      mount: 3,
      armor: 2,
      mage: 2,
      flier: 1
    };
  }
}

export class Mountain extends Terrain {
  constructor() {
    super("Mountain");
    this.color = "#f4cccc";
    this.def = 1;
    this.avd = 30;
    this.moveWeight = 2;

    this.moveCost = {
      foot: 4,
      mount: 0,
      armor: 6,
      mage: 4,
      pirate: 3,
      fighter: 3,
      spider: 1,
      flier: 1
    };
  }
}

export class Peak extends Terrain {
  constructor() {
    super("Peak");
    this.color = "#b4a7d6";
    this.def = 2;
    this.avd = 40;
    this.moveWeight = 2;

    this.moveCost = {
      foot: 0,
      mount: 0,
      armor: 0,
      mage: 0,
      pirate: 4,
      fighter: 4,
      spider: 2,
      flier: 1
    };
  }
}

export class Fort extends Terrain {
  constructor() {
    super("Fort");
    this.color = "#674ea7";
    this.def = 2;
    this.avd = 20;
    this.moveWeight = 2;
    this.owner = null;
    this.queue = [];
    this.popCap = 8;
    this.unitLevels = {};
    this.index = null;
    this.promotions = {};
  }
}

export class Throne extends Terrain {
  constructor() {
    super("Throne");
    this.color = "#00ff00";
    this.def = 2;
    this.avd = 20;
    this.moveWeight = 2;
    this.owner = null;
    this.respawnTurns = 2;
    this.timer = 0;
    this.absent = false;
    this.unitLevels = {};
    this.promotions = {};
  }
}

// Visual "back" of a two-tile throne. Behaves like Floor (move cost 1, no bonuses).
export class ThroneBack extends Terrain {
  constructor() {
    super("ThroneBack");
    this.color = "#88cc88";
  }
}

export class Shop extends Terrain {
  constructor() {
    super("Shop");
    this.color = "#ff9900";
    this.def = 0;
    this.avd = 10;
    this.moveWeight = 1;
  }
}
