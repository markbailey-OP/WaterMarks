import { gameGrid } from "./gameState.js";
import { giveDefaultWeapon } from "./inventory.js";
import { WEAPON_RANK_THRESHOLDS } from "./exp.js";
/*
  Fire Emblem: The Sacred Stones - Class data
  Source:
  https://serenesforest.net/the-sacred-stones/classes/

  Stats:
  base: [hp, str/mag, skl, spd, def, res, move, con]
  growth: [hp, str/mag, skl, spd, lck, def, res]
  caps: [hp, str/mag, skl, spd, lck, def, res, move, con]

  Classes without a unique cap entry use the standard
  non-promoted foot or mounted caps.
*/

export class Unit {
  constructor(name, team) {
    this.name = name;
    this.team = team;

    if (team === 1) this.color = "#0000dd";
    else if (team === 2) this.color = "#dd0000";
    else this.color = "#00dd00";

    this.selected = false;
    this.hasMoved = false;

    this.inventory = [];
    this.lvl = 1;
    this.exp = 0;

    this.maxHp = 10;
    this.hp = 10;

    this.str = undefined;
    this.mag = undefined;

    this.skl = 0;
    this.spd = 0;
    this.def = 0;
    this.res = 0;
    this.lck = 0;
    this.con = 0;
    this.move = 4;

    this.baseStats = {};
    this.maxStats = {};
    this.growthRates = {};
    this.promotionGains = {};

    this.weaponRanks = {};
    this.weaponExp = {};

    this.terrFactor = "foot";
  }
}

// Default maximum stats from the class maximum-stat table.
const FOOT_CAPS = {
  hp: 60, str: 20, mag: 20, skl: 20,
  spd: 20, lck: 30, def: 20, res: 20,
  move: 15, con: 20
};

const MOUNTED_CAPS = {
  ...FOOT_CAPS,
  con: 25
};

// Class data.
// The S/M value from the source is assigned to either str or mag,
// depending on the class.

export const CLASS_DATA = {
  Lord: {
    code: "LD",
    stat: "str",
    base: [18, 6, 6, 7, 6, 0, 5, 8],
    growth: [90, 45, 40, 45, 40, 15, 15],
    caps: { hp: 60, str: 27, skl: 26, spd: 24,
      lck: 30, def: 23, res: 23, move: 15, con: 25 },
    ranks: { lance: "D" },
    promotionGains: {
      GreatLord: { hp: 4, str: 2, skl: 3, spd: 2,
        def: 2, res: 5, con: 2, move: 2 }
    }
  },

  GreatLord: {
    code: "GL",
    stat: "str",
    base: [18, 3, 3, 4, 5, 0, 7, 10],
    growth: [90, 45, 40, 45, 40, 15, 15],
    caps: { hp: 60, str: 27, skl: 26, spd: 24,
      lck: 30, def: 23, res: 23, move: 15, con: 25 },
    ranks: { sword: "C", lance: "C" }
  },

  Dancer: {
    code: "DA",
    stat: "str",
    base: [14, 1, 2, 7, 0, 1, 5, 4],
    growth: [45, 45, 30, 60, 70, 0, 13],
    caps: { hp: 60, str: 10, skl: 10, spd: 30,
      lck: 30, def: 24, res: 26, move: 15, con: 20 },
    ranks: {}
  },

  Soldier: {
    code: "SO",
    stat: "str",
    base: [20, 3, 0, 1, 0, 0, 5, 6],
    growth: [80, 50, 30, 20, 25, 12, 15],
    ranks: { lance: "E" }
  },

  Cavalier: {
    code: "CA",
    stat: "str",
    base: [20, 5, 2, 5, 6, 0, 7, 9],
    growth: [75, 35, 40, 28, 30, 15, 15],
    terrFactor: "mount",
    ranks: { sword: "E", lance: "D" },
    promotionGains: {
      Paladin: { hp: 2, str: 1, skl: 1, spd: 1,
        def: 2, res: 1, con: 2, move: 1 },
      GreatKnight: { hp: 3, str: 2, skl: 1, spd: 2,
        def: 2, res: 1, con: 4, move: -1 }
    }
  },

  Paladin: {
    code: "PA",
    stat: "str",
    base: [23, 7, 4, 7, 8, 3, 8, 11],
    growth: [70, 25, 30, 18, 25, 12, 20],
    terrFactor: "mount",
    caps: { hp: 60, str: 25, skl: 26, spd: 24,
      lck: 30, def: 25, res: 25, move: 15, con: 25 },
    ranks: { sword: "D", lance: "D" }
  },

  GreatKnight: {
    code: "GK",
    stat: "str",
    base: [21, 8, 4, 6, 11, 3, 6, 13],
    growth: [70, 30, 20, 15, 20, 21, 20],
    terrFactor: "mount",
    caps: { hp: 60, str: 28, skl: 24, spd: 24,
      lck: 30, def: 29, res: 25, move: 15, con: 25 },
    ranks: { sword: "E", lance: "D", axe: "D" }
  },

  Knight: {
    code: "KN",
    stat: "str",
    base: [17, 5, 2, 0, 9, 0, 4, 13],
    growth: [80, 40, 30, 15, 25, 28, 20],
    terrFactor: "armor",
    ranks: { lance: "D" },
    promotionGains: {
      General: { hp: 4, str: 2, skl: 2, spd: 3,
        def: 2, res: 3, con: 2, move: 1 },
      GreatKnight: { hp: 3, str: 2, skl: 1, spd: 2,
        def: 2, res: 1, con: 0, move: 2 }
    }
  },

  General: {
    code: "GE",
    stat: "str",
    base: [21, 8, 4, 3, 13, 3, 5, 15],
    growth: [75, 30, 20, 10, 20, 23, 25],
    terrFactor: "armor",
    caps: { hp: 60, str: 29, skl: 27, spd: 24,
      lck: 30, def: 30, res: 25, move: 15, con: 25 },
    ranks: { sword: "E", lance: "C", axe: "E" }
  },

  Mercenary: {
    code: "ME",
    stat: "str",
    base: [18, 4, 8, 8, 4, 0, 5, 9],
    growth: [80, 40, 40, 32, 30, 18, 20],
    ranks: { sword: "D" },
    promotionGains: {
      Hero: { hp: 4, str: 1, skl: 2, spd: 2,
        def: 2, res: 2, con: 2, move: 1 },
      Ranger: { hp: 3, str: 2, skl: 1, spd: 1,
        def: 3, res: 3, con: 0, move: 2 }
    }
  },

  Hero: {
    code: "HE",
    stat: "str",
    base: [22, 6, 9, 10, 8, 2, 6, 11],
    growth: [75, 30, 30, 20, 25, 20, 20],
    caps: { hp: 60, str: 25, skl: 30, spd: 26,
      lck: 30, def: 25, res: 22, move: 15, con: 25 },
    ranks: { sword: "C", axe: "D" }
  },

  Myrmidon: {
    code: "MY",
    stat: "str",
    base: [16, 4, 9, 9, 2, 0, 5, 8],
    growth: [70, 35, 40, 40, 30, 15, 20],
    ranks: { sword: "D" },
    promotionGains: {
      Swordmaster: { hp: 5, str: 2, skl: 0, spd: 0,
        def: 2, res: 1, con: 1, move: 1 },
      Assassin: { hp: 3, str: 1, skl: 0, spd: 0,
        def: 2, res: 2, con: 0, move: 1 }
    }
  },

  Swordmaster: {
    code: "SM",
    stat: "str",
    base: [21, 6, 11, 10, 5, 2, 6, 9],
    growth: [65, 25, 30, 30, 25, 15, 22],
    caps: { hp: 60, str: 24, skl: 29, spd: 30,
      lck: 30, def: 22, res: 23, move: 15, con: 20 },
    ranks: { sword: "C" }
  },

  Assassin: {
    code: "AS",
    stat: "str",
    base: [16, 3, 1, 9, 2, 0, 6, 8],
    growth: [50, 5, 45, 40, 40, 5, 20],
    caps: { hp: 60, str: 20, skl: 30, spd: 30,
      lck: 30, def: 20, res: 20, move: 15, con: 20 },
    ranks: { sword: "D" }
  },

  Thief: {
    code: "TH",
    stat: "str",
    base: [16, 3, 1, 9, 2, 0, 6, 6],
    growth: [50, 5, 45, 40, 40, 5, 20],
    ranks: { sword: "E" },
    promotionGains: {
      Assassin: { hp: 3, str: 1, skl: 0, spd: 0,
        def: 2, res: 2, con: 2, move: 0 },
      Rogue: { hp: 2, str: 1, skl: 1, spd: 0,
        def: 2, res: 2, con: 1, move: 0 }
    }
  },

  Rogue: {
    code: "RO",
    stat: "str",
    base: [16, 3, 1, 9, 2, 0, 6, 7],
    growth: [50, 10, 45, 35, 40, 5, 20],
    caps: { hp: 60, str: 20, skl: 30, spd: 30,
      lck: 30, def: 20, res: 20, move: 15, con: 20 },
    ranks: { sword: "E" }
  },

  Archer: {
    code: "AR",
    stat: "str",
    base: [18, 4, 3, 3, 3, 0, 5, 7],
    growth: [70, 35, 40, 32, 35, 15, 15],
    ranks: { bow: "D" },
    promotionGains: {
      Sniper: { hp: 3, str: 1, skl: 2, spd: 2,
        def: 2, res: 3, con: 1, move: 1 },
      Ranger: { hp: 3, str: 2, skl: 1, spd: 1,
        def: 3, res: 3, con: 2, move: 2 }
    }
  },

  Sniper: {
    code: "SN",
    stat: "str",
    base: [21, 7, 6, 5, 5, 2, 6, 8],
    growth: [65, 30, 30, 20, 30, 15, 20],
    caps: { hp: 60, str: 25, skl: 30, spd: 28,
      lck: 30, def: 25, res: 23, move: 15, con: 20 },
    ranks: { bow: "C" }
  },

  Ranger: {
    code: "RA",
    stat: "str",
    base: [21, 7, 6, 7, 6, 3, 7, 9],
    growth: [60, 25, 30, 35, 25, 15, 15],
    terrFactor: "mount",
    caps: { hp: 60, str: 25, skl: 28, spd: 30,
      lck: 30, def: 24, res: 23, move: 15, con: 25 },
    ranks: { sword: "D", bow: "D" }
  },

  WyvernRider: {
    code: "WR",
    stat: "str",
    base: [20, 7, 3, 5, 8, 0, 7, 10],
    growth: [80, 45, 35, 30, 25, 25, 15],
    terrFactor: "flier",
    ranks: { lance: "D" },
    promotionGains: {
      WyvernLord: { hp: 4, str: 2, skl: 2, spd: 0,
        def: 2, res: 0, con: 1, move: 1 },
      WyvernKnight: { hp: 3, str: 1, skl: 2, spd: 3,
        def: 0, res: 1, con: 0, move: 1 }
    }
  },

  WyvernLord: {
    code: "WL",
    stat: "str",
    base: [25, 9, 5, 7, 10, 1, 8, 11],
    growth: [75, 40, 30, 20, 20, 20, 17],
    caps: { hp: 60, str: 27, skl: 25, spd: 23,
      lck: 30, def: 28, res: 22, move: 15, con: 25 },
    terrFactor: "flier",
    ranks: { lance: "D", axe: "C" }
  },

  WyvernKnight: {
    code: "WK",
    stat: "str",
    base: [20, 7, 7, 8, 7, 1, 8, 10],
    growth: [65, 35, 30, 30, 25, 15, 17],
    caps: { hp: 60, str: 25, skl: 26, spd: 28,
      lck: 30, def: 24, res: 22, move: 15, con: 25 },
    terrFactor: "flier",
    ranks: { lance: "C" }
  },

  Mage: {
    code: "MA",
    stat: "mag",
    base: [16, 1, 2, 3, 3, 3, 5, 5],
    growth: [55, 55, 40, 35, 20, 5, 30],
    terrFactor: "mage",
    ranks: { anima: "D" },
    promotionGains: {
      Sage: { hp: 4, mag: 1, skl: 0, spd: 0,
        def: 3, res: 3, con: 1, move: 1 },
      MageKnight: { hp: 4, mag: 2, skl: 0, spd: 0,
        def: 2, res: 2, con: 2, move: 2 }
    }
  },

  Sage: {
    code: "SA",
    stat: "mag",
    base: [20, 5, 4, 4, 5, 5, 6, 7],
    growth: [45, 45, 30, 25, 15, 10, 40],
    terrFactor: "mage",
    caps: { hp: 60, mag: 28, skl: 30, spd: 26,
      lck: 30, def: 21, res: 25, move: 15, con: 20 },
    ranks: { anima: "C", staff: "D", light: "D" }
  },

  MageKnight: {
    code: "MK",
    stat: "mag",
    base: [20, 4, 3, 5, 5, 5, 7, 8],
    growth: [45, 40, 30, 40, 30, 10, 40],
    terrFactor: "mount",
    caps: { hp: 60, mag: 24, skl: 26, spd: 25,
      lck: 30, def: 24, res: 25, move: 15, con: 25 },
    ranks: { anima: "C", staff: "D" }
  },

  Monk: {
    code: "MO",
    stat: "mag",
    base: [18, 1, 1, 2, 1, 5, 5, 6],
    growth: [50, 30, 35, 32, 45, 8, 40],
    terrFactor: "mage",
    ranks: { light: "E" },
    promotionGains: {
      Bishop: { hp: 3, mag: 2, skl: 1, spd: 0,
        def: 3, res: 2, con: 1, move: 1 },
      Sage: { hp: 4, mag: 1, skl: 0, spd: 0,
        def: 3, res: 3, con: 1, move: 1 }
    }
  },

  Priest: {
    code: "PR",
    stat: "mag",
    base: [18, 1, 1, 2, 1, 5, 5, 5],
    growth: [50, 30, 35, 32, 45, 8, 50],
    terrFactor: "mage",
    ranks: { staff: "D" },
    promotionGains: {
      Bishop: { hp: 3, mag: 2, skl: 1, spd: 0,
        def: 3, res: 2, con: 2, move: 1 },
      Sage: { hp: 4, mag: 1, skl: 0, spd: 0,
        def: 3, res: 3, con: 2, move: 1 }
    }
  },

  Cleric: {
    code: "CL",
    stat: "mag",
    base: [17, 1, 2, 2, 1, 5, 5, 4],
    growth: [50, 30, 35, 32, 45, 8, 50],
    terrFactor: "mage",
    ranks: { staff: "D" },
    promotionGains: {
      Bishop: { hp: 3, mag: 1, skl: 2, spd: 1,
        def: 2, res: 2, con: 1, move: 1 },
      Valkyrie: { hp: 3, mag: 2, skl: 1, spd: 0,
        def: 2, res: 3, con: 2, move: 2 }
    }
  },

  Bishop: {
    code: "BI",
    stat: "mag",
    base: [21, 4, 4, 4, 3, 8, 6, 7],
    growth: [45, 35, 25, 22, 40, 8, 40],
    terrFactor: "mage",
    caps: { hp: 60, mag: 25, skl: 26, spd: 24,
      lck: 30, def: 22, res: 30, move: 15, con: 20 },
    ranks: { light: "D", staff: "C" }
  },

  Shaman: {
    code: "SH",
    stat: "mag",
    base: [16, 2, 1, 2, 2, 4, 5, 7],
    growth: [50, 50, 32, 30, 20, 10, 30],
    terrFactor: "mage",
    ranks: { dark: "D" },
    promotionGains: {
      Druid: { hp: 4, mag: 0, skl: 0, spd: 3,
        def: 2, res: 2, con: 1, move: 1 },
      Summoner: { hp: 3, mag: 0, skl: 1, spd: 3,
        def: 1, res: 3, con: 1, move: 1 }
    }
  },

  Druid: {
    code: "DR",
    stat: "mag",
    base: [19, 6, 3, 4, 4, 6, 6, 8],
    growth: [45, 55, 30, 25, 20, 10, 35],
    terrFactor: "mage",
    caps: { hp: 60, mag: 29, skl: 26, spd: 26,
      lck: 30, def: 21, res: 28, move: 15, con: 20 },
    ranks: { dark: "D", staff: "C", anima: "E" }
  },

  Summoner: {
    code: "SU",
    stat: "mag",
    base: [18, 5, 3, 4, 3, 5, 6, 8],
    growth: [45, 50, 30, 25, 20, 8, 35],
    terrFactor: "mage",
    caps: { hp: 60, mag: 27, skl: 27, spd: 26,
      lck: 30, def: 20, res: 28, move: 15, con: 20 },
    ranks: { dark: "C", staff: "E" }
  },
  
    Trainee: {
    code: "TN",
    stat: "str",
    base: [14, 3, 1, 2, 1, 0, 4, 7],
    growth: [80, 50, 45, 45, 40, 20, 25],
    ranks: { sword: "E" },
    promotionGains: {
      Mercenary: {
        hp: 2, str: 1, skl: 2, spd: 2,
        def: 1, res: 1, con: 2, move: 1
      },
      Myrmidon: {
        hp: 1, str: 1, skl: 2, spd: 3,
        def: 0, res: 1, con: 1, move: 1
      }
    }
  },
  
    Recruit: {
    code: "RC",
    stat: "str",
    base: [13, 3, 0, 1, 0, 1, 4, 6],
    growth: [75, 45, 40, 40, 40, 25, 35],
    ranks: { lance: "E" },
    promotionGains: {
      Cavalier: {
        hp: 1, str: 0, skl: 2, spd: 2,
        def: 0, res: 2, con: 3, move: 3
      },
      Knight: {
        hp: 2, str: 1, skl: 1, spd: 1,
        def: 2, res: 0, con: 4, move: 0
      }
    }
  },

  Pupil: {
    code: "PU",
    stat: "mag",
    base: [13, 1, 0, 1, 0, 3, 4, 5],
    growth: [55, 55, 40, 35, 40, 10, 30],
    terrFactor: "mage",
    ranks: { light: "E" },
    promotionGains: {
      Mage: {
        hp: 2, mag: 0, skl: 1, spd: 2,
        def: 1, res: 2, con: 1, move: 1
      },
      Shaman: {
        hp: 1, mag: 2, skl: 0, spd: 1,
        def: 1, res: 2, con: 2, move: 1
      },
      Monk: {
        hp: 1, mag: 1, skl: 1, spd: 2,
        def: 1, res: 2, con: 2, move: 1
      }
    }
  },

  Journeyman: {
    code: "JM",
    stat: "str",
    base: [14, 3, 0, 1, 1, 0, 4, 8],
    growth: [85, 55, 40, 32, 40, 18, 20],
    terrFactor: "fighter",
    ranks: { axe: "E" },
    promotionGains: {
      Fighter: { hp: 2, str: 2, skl: 1, spd: 0,
        def: 0, res: 1, con: 3, move: 1 },
      Pirate: { hp: 2, str: 2, skl: 0, spd: 1,
        def: 1, res: 0, con: 2, move: 1 }
    }
  },

  Fighter: {
    code: "FI",
    stat: "str",
    base: [20, 5, 2, 4, 2, 0, 5, 11],
    growth: [85, 55, 35, 30, 15, 15, 15],
    terrFactor: "fighter",
    ranks: { axe: "D" },
    promotionGains: {
      Warrior: { hp: 3, str: 1, skl: 2, spd: 0,
        def: 3, res: 3, con: 2, move: 1 },
      Hero: { hp: 4, str: 1, skl: 2, spd: 2,
        def: 2, res: 2, con: 0, move: 1 }
    }
  },

  Warrior: {
    code: "WA",
    stat: "str",
    base: [28, 8, 5, 6, 5, 0, 6, 13],
    growth: [80, 45, 25, 20, 15, 16, 17],
    terrFactor: "fighter",
    caps: { hp: 60, str: 30, skl: 28, spd: 26,
      lck: 30, def: 26, res: 22, move: 15, con: 25 },
    ranks: { axe: "C", bow: "D" }
  },

  Brigand: {
    code: "BR",
    stat: "str",
    base: [20, 5, 1, 5, 3, 0, 5, 12],
    growth: [82, 50, 30, 20, 15, 10, 13],
    terrFactor: "fighter",
    ranks: { axe: "D" }
  },

  Pirate: {
    code: "PI",
    stat: "str",
    base: [19, 4, 2, 6, 3, 0, 5, 10],
    growth: [75, 50, 35, 25, 15, 10, 13],
    terrFactor: "pirate",
    ranks: { axe: "D" },
    promotionGains: {
      Berserker: { hp: 4, str: 1, skl: 1, spd: 1,
        def: 2, res: 2, con: 3, move: 1 },
      Warrior: { hp: 3, str: 1, skl: 2, spd: 0,
        def: 3, res: 3, con: 3, move: 1 }
    }
  },

  Berserker: {
    code: "BE",
    stat: "str",
    base: [24, 7, 6, 7, 6, 0, 6, 13],
    growth: [75, 50, 35, 25, 15, 10, 13],
    caps: { hp: 60, str: 30, skl: 29, spd: 28,
      lck: 30, def: 23, res: 21, move: 15, con: 25 },
    terrFactor: "pirate",
    ranks: { axe: "C" }
  },

  PegasusKnight: {
    code: "PK",
    stat: "str",
    base: [14, 4, 5, 5, 3, 2, 7, 5],
    growth: [65, 35, 40, 40, 35, 12, 35],
    terrFactor: "flier",
    ranks: { lance: "D" },
    promotionGains: {
      Falcoknight: { hp: 5, str: 2, skl: 0, spd: 2,
        def: 2, res: 2, con: 1, move: 1 },
      WyvernKnight: { hp: 3, str: 2, skl: 1, spd: 2,
        def: 1, res: 1, con: 4, move: 1 }
    }
  },

  Falcoknight: {
    code: "FK",
    stat: "str",
    base: [20, 6, 7, 7, 5, 4, 8, 6],
    growth: [60, 30, 30, 30, 30, 12, 30],
    caps: { hp: 60, str: 23, skl: 25, spd: 28,
      lck: 30, def: 23, res: 26, move: 15, con: 25 },
    terrFactor: "flier",
    ranks: { sword: "E", lance: "C" }
  },

  Troubadour: {
    code: "TR",
    stat: "mag",
    base: [15, 1, 1, 3, 2, 5, 6, 5],
    growth: [50, 25, 35, 55, 45, 12, 40],
    terrFactor: "mount",
    ranks: { staff: "D" },
    promotionGains: {
      Valkyrie: { hp: 3, mag: 2, skl: 1, spd: 0,
        def: 2, res: 3, con: 1, move: 1 },
      MageKnight: { hp: 3, mag: 2, skl: 1, spd: 0,
        def: 2, res: 2, con: 1, move: 1 }
    }
  },

  Valkyrie: {
    code: "VK",
    stat: "mag",
    base: [19, 4, 3, 5, 4, 8, 7, 6],
    growth: [45, 35, 25, 45, 40, 10, 40],
    caps: { hp: 60, mag: 25, skl: 24, spd: 25,
      lck: 30, def: 24, res: 28, move: 15, con: 25 },
    terrFactor: "mount",
    ranks: { anima: "D", staff: "D" }
  },

  Necromancer: {
    code: "NE",
    stat: "mag",
    base: [18, 9, 4, 5, 3, 8, 6, 7],
    growth: [45, 55, 30, 25, 20, 10, 35],
    terrFactor: "mage",
    caps: { hp: 60, mag: 30, skl: 25, spd: 25,
      lck: 30, def: 30, res: 30, move: 15, con: 25 },
    ranks: { dark: "S", staff: "S" }
  },

  Phantom: {
    code: "PH",
    stat: "str",
    base: [1, 5, 2, 4, 0, 0, 5, 11],
    growth: [0, 55, 35, 45, 50, 15, 15],
    terrFactor: "flier",
    caps: { hp: 60, str: 20, skl: 20, spd: 20,
      lck: 30, def: 0, res: 0, move: 15, con: 20 },
    ranks: { sword: "C" }
  },

  Manakete: {
    code: "MK",
    stat: "str",
    base: [20, 0, 0, 2, 1, 1, 6, 25],
    growth: [95, 40, 30, 20, 25, 0, 10],
    terrFactor: "flier",
    caps: { hp: 60, str: 20, skl: 20, spd: 20,
      lck: 30, def: 20, res: 20, move: 15, con: 25 },
    ranks: {}
  },

  // Monster classes

  Revenant: {
    code: "RE",
    stat: "str",
    base: [25, 2, 0, 0, 0, 0, 4, 6],
    growth: [95, 50, 30, 20, 10, 10, 13],
    ranks: {},
    promotionGains: {
      Entombed: { hp: 10, str: 1, skl: 0, spd: 1, def: 0, res: 0, con: 0, move: 1 },
      Mogall: { hp: 0, mag: 0, skl: 2, spd: 2, def: 2, res: 4, con: 0, move: 1 },
      Bael: { hp: 0, str: 2, skl: 3, spd: 3, def: 4, res: 1, con: 4, move: 1 },
      MautheDoog: { hp: 0, str: 1, skl: 5, spd: 5, def: 2, res: 0, con: 0, move: 3 }
    }
  },

  Entombed: {
    code: "EN",
    stat: "str",
    base: [35, 3, 0, 1, 0, 0, 5, 6],
    growth: [85, 40, 25, 17, 50, 10, 13],
    caps: { hp: 60, str: 25, skl: 22, spd: 21,
      lck: 30, def: 24, res: 22, move: 15, con: 25 },
    ranks: {},
    promotionGains: {
      Cyclops: { hp: 5, str: 3, skl: 4, spd: 4, def: 6, res: 0, con: 5, move: 0 }
    }
  },

  Bonewalker: {
    code: "BW",
    stat: "str",
    base: [20, 4, 2, 3, 3, 0, 5, 7],
    growth: [80, 50, 30, 20, 10, 12, 15],
    ranks: { sword: "C", lance: "C" },
    promotionGains: {
      Wight: { hp: 4, str: 3, skl: 3, spd: 3, def: 2, res: 2, con: 2, move: 1 },
      Gargoyle: { hp: 0, str: 2, skl: 1, spd: 3, def: 3, res: 0, con: 1, move: 1 },
      Tarvos: { hp: 1, str: 2, skl: 0, spd: 2, def: 4, res: 0, con: 3, move: 2 }
    }
  },

  Wight: {
    code: "WI",
    stat: "str",
    base: [21, 7, 5, 6, 5, 2, 6, 9],
    growth: [65, 25, 25, 20, 10, 15, 22],
    caps: { hp: 60, str: 24, skl: 28, spd: 26,
      lck: 30, def: 22, res: 23, move: 15, con: 25 },
    ranks: { sword: "A", lance: "A" },
    promotionGains: {
      Cyclops: { hp: 8, str: 1, skl: 0, spd: 0, def: 5, res: 0, con: 5, move: 0 }
    }
  },

  Bael: {
    code: "BA",
    stat: "str",
    base: [25, 6, 3, 3, 6, 1, 5, 12],
    growth: [82, 50, 30, 20, 15, 18, 13],
    terrFactor: "spider",
    caps: { hp: 60, str: 30, skl: 28, spd: 26,
      lck: 30, def: 26, res: 22, move: 15, con: 25 },
    ranks: {},
    promotionGains: {
  ElderBael: { hp: 11, str: 2, skl: 2, spd: 2, def: 3, res: 3, con: 3, move: 1 }
}
  },

  ElderBael: {
    code: "EB",
    stat: "str",
    base: [36, 8, 5, 5, 9, 4, 6, 15],
    growth: [85, 45, 25, 20, 10, 21, 17],
    terrFactor: "spider",
    caps: { hp: 60, str: 30, skl: 28, spd: 26,
      lck: 30, def: 26, res: 22, move: 15, con: 25 },
    ranks: {}
  },

  Cyclops: {
    code: "CY",
    stat: "str",
    base: [40, 8, 5, 6, 13, 0, 5, 16],
    growth: [95, 30, 35, 25, 10, 24, 25],
    terrFactor: "fighter",
    caps: { hp: 60, str: 29, skl: 29, spd: 28,
      lck: 30, def: 30, res: 25, move: 15, con: 25 },
    ranks: { axe: "A" }
  },

  MautheDoog: {
    code: "MD",
    stat: "str",
    base: [16, 4, 10, 10, 2, 0, 7, 6],
    growth: [70, 35, 45, 45, 30, 15, 20],
    ranks: {},
    promotionGains: {
  Gwyllgi: { hp: 5, str: 2, skl: 2, spd: 2, def: 3, res: 2, con: 2, move: 1 }
}
  },

  Gwyllgi: {
    code: "GW",
    stat: "str",
    base: [21, 6, 12, 12, 5, 2, 8, 8],
    growth: [65, 28, 35, 35, 25, 16, 22],
    caps: { hp: 60, str: 24, skl: 29, spd: 30,
      lck: 30, def: 22, res: 23, move: 15, con: 20 },
    ranks: {}
  },

  Tarvos: {
    code: "TA",
    stat: "str",
    base: [21, 6, 2, 5, 7, 0, 7, 10],
    growth: [80, 35, 40, 28, 10, 15, 15],
    ranks: { axe: "C" },
    promotionGains: {
  Maelduin: { hp: 4, str: 2, skl: 2, spd: 2, def: 2, res: 3, con: 2, move: 1 }
}
  },

  Maelduin: {
    code: "MAE",
    stat: "str",
    base: [25, 8, 4, 7, 9, 3, 8, 12],
    growth: [75, 30, 30, 18, 10, 13, 20],
    caps: { hp: 60, str: 25, skl: 26, spd: 24,
      lck: 30, def: 25, res: 25, move: 15, con: 25 },
    ranks: { bow: "A", axe: "A" }
  },

  Mogall: {
    code: "MO",
    stat: "mag",
    base: [15, 2, 1, 2, 2, 4, 5, 4],
    growth: [50, 45, 32, 30, 30, 10, 28],
    terrFactor: "flier",
    ranks: { dark: "C" },
    promotionGains: {
      ArchMogall: { hp: 2, mag: 4, skl: 4, spd: 3, def: 1, res: 3, con: 1, move: 1 },
      Gorgon: { hp: 4, mag: 4, skl: 2, spd: 2, def: 3, res: 3, con: 5, move: 1 }
    }
  },

  ArchMogall: {
    code: "AM",
    stat: "mag",
    base: [17, 6, 3, 3, 3, 7, 6, 5],
    growth: [45, 55, 30, 40, 20, 10, 28],
    terrFactor: "flier",
    caps: { hp: 60, mag: 29, skl: 26, spd: 26,
      lck: 30, def: 20, res: 29, move: 15, con: 20 },
    ranks: { dark: "A" }
  },

  GorgonEgg: {
    code: "GEG",
    stat: "mag",
    base: [50, 0, 0, 0, 10, 10, 0, 6],
    growth: [100, 0, 0, 0, 0, 0, 0],
    caps: { hp: 60, mag: 30, skl: 30, spd: 30,
      lck: 30, def: 30, res: 30, move: 15, con: 30 },
    ranks: {}
  },

  Gorgon: {
    code: "GO",
    stat: "mag",
    base: [19, 8, 3, 4, 5, 7, 6, 11],
    growth: [45, 55, 30, 25, 20, 10, 28],
    caps: { hp: 60, mag: 29, skl: 26, spd: 26,
      lck: 30, def: 21, res: 28, move: 15, con: 25 },
    ranks: { dark: "A" }
  },

  Gargoyle: {
    code: "GA",
    stat: "str",
    base: [19, 6, 3, 6, 6, 0, 6, 8],
    growth: [65, 35, 30, 30, 25, 15, 20],
    terrFactor: "flier",
    ranks: { lance: "C" },
    promotionGains: {
      Deathgoyle: { hp: 4, str: 2, skl: 2, spd: 2, def: 3, res: 1, con: 3, move: 1 }
    }
  },

  Deathgoyle: {
    code: "DG",
    stat: "str",
    base: [23, 8, 5, 8, 9, 1, 7, 11],
    growth: [65, 35, 30, 30, 25, 15, 20],
    caps: { hp: 60, str: 27, skl: 25, spd: 23,
      lck: 30, def: 28, res: 22, move: 15, con: 25 },
    terrFactor: "flier",
    ranks: { lance: "A" }
  },

  DracoZombie: {
    code: "DZ",
    stat: "str",
    base: [53, 1, 0, 1, 0, 3, 5, 25],
    growth: [100, 0, 0, 0, 0, 0, 0],
    caps: { hp: 60, str: 50, skl: 50, spd: 50,
      lck: 30, def: 50, res: 50, move: 15, con: 25 },
    ranks: {}
  },

  DemonKing: {
    code: "DK",
    stat: "str",
    base: [60, 23, 20, 18, 25, 25, 2, 25],
    growth: [100, 0, 0, 0, 0, 0, 0],
    caps: { hp: 60, str: 50, skl: 50, spd: 50,
      lck: 30, def: 50, res: 50, move: 15, con: 25 },
    ranks: {}
  }
};

// Standard maximum stats for classes not given a unique cap.
const DEFAULT_CAPS = {
  foot: FOOT_CAPS,
  mount: MOUNTED_CAPS,
  flier: MOUNTED_CAPS,
  pirate: FOOT_CAPS
};

// Builds a distinct subclass for each entry in CLASS_DATA.
function createUnitClass(className, data) {
  return class extends Unit {
    constructor(team, name = className) {
      super(name, team);

      this.className = className;
      this.icon = data.code ?? className;
      this.terrFactor = data.terrFactor ?? "foot";
      this.move = data.base[6];

      const [hp, sm, skl, spd, def, res, move, con] = data.base;
      const stat = data.stat;

      this.maxHp = hp;
      this.hp = hp;

      if (stat === "mag") {
        this.mag = sm;
      } else {
        this.str = sm;
      }

      this.skl = skl;
      this.spd = spd;
      this.def = def;
      this.res = res;
      this.con = con;

      const [gHp, gSm, gSkl, gSpd, gLck, gDef, gRes] =
        data.growth ?? [0, 0, 0, 0, 0, 0, 0];

      this.growthRates = {
        hp: gHp,
        [stat]: gSm,
        skl: gSkl,
        spd: gSpd,
        lck: gLck,
        def: gDef,
        res: gRes
      };

      this.baseStats = {
        hp,
        [stat]: sm,
        skl,
        spd,
        def,
        res,
        lck: 0,
        move,
        con
      };

      const caps = data.caps ??
        DEFAULT_CAPS[this.terrFactor] ??
        FOOT_CAPS;

      this.maxStats = { ...caps };

      if (stat === "mag") {
        this.maxStats.mag = caps.mag ?? caps.str;
        delete this.maxStats.str;
      } else {
        this.maxStats.str = caps.str;
        delete this.maxStats.mag;
      }

      this.promotionGains = data.promotionGains ?? {};
      this.weaponRanks = { ...(data.ranks ?? {}) };

      for (const weapon in this.weaponRanks) {
  const rank = this.weaponRanks[weapon];

  this[weapon] = rank;
  this.weaponExp[weapon] =
    WEAPON_RANK_THRESHOLDS[rank] ?? 0;
}

  giveDefaultWeapon(this);

    }
  };
}

// Export each class as a usable constructor.
export const Lord = createUnitClass("Lord", CLASS_DATA.Lord);
export const GreatLord = createUnitClass("GreatLord", CLASS_DATA.GreatLord);
export const Dancer = createUnitClass("Dancer", CLASS_DATA.Dancer);
export const Soldier = createUnitClass("Soldier", CLASS_DATA.Soldier);
export const Cavalier = createUnitClass("Cavalier", CLASS_DATA.Cavalier);
export const Paladin = createUnitClass("Paladin", CLASS_DATA.Paladin);
export const GreatKnight = createUnitClass("GreatKnight", CLASS_DATA.GreatKnight);
export const Knight = createUnitClass("Knight", CLASS_DATA.Knight);
export const General = createUnitClass("General", CLASS_DATA.General);
export const Mercenary = createUnitClass("Mercenary", CLASS_DATA.Mercenary);
export const Hero = createUnitClass("Hero", CLASS_DATA.Hero);
export const Myrmidon = createUnitClass("Myrmidon", CLASS_DATA.Myrmidon);
export const Swordmaster = createUnitClass("Swordmaster", CLASS_DATA.Swordmaster);
export const Assassin = createUnitClass("Assassin", CLASS_DATA.Assassin);
export const Thief = createUnitClass("Thief", CLASS_DATA.Thief);
export const Rogue = createUnitClass("Rogue", CLASS_DATA.Rogue);
export const Archer = createUnitClass("Archer", CLASS_DATA.Archer);
export const Sniper = createUnitClass("Sniper", CLASS_DATA.Sniper);
export const Ranger = createUnitClass("Ranger", CLASS_DATA.Ranger);
export const WyvernRider = createUnitClass("WyvernRider", CLASS_DATA.WyvernRider);
export const WyvernLord = createUnitClass("WyvernLord", CLASS_DATA.WyvernLord);
export const WyvernKnight = createUnitClass("WyvernKnight", CLASS_DATA.WyvernKnight);
export const Mage = createUnitClass("Mage", CLASS_DATA.Mage);
export const Sage = createUnitClass("Sage", CLASS_DATA.Sage);
export const MageKnight = createUnitClass("MageKnight", CLASS_DATA.MageKnight);
export const Monk = createUnitClass("Monk", CLASS_DATA.Monk);
export const Priest = createUnitClass("Priest", CLASS_DATA.Priest);
export const Cleric = createUnitClass("Cleric", CLASS_DATA.Cleric);
export const Bishop = createUnitClass("Bishop", CLASS_DATA.Bishop);
export const Shaman = createUnitClass("Shaman", CLASS_DATA.Shaman);
export const Druid = createUnitClass("Druid", CLASS_DATA.Druid);
export const Summoner = createUnitClass("Summoner", CLASS_DATA.Summoner);
export const Trainee = createUnitClass("Trainee", CLASS_DATA.Trainee);
export const Recruit = createUnitClass("Recruit", CLASS_DATA.Recruit);
export const Pupil = createUnitClass("Pupil", CLASS_DATA.Pupil);
export const Journeyman = createUnitClass("Journeyman", CLASS_DATA.Journeyman);
export const Fighter = createUnitClass("Fighter", CLASS_DATA.Fighter);
export const Warrior = createUnitClass("Warrior", CLASS_DATA.Warrior);
export const Brigand = createUnitClass("Brigand", CLASS_DATA.Brigand);
export const Pirate = createUnitClass("Pirate", CLASS_DATA.Pirate);
export const Berserker = createUnitClass("Berserker", CLASS_DATA.Berserker);
export const PegasusKnight = createUnitClass("PegasusKnight", CLASS_DATA.PegasusKnight);
export const Falcoknight = createUnitClass("Falcoknight", CLASS_DATA.Falcoknight);
export const Troubadour = createUnitClass("Troubadour", CLASS_DATA.Troubadour);
export const Valkyrie = createUnitClass("Valkyrie", CLASS_DATA.Valkyrie);
export const Necromancer = createUnitClass("Necromancer", CLASS_DATA.Necromancer);
export const Phantom = createUnitClass("Phantom", CLASS_DATA.Phantom);
export const Manakete = createUnitClass("Manakete", CLASS_DATA.Manakete);
export const Revenant = createUnitClass("Revenant", CLASS_DATA.Revenant);
export const Entombed = createUnitClass("Entombed", CLASS_DATA.Entombed);
export const Bonewalker = createUnitClass("Bonewalker", CLASS_DATA.Bonewalker);
export const Wight = createUnitClass("Wight", CLASS_DATA.Wight);
export const Bael = createUnitClass("Bael", CLASS_DATA.Bael);
export const ElderBael = createUnitClass("ElderBael", CLASS_DATA.ElderBael);
export const Cyclops = createUnitClass("Cyclops", CLASS_DATA.Cyclops);
export const MautheDoog = createUnitClass("MautheDoog", CLASS_DATA.MautheDoog);
export const Gwyllgi = createUnitClass("Gwyllgi", CLASS_DATA.Gwyllgi);
export const Tarvos = createUnitClass("Tarvos", CLASS_DATA.Tarvos);
export const Maelduin = createUnitClass("Maelduin", CLASS_DATA.Maelduin);
export const Mogall = createUnitClass("Mogall", CLASS_DATA.Mogall);
export const ArchMogall = createUnitClass("ArchMogall", CLASS_DATA.ArchMogall);
export const GorgonEgg = createUnitClass("GorgonEgg", CLASS_DATA.GorgonEgg);
export const Gorgon = createUnitClass("Gorgon", CLASS_DATA.Gorgon);
export const Gargoyle = createUnitClass("Gargoyle", CLASS_DATA.Gargoyle);
export const Deathgoyle = createUnitClass("Deathgoyle", CLASS_DATA.Deathgoyle);
export const DracoZombie = createUnitClass("DracoZombie", CLASS_DATA.DracoZombie);
export const DemonKing = createUnitClass("DemonKing", CLASS_DATA.DemonKing);