// One entry per map. Add a line here when you add a map file.
export const MAPS = [
  {
    id: "test",
    name: "Test",
    load: () => import("./test.js")
  },
  {
    id: "mountains",
    name: "Mountains",
    load: () => import("./mountains.js")
  },
  {
    id: "castle",
    name: "Castle",
    load: () => import("./castle.js")
  }
  // { id: "islands", name: "Islands", load: () => import("./islands.js") }
];