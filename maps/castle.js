export const MAP_LAYOUT = `
O	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	h	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	O
F	F	F	F	F	F	F	F	F	F	O	F	F	F	F	F	O	H	O	F	F	F	F	F	O	F	F	F	F	F	F	F	F	F	F
F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	$	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F	F
F	F	#	F	F	#	#	#	F	#	#	#	F	#	#	#	F	F	F	#	#	#	F	#	#	#	F	#	#	#	F	F	#	F	F
F	F	#	F	F	#	.	.	.	.	.	.	.	.	.	#	F	F	F	#	.	.	.	.	.	.	.	.	.	#	F	F	#	F	F
F	F	#	F	F	#	.	.	.	.	.	.	.	.	.	#	F	F	F	#	.	.	.	.	.	.	.	.	.	#	F	F	#	F	F
F	F	#	F	F	#	.	.	.	L	L	L	.	.	.	#	F	F	F	#	.	.	.	L	L	L	.	.	.	#	F	F	#	F	F
F	F	#	F	F	#	.	.	L	L	L	L	L	.	.	#	F	F	F	#	.	.	L	L	L	L	L	.	.	#	F	F	#	F	F
F	F	#	F	F	#	T	.	L	L	L	L	L	.	.	#	F	F	F	#	.	.	L	L	L	L	L	.	T	#	F	F	#	F	F
F	F	#	F	F	#	.	.	L	L	L	L	L	.	.	#	#	#	#	#	.	.	L	L	L	L	L	.	.	#	F	F	#	F	F
F	F	#	F	F	#	.	.	~	L	L	L	.	.	.	.	.	.	.	.	.	.	.	L	L	L	.	.	.	#	F	F	#	F	F
F	F	#	F	F	#	.	.	~	.	T	.	.	.	.	T	.	.	.	.	.	.	.	~	T	.	.	.	.	#	F	F	#	F	F
#	W	#	F	F	#	.	.	~	.	.	.	.	.	.	.	.	.	.	.	.	.	.	~	.	.	.	.	.	#	F	F	#	W	#
.	.	.	.	.	.	.	.	~	.	.	.	.	.	.	.	.	.	.	.	T	.	.	~	.	.	.	.	.	.	.	.	.	T	.
.	.	.	.	.	.	.	~	~	.	.	T	.	T	T	.	.	.	T	.	.	.	.	~	.	.	.	T	.	.	.	.	.	.	T
.	.	T	.	.	.	.	~	.	.	.	.	.	.	.	.	.	.	.	.	.	.	.	~	~	.	.	.	.	.	.	.	.	.	.
.	.	.	.	.	.	~	~	.	.	.	.	.	.	.	.	.	.	.	.	.	.	.	T	~	.	.	.	.	.	.	.	.	.	.
.	.	.	T	~	~	~	.	.	.	.	.	T	.	.	.	.	T	.	.	.	.	.	.	~	.	.	.	.	T	.	.	.	.	.
~	~	~	~	~	.	.	.	T	.	.	.	.	.	.	.	T	.	T	.	.	.	.	.	~	~	.	.	.	T	T	.	.	.	.
.	.	.	.	.	T	.	.	.	T	.	.	.	.	.	.	.	.	.	.	.	.	T	.	.	~	.	.	.	.	.	.	.	.	.
.	.	.	.	.	.	.	.	T	T	.	.	.	.	.	.	T	T	.	.	.	.	T	.	.	~	~	.	.	.	.	.	.	.	.
T	.	.	.	.	.	.	.	.	.	.	T	.	.	.	.	.	T	T	.	.	.	T	.	.	.	~	.	.	.	.	.	.	.	T
M	M	M	M	M	M	.	.	.	.	.	T	T	.	.	.	.	.	.	.	.	.	.	.	.	.	~	T	.	M	M	M	M	M	M
O	.	.	C	M	M	M	M	M	M	.	.	.	.	.	.	.	.	.	.	.	.	.	.	.	M	M	M	M	M	M	C	.	.	O
M	.	.	.	.	.	T	T	.	T	.	.	.	.	.	.	.	.	.	.	.	T	T	.	.	T	T	T	T	.	.	.	.	.	M
M	M	M	M	M	M	T	T	T	T	.	.	.	T	#	#	#	#	#	#	#	.	.	.	.	.	T	T	T	M	M	M	M	M	M
P	P	P	P	M	M	M	.	T	.	.	.	.	.	.	O	.	h	.	O	.	.	.	.	.	.	.	.	M	M	M	P	P	P	P
P	P	P	P	P	M	M	M	.	.	.	T	.	.	O	.	O	H	O	.	O	.	.	.	.	.	.	M	M	M	P	P	P	P	P
P	P	P	P	P	M	M	.	.	.	T	.	.	.	.	O	.	$	.	O	.	.	.	T	.	.	.	.	M	M	P	P	P	P	P
`;

// Teams the player may choose to control. Others are always CPU.
export const HUMAN_TEAMS = [1, 2];

// Starting owners (team 1 = Blue, team 2 = Red).
// Forts within walls belong to the team of the lord.
// Corner and middle-of-map forts are neutral (unowned).
export const STRONGHOLD_OWNERS = [
  // Team 1 (Blue) Throne & Forts within walls
  { x: 17, y: 1, team: 1 },  // Throne
  { x: 0, y: 0, team: 1 }, 
  { x: 10, y: 1, team: 1 }, 
  { x: 16, y: 1, team: 1 },   
  { x: 18, y: 1, team: 1 },  
  { x: 24, y: 1, team: 1 },   
  { x: 34, y: 0, team: 1 },  

  // Team 2 (Red) Throne & Forts within walls
  { x: 17, y: 27, team: 2 }, // Throne
  { x: 15, y: 26, team: 2 },  // 
  { x: 19, y: 26, team: 2 }, // 
  { x: 14, y: 27, team: 2 },  // 
  { x: 16, y: 27, team: 2 },  // 
  { x: 18, y: 27, team: 2 },  
  { x: 20, y: 27, team: 2 },
  { x: 15, y: 28, team: 2 },  
  { x: 19, y: 28, team: 2 },
  
    // Team 3 (Green): 
  { x: 0,  y: 23,  team: 3 },
  { x: 3,  y: 23, team: 3 },
  { x: 31, y: 23,  team: 3 },
  { x: 34, y: 23, team: 3 },
];

export const BALLISTAS = [
  { x: 0, y: 11, type: "Ballista" },   // or "Iron Ballista" / "Killer Ballista"
  { x: 16, y: 8, type: "Ballista" },
  { x: 18, y: 8, type: "Ballista" },
  { x: 34, y: 11, type: "Ballista" },           
];

// Starting units:
// - Lords start on their throne tiles.
// - Each player's forts have:
//   - A Pupil and a Journeyman on the adjacent forts (x=9 and x=10).
//   - A Recruit on one flanking fort (x=11). Cleric on the other (x=8)
export const STARTING_UNITS = [
  // Team 1 (Blue)
  { x: 17, y: 1, unit: "Lord", team: 1 },
  
  { x: 0, y: 0, unit: "Archer", team: 1 },
  { x: 34, y: 0, unit: "Archer", team: 1 },
  { x: 10, y: 2, unit: "Recruit", team: 1 },
  { x: 16, y: 1, unit: "Cleric", team: 1 },
  { x: 18, y: 1, unit: "Archer", team: 1 },
  { x: 24, y: 2, unit: "Recruit", team: 1 },

  // Team 2 (Red)
  { x: 17, y: 27, unit: "Lord", team: 2 },
  
  { x: 15, y: 26, unit: "Trainee", team: 2 },
  { x: 19, y: 26, unit: "Journeyman", team: 2 },
  { x: 14, y: 27, unit: "WyvernRider", team: 2 },
  { x: 16, y: 27, unit: "Pupil", team: 2 },
  { x: 18, y: 27, unit: "Cleric", team: 2 },
  { x: 20, y: 27, unit: "PegasusKnight", team: 2 },
  { x: 15, y: 28, unit: "Recruit", team: 2 },
  { x: 19, y: 28, unit: "Recruit", team: 2 },
  
    // Team 3 (Green), CPU attack
  { x: 0,  y: 23, unit: "MautheDoog", team: 3, level: 1, ai: "attack" },
  { x: 3,  y: 23, unit: "Revenant", team: 3, level: 1, ai: "attack" },
  { x: 34,  y: 23, unit: "MautheDoog", team: 3, level: 1, ai: "attack" },
  { x: 31,  y: 23, unit: "Revenant", team: 3, level: 1, ai: "attack" },

];
