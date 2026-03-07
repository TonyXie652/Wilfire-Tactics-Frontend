const CENTER_LNG = -114.3718;
const CENTER_LAT = 62.4540;

// Yellowknife downtown rough street grid based on OSM data
const nodes = [
  // Franklin Ave (Main street, horizontal-ish)
  { id: "n_f1", lng: -114.3780, lat: 62.4530 },
  { id: "n_f2", lng: -114.3750, lat: 62.4535 },
  { id: "n_f3", lng: -114.3718, lat: 62.4540 }, // Center
  { id: "n_f4", lng: -114.3680, lat: 62.4545 },
  { id: "n_f5", lng: -114.3640, lat: 62.4550 },
  { id: "n_f6", lng: -114.3600, lat: 62.4555 },

  // 49th Ave (Parallel, north of Franklin)
  { id: "n_49_1", lng: -114.3790, lat: 62.4545 },
  { id: "n_49_2", lng: -114.3760, lat: 62.4550 },
  { id: "n_49_3", lng: -114.3725, lat: 62.4555 },
  { id: "n_49_4", lng: -114.3685, lat: 62.4560 },
  { id: "n_49_5", lng: -114.3645, lat: 62.4565 },
  { id: "n_49_6", lng: -114.3605, lat: 62.4570 },

  // 51st Ave (Parallel, south of Franklin)
  { id: "n_51_1", lng: -114.3770, lat: 62.4515 },
  { id: "n_51_2", lng: -114.3740, lat: 62.4520 },
  { id: "n_51_3", lng: -114.3710, lat: 62.4525 },
  { id: "n_51_4", lng: -114.3670, lat: 62.4530 },
  { id: "n_51_5", lng: -114.3630, lat: 62.4535 },
];

let edgeId = 0;
const edges = [
  // --- Horizontal ---
  // Franklin Ave
  { id: `e${edgeId++}`, from: "n_f1", to: "n_f2" },
  { id: `e${edgeId++}`, from: "n_f2", to: "n_f3" },
  { id: `e${edgeId++}`, from: "n_f3", to: "n_f4" },
  { id: `e${edgeId++}`, from: "n_f4", to: "n_f5" },
  { id: `e${edgeId++}`, from: "n_f5", to: "n_f6" },

  // 49th Ave
  { id: `e${edgeId++}`, from: "n_49_1", to: "n_49_2" },
  { id: `e${edgeId++}`, from: "n_49_2", to: "n_49_3" },
  { id: `e${edgeId++}`, from: "n_49_3", to: "n_49_4" },
  { id: `e${edgeId++}`, from: "n_49_4", to: "n_49_5" },
  { id: `e${edgeId++}`, from: "n_49_5", to: "n_49_6" },

  // 51st Ave
  { id: `e${edgeId++}`, from: "n_51_1", to: "n_51_2" },
  { id: `e${edgeId++}`, from: "n_51_2", to: "n_51_3" },
  { id: `e${edgeId++}`, from: "n_51_3", to: "n_51_4" },
  { id: `e${edgeId++}`, from: "n_51_4", to: "n_51_5" },

  // --- Vertical Cross Streets ---
  // 52nd St
  { id: `e${edgeId++}`, from: "n_51_2", to: "n_f2" },
  { id: `e${edgeId++}`, from: "n_f2", to: "n_49_2" },

  // 50th St
  { id: `e${edgeId++}`, from: "n_51_3", to: "n_f3" },
  { id: `e${edgeId++}`, from: "n_f3", to: "n_49_3" },

  // 48th St
  { id: `e${edgeId++}`, from: "n_51_4", to: "n_f4" },
  { id: `e${edgeId++}`, from: "n_f4", to: "n_49_4" },
  
  // Diagonal (School Draw Ave approx)
  { id: `e${edgeId++}`, from: "n_f4", to: "n_49_5" },
];

// add bidirectional
const allEdges = [...edges];
edges.forEach(e => {
    allEdges.push({ id: `e${edgeId++}`, from: e.to, to: e.from });
});

console.log(JSON.stringify({ nodes, edges: allEdges }, null, 2));
