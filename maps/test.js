export const MAP_LAYOUT = `
O	P	P	M	M	D	#	F	F	$	H	F	F	#	.	.	.	T	T	O
P	P	M	M	D	D	W	F	O	F	F	O	F	W	.	.	T	T	T	T
P	M	M	D	D	D	#	F	O	O	O	O	F	#	T	.	.	.	T	T
M	M	D	D	D	S	#	F	F	F	F	F	F	#	.	.	T	.	.	.
M	D	D	D	D	S	#	#	#	F	F	#	#	#	.	T	.	.	.	.
D	D	D	D	S	S	F	F	F	F	F	F	F	F	.	T	.	.	T	.
S	M	D	D	M	M	#	#	#	W	W	#	#	#	.	.	T	.	.	.
S	S	M	D	M	M	M	L	L	~	~	L	L	.	T	.	.	.	.	.
S	S	S	D	D	D	D	L	.	G	G	.	L	.	.	.	.	.	T	.
S	G	S	D	S	S	S	L	.	M	M	.	L	~	~	~	B	~	~	~
~	~	~	B	~	~	~	L	.	M	M	.	L	.	.	.	.	.	G	.
S	S	S	D	S	S	S	L	.	G	G	.	L	.	T	.	.	.	.	.
S	S	M	D	M	M	M	L	L	~	~	L	L	.	.	.	T	.	.	.
S	M	D	D	M	M	#	#	#	W	W	#	#	#	.	.	.	.	.	.
D	D	D	D	S	S	F	F	F	F	F	F	F	F	.	T	.	.	T	.
M	D	D	D	D	S	#	#	#	F	F	#	#	#	.	T	.	.	.	.
M	M	D	D	D	S	#	F	F	F	F	F	F	#	.	.	T	.	.	.
P	M	M	D	D	D	#	F	O	O	O	O	F	#	T	.	.	.	T	T
P	P	M	M	D	D	W	F	O	F	F	O	F	W	.	.	T	T	T	T
O	P	P	M	M	D	#	F	F	$	H	F	F	#	.	.	.	T	T	O
`;

// Starting owners (team 1 = Blue, team 2 = Red).
// Forts within walls belong to the team of the lord.
// Corner and middle-of-map forts are neutral (unowned).
export const STRONGHOLD_OWNERS = [
  // Team 1 (Blue) Throne & Forts within walls
  { x: 10, y: 0, team: 1 },  // Throne
  { x: 8, y: 1, team: 1 },   // Flanking Fort (West)
  { x: 11, y: 1, team: 1 },  // Flanking Fort (East)
  { x: 9, y: 2, team: 1 },   // Adjacent Fort (West)
  { x: 10, y: 2, team: 1 },  // Adjacent Fort (East)
  { x: 8, y: 2, team: 1 },   
  { x: 11, y: 2, team: 1 },  

  // Team 2 (Red) Throne & Forts within walls
  { x: 10, y: 19, team: 2 }, // Throne
  { x: 8, y: 18, team: 2 },  // Flanking Fort (West)
  { x: 11, y: 18, team: 2 }, // Flanking Fort (East)
  { x: 8, y: 17, team: 2 },  // Adjacent Fort (West)
  { x: 9, y: 17, team: 2 },  // Adjacent Fort (East)
  { x: 10, y: 17, team: 2 },  
  { x: 11, y: 17, team: 2 },
  
    // Team 3 (Green): corner forts
  { x: 0,  y: 0,  team: 3 },
  { x: 0,  y: 19, team: 3 },
  { x: 19, y: 0,  team: 3 },
  { x: 19, y: 19, team: 3 },
];

// Starting units:
// - Lords start on their throne tiles.
// - Each player's forts have:
//   - A Pupil and a Journeyman on the adjacent forts (x=9 and x=10).
//   - A Recruit on one flanking fort (x=11). Cleric on the other (x=8)
export const STARTING_UNITS = [
  // Team 1 (Blue)
  { x: 10, y: 0, unit: "Lord", team: 1 },
  
  { x: 9, y: 2, unit: "Trainee", team: 1 },
  { x: 10, y: 2, unit: "Journeyman", team: 1 },
  { x: 8, y: 1, unit: "Cleric", team: 1 },
  { x: 11, y: 1, unit: "Archer", team: 1 },
  { x: 8, y: 2, unit: "Pupil", team: 1 },
  { x: 11, y: 2, unit: "Recruit", team: 1 },

  // Team 2 (Red)
  { x: 10, y: 19, unit: "Lord", team: 2 },
  
  { x: 8, y: 17, unit: "Pupil", team: 2 },
  { x: 9, y: 17, unit: "Trainee", team: 2 },
  { x: 8, y: 18, unit: "Cleric", team: 2 },
  { x: 11, y: 18, unit: "Archer", team: 2 },
  { x: 10, y: 17, unit: "Journeyman", team: 2 },
  { x: 11, y: 17, unit: "Recruit", team: 2 },
  
    // Team 3 (Green), CPU defend
  { x: 0,  y: 0,  unit: "Berserker", team: 3, level: 1, ai: "defend",
    promotedFrom: "Pirate", fromLevel: 10,
    items: [{ name: "LunarBrace", plunder: true }, "KillerAxe", "Tomahawk"], ranks: { axe: "A" } },
  { x: 0,  y: 19, unit: "Berserker", team: 3, level: 1, ai: "defend",
    promotedFrom: "Pirate", fromLevel: 10,
    items: [{ name: "LunarBrace", plunder: true }, "KillerAxe", "Tomahawk"], ranks: { axe: "A" } },
  { x: 19, y: 0,  unit: "WyvernLord", team: 3, level: 1, ai: "defend",
    promotedFrom: "WyvernRider", fromLevel: 10,
    items: [{ name: "SolarBrace", plunder: true }, "ShortSpear", "SilverLance"], ranks: { lance: "A" } },
  { x: 19, y: 19, unit: "WyvernLord", team: 3, level: 1, ai: "defend",
    promotedFrom: "WyvernRider", fromLevel: 10,
    items: [{ name: "SolarBrace", plunder: true }, "ShortSpear", "SilverLance"], ranks: { lance: "A" } }
];
