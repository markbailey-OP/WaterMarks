export class Item {
  constructor(type, name = "NULL") {
    this.type = type;
    this.name = name;
    this.uses = 46;
    this.maxUses = this.uses;
    this.worth = 460;
    this.effectiveAgainst = [];
    this.brave = false;
    this.poison = false;
    this.plunder = false;
  }
}

// Parent class for consumable items
export class Consumable extends Item {
  constructor(name = "NULL", stats = {}) {
    super("Consumable", name);

    // Keep only properties relevant to consumables
    this.uses = stats.uses ?? 1;
    this.maxUses = this.uses;
    this.worth = stats.worth ?? 0;
    this.effect = stats.effect ?? "NONE";
        if (stats.heal !== undefined) this.heal = stats.heal;
        if (stats.plunder !== undefined) this.plunder = stats.plunder;
        if (stats.cures !== undefined) this.cures = stats.cures;
        if (stats.resBoost !== undefined) this.resBoost = stats.resBoost;
  }
}
// Healing and status items

export class Vulnerary extends Consumable {
  constructor() {
    super("Vulnerary", {
      uses: 3,
      worth: 100,
      heal: 10,
      effect: "Restores 10 HP."
    });
  }
}

export class Elixir extends Consumable {
  constructor() {
    super("Elixir", {
      uses: 3,
      worth: 300,
      heal: "full",
      effect: "Fully restores HP."
    });
  }
}

export class PureWater extends Consumable {
  constructor() {
    super("Pure Water", {
      uses: 3,
      worth: 900,
      resBoost: 7,
      effect: "Raises Resistance by 7 temporarily; the bonus decreases by 1 each turn."
    });
  }
}

export class Antitoxin extends Consumable {
  constructor() {
    super("Antitoxin", {
      uses: 3,
      worth: 350,
      cures: "poison",
      effect: "Cures the poison status."
    });
  }
}

export class Torch extends Consumable {
  constructor() {
    super("Torch", {
      uses: 5,
      worth: 500,
      effect: "Increases the user's sight in Fog of War; the effect decreases each turn."
    });
  }
}

// Permanent stat-boosting items

export class AngelicRobe extends Consumable {
  constructor() {
    super("Angelic Robe", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises maximum HP by 7."
    });
  }
}

export class EnergyRing extends Consumable {
  constructor() {
    super("Energy Ring", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises Strength/Magic by 2."
    });
  }
}

export class SecretBook extends Consumable {
  constructor() {
    super("Secret Book", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises Skill by 2."
    });
  }
}

export class Speedwing extends Consumable {
  constructor() {
    super("Speedwing", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises Speed by 2."
    });
  }
}

export class GoddessIcon extends Consumable {
  constructor() {
    super("Goddess Icon", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises Luck by 2."
    });
  }
}

export class Dragonshield extends Consumable {
  constructor() {
    super("Dragonshield", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises Defence by 2."
    });
  }
}

export class Talisman extends Consumable {
  constructor() {
    super("Talisman", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises Resistance by 2."
    });
  }
}

export class Swiftsole extends Consumable {
  constructor() {
    super("Swiftsole", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises Movement by 2."
    });
  }
}

export class BodyRing extends Consumable {
  constructor() {
    super("Body Ring", {
      uses: 1,
      worth: 8000,
      effect: "Permanently raises Constitution by 2."
    });
  }
}

export class MetisTome extends Consumable {
  constructor() {
    super("Metis's Tome", {
      uses: 1,
      worth: "N/A",
      effect: "Permanently raises all of the user's growth rates by 5."
    });
  }
}

// Class promotion items

export class HeroCrest extends Consumable {
  constructor() {
    super("Hero Crest", {
      uses: 1,
      worth: 3000,
      effect: "Promotes eligible Myrmidons, Fighters, and Mercenaries."
    });
  }
}

export class KnightCrest extends Consumable {
  constructor() {
    super("Knight Crest", {
      uses: 1,
      worth: 3000,
      effect: "Promotes eligible Cavaliers and Knights."
    });
  }
}

export class OrionsBolt extends Consumable {
  constructor() {
    super("Orion's Bolt", {
      uses: 1,
      worth: 3000,
      effect: "Promotes eligible Archers."
    });
  }
}

export class ElysianWhip extends Consumable {
  constructor() {
    super("Elysian Whip", {
      uses: 1,
      worth: 3000,
      effect: "Promotes eligible Pegasus Knights and Wyvern Riders."
    });
  }
}

export class GuidingRing extends Consumable {
  constructor() {
    super("Guiding Ring", {
      uses: 1,
      worth: 3000,
      effect: "Promotes eligible magic classes and Troubadours."
    });
  }
}

export class MasterSeal extends Consumable {
  constructor() {
    super("Master Seal", {
      uses: 1,
      worth: 5000,
      effect: "Promotes eligible standard classes."
    });
  }
}

export class OceanSeal extends Consumable {
  constructor() {
    super("Ocean Seal", {
      uses: 1,
      worth: 3000,
      effect: "Promotes eligible Thieves and Pirates."
    });
  }
}

// Keys and access items

export class ChestKey extends Consumable {
  constructor() {
    super("Chest Key", {
      uses: 1,
      worth: "N/A",
      effect: "Opens a chest."
    });
  }
}

export class DoorKey extends Consumable {
  constructor() {
    super("Door Key", {
      uses: 1,
      worth: "N/A",
      effect: "Opens a door."
    });
  }
}

export class Lockpick extends Consumable {
  constructor() {
    super("Lockpick", {
      uses: 15,
      worth: "N/A",
      effect: "Opens doors and chests. Usable by Thieves, Assassins, and Rogues."
    });
  }
}

export class MemberCard extends Consumable {
  constructor() {
    super("Member Card", {
      uses: 1,
      worth: "N/A",
      effect: "Allows the user to enter secret shops."
    });
  }
}

export class SilverCard extends Consumable {
  constructor() {
    super("Silver Card", {
      uses: 1,
      worth: "N/A",
      effect: "Allows the user to buy items at half price."
    });
  }
}

// Special route-specific items

export class LunarBrace extends Consumable {
  constructor() {
    super("Lunar Brace", {
      uses: 1,
      worth: "N/A",
      effect: "Used to unlock Wyvern Rider in the shop"
    });
  }
}

export class SolarBrace extends Consumable {
  constructor() {
    super("Solar Brace", {
      uses: 1,
      worth: "N/A",
      effect: "Used to unlock Pegasus Knight in the shop"
    });
  }
}

export class JunaFruit extends Consumable {
  constructor() {
    super("Juna Fruit", {
      uses: 1,
      worth: "N/A",
      effect: "Lowers the user's level by 1–5. Requires level 9 or higher; normally unobtainable without codes."
    });
  }
}
 // Sellable gems

export class RedGem extends Consumable {
  constructor() {
    super("Red Gem", {
      uses: 1,
      worth: 2500,
      effect: "Can be sold for 2,500 gold."
    });
  }
}

export class BlueGem extends Consumable {
  constructor() {
    super("Blue Gem", {
      uses: 1,
      worth: 5000,
      effect: "Can be sold for 5,000 gold."
    });
  }
}

export class WhiteGem extends Consumable {
  constructor() {
    super("White Gem", {
      uses: 1,
      worth: 10000,
      effect: "Can be sold for 10,000 gold."
    });
  }
}

// Passive equipment

export class FiliShield extends Consumable {
  constructor() {
    super("Fili Shield", {
      uses: 1,
      worth: 12000,
      effect: "Negates effectiveness against flying units."
    });
  }
}

export class HoplonGuard extends Consumable {
  constructor() {
    super("Hoplon Guard", {
      uses: 1,
      worth: 12000,
      effect: "Negates enemy critical hits."
    });
  }
}