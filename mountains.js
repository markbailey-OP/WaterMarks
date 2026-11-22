export const MAP_LAYOUT = `
$	F	F	O	F	F	#	T	.	.	.	.	T	T	O	T	T	.	T	T	M	M	M	P	P	P	P	O
F	H	F	F	F	F	#	.	.	.	.	T	T	T	T	T	T	.	.	T	M	M	M	P	P	P	P	P
F	F	O	O	F	F	#	.	.	T	.	.	T	T	T	T	T	T	.	T	M	M	M	M	P	P	P	P
O	F	O	O	F	F	F	.	.	.	.	.	T	.	.	.	T	.	.	T	M	M	M	M	M	P	P	P
F	F	F	F	F	F	#	.	.	.	.	.	.	T	.	.	.	.	.	T	M	M	M	M	M	M	P	P
F	F	F	F	F	F	#	.	.	.	.	.	.	.	T	.	.	.	.	T	M	M	M	M	M	M	M	M
#	#	#	F	#	#	#	.	.	T	.	.	.	.	.	.	.	T	T	T	S	M	M	M	M	M	M	M
.	.	.	.	.	.	.	.	.	.	.	.	T	.	.	.	T	T	T	T	S	S	M	M	M	M	M	M
.	T	.	.	.	.	.	.	.	.	.	.	.	.	.	.	T	T	T	S	S	S	S	S	S	S	S	S
.	.	.	.	.	T	.	.	.	.	.	.	.	.	.	.	T	T	S	S	S	S	S	S	S	S	S	S
.	.	.	T	.	.	.	.	T	.	T	.	.	O	.	.	T	T	S	S	S	S	S	S	S	S	S	S
.	.	.	.	.	.	.	.	.	.	.	.	#	#	#	.	T	T	S	S	S	S	S	S	S	S	S	S
.	.	.	.	.	.	.	.	.	.	.	.	.	.	.	.	T	T	S	S	S	S	S	S	S	S	S	S
M	M	M	S	M	M	M	M	M	M	M	M	M	.	.	M	M	M	S	D	D	D	D	S	D	D	S	S
M	M	M	S	M	M	M	M	M	M	M	M	M	.	.	M	M	M	M	D	S	D	D	D	D	D	D	S
P	P	P	S	P	P	P	P	P	P	P	P	P	.	.	P	P	M	M	D	D	D	D	D	D	S	D	D
P	P	P	S	P	P	P	P	P	P	P	P	P	.	.	P	P	M	M	D	D	D	D	D	D	D	D	D
M	M	M	S	M	M	M	M	M	M	M	P	P	.	.	P	P	M	M	D	D	D	D	D	D	D	D	D
M	M	M	S	M	M	M	M	M	M	M	P	P	.	.	P	P	M	M	D	D	D	D	D	D	D	D	D
D	D	D	O	M	D	D	D	D	M	M	P	P	.	.	P	P	M	M	D	D	D	D	D	D	D	D	D
D	D	D	M	D	D	D	D	D	M	M	P	P	.	.	P	P	M	M	D	D	D	D	D	D	D	D	D
D	D	D	D	D	D	D	D	D	M	M	P	P	.	.	P	P	M	M	D	D	D	D	D	M	D	D	D
D	D	D	D	D	D	D	D	D	M	M	P	P	.	.	P	P	M	M	D	D	D	D	M	O	D	D	D
D	D	D	D	D	D	D	D	D	M	M	P	P	.	.	P	P	M	M	M	M	M	M	M	S	M	M	M
D	D	D	D	D	D	D	D	D	M	M	P	P	.	.	P	P	M	M	M	M	M	M	M	S	M	M	M
D	D	D	D	D	D	D	D	D	M	M	P	P	.	.	P	P	P	P	P	P	P	P	P	S	P	P	P
D	D	S	D	D	D	D	D	D	M	M	P	P	.	.	P	P	P	P	P	P	P	P	P	S	P	P	P
S	D	D	D	D	D	D	S	D	M	M	M	M	.	.	M	M	M	M	M	M	M	M	M	S	M	M	M
S	S	D	D	S	D	D	D	D	S	M	M	M	.	.	M	M	M	M	M	M	M	M	M	S	M	M	M
S	S	S	S	S	S	S	S	S	S	T	T	.	.	.	.	.	.	.	.	.	.	.	.	.	.	.	.
S	S	S	S	S	S	S	S	S	S	T	T	.	#	#	#	.	.	.	.	.	.	.	.	.	.	.	.
S	S	S	S	S	S	S	S	S	S	T	T	.	.	O	.	.	.	.	.	.	.	.	.	T	.	.	.
S	S	S	S	S	S	S	S	S	S	T	T	.	.	.	.	.	T	.	T	.	.	.	.	.	.	.	.
S	S	S	S	S	S	S	S	S	T	T	T	.	.	.	.	.	.	.	.	.	.	T	.	.	.	.	.
S	S	S	S	S	S	S	S	S	T	T	T	.	.	.	T	.	.	.	.	.	.	.	.	.	.	T	.
M	M	M	M	M	M	S	S	T	T	T	T	.	.	.	.	.	.	.	.	.	.	.	.	.	.	.	.
M	M	M	M	M	M	M	S	T	T	T	.	.	.	.	.	.	.	T	.	.	#	#	#	F	#	#	#
M	M	M	M	M	M	M	M	T	.	.	.	.	T	.	.	.	.	.	.	.	#	F	F	F	F	F	F
P	P	M	M	M	M	M	M	T	.	.	.	.	.	T	.	.	.	.	.	.	#	F	F	F	F	F	F
P	P	P	M	M	M	M	M	T	.	.	.	T	.	.	T	.	.	.	.	.	F	F	F	O	O	F	O
P	P	P	P	M	M	M	M	T	.	T	T	T	T	T	T	.	.	T	.	.	#	F	F	O	O	F	F
P	P	P	P	P	M	M	M	T	.	.	T	T	T	T	T	T	.	.	.	.	#	F	F	F	F	H	F
O	P	P	P	P	M	M	M	T	T	.	T	T	O	T	T	.	.	.	.	T	#	F	F	O	F	F	$
`;

// Starting owners (team 1 = Blue, team 2 = Red).
// Forts within walls belong to the team of the lord.
// Corner and middle-of-map forts are neutral (unowned).
export const STRONGHOLD_OWNERS = [
  // Team 1 (Blue) Throne & Forts within walls
  { x: 1, y: 1, team: 1 },  // Throne
  { x: 3, y: 0, team: 1 },   
  { x: 0, y: 3, team: 1 },  
  { x: 2, y: 2, team: 1 },  
  { x: 3, y: 2, team: 1 },  
  { x: 2, y: 3, team: 1 },   
  { x: 3, y: 3, team: 1 },  

  // Team 2 (Red) Throne & Forts within walls
  { x: 26, y: 41, team: 2 }, // Throne
  { x: 24, y: 39, team: 2 },  // 
  { x: 25, y: 39, team: 2 }, // 
  { x: 24, y: 40, team: 2 },  // 
  { x: 25, y: 40, team: 2 },  //
  { x: 27, y: 39, team: 2 },  
  { x: 24, y: 42, team: 2 },
  
    // Team 3 (Green): 
  { x: 14,  y: 0,  team: 3 },
  { x: 27,  y: 0, team: 3 },
  { x: 0, y: 42,  team: 3 },
  { x: 3, y: 19, team: 3 },
  { x: 24, y: 22, team: 3 },
  { x: 13, y: 42, team: 3 },
];

// Starting units:
export const STARTING_UNITS = [
  // Team 1 (Blue)
  { x: 1, y: 1, unit: "Lord", team: 1 },
  
  { x: 3, y: 3, unit: "Trainee", team: 1 },
  { x: 2, y: 3, unit: "Journeyman", team: 1 },
  { x: 3, y: 2, unit: "Recruit", team: 1 },
  { x: 2, y: 2, unit: "Pupil", team: 1 },
  { x: 3, y: 0, unit: "Cleric", team: 1 },
  { x: 0, y: 3, unit: "Archer", team: 1 },

  // Team 2 (Red)
  { x: 26, y: 41, unit: "Lord", team: 2 },
  
  { x: 24, y: 39, unit: "Trainee", team: 2 },
  { x: 25, y: 39, unit: "Journeyman", team: 2 },
  { x: 24, y: 40, unit: "Recruit", team: 2 },
  { x: 25, y: 40, unit: "Pupil", team: 2 },
  { x: 24, y: 42, unit: "Cleric", team: 2 },
  { x: 27, y: 39, unit: "Archer", team: 2 },
  
    // Team 3 (Green), CPU
  { x: 14,  y: 0,  unit: "Bonewalker", team: 3, level: 1, ai: "attack" },
  { x: 14,  y: 1,  unit: "Wight", team: 3, level: 5, ai: "defend",
    promotedFrom: "Bonewalker", fromLevel: 15,
    items: [{ name: "SolarBrace", plunder: true }, "KillingEdge", "Spear"] },
  { x: 26,  y: 1, unit: "Cyclops", team: 3, level: 15, ai: "defend",
    items: [{ name: "LunarBrace", plunder: true }, "KillerAxe", "Tomahawk"] },
  { x: 27, y: 0,  unit: "Bael", team: 3, level: 1, ai: "attack", items: ["SharpClaw"] },
  { x: 3, y: 19,  unit: "Mogall", team: 3, level: 1, ai: "attack", },
  { x: 2, y: 23, unit: "Gorgon", team: 3, level: 3, ai: "defend", items: ["Shadowshot", "DemonSurge"] },
  
  { x: 13,  y: 42,  unit: "Bonewalker", team: 3, level: 1, ai: "attack" },
  { x: 13,  y: 41,  unit: "Wight", team: 3, level: 5, ai: "defend",
    promotedFrom: "Bonewalker", fromLevel: 15,
    items: [{ name: "SolarBrace", plunder: true }, "KillingEdge", "Spear"] },
  { x: 1,  y: 41, unit: "Cyclops", team: 3, level: 15, ai: "defend",
    items: [{ name: "LunarBrace", plunder: true }, "KillerAxe", "Tomahawk"] },
  { x: 0, y: 42,  unit: "Bael", team: 3, level: 1, ai: "attack", items: ["SharpClaw"] },
  { x: 24, y: 22,  unit: "Mogall", team: 3, level: 1, ai: "attack", },
  { x: 25, y: 18, unit: "Gorgon", team: 3, level: 3, ai: "defend", items: ["Shadowshot", "DemonSurge"] }
];