const {
  gameDataVanilla1119, // Import required version data
  getRecipeGraph,
  getItemGroups,
  getRate,
  Solver,
  getCategorizedFactories,
  FactorySpec,
  getFuel,
  getBelts,
  getItemRates,
  getModules,
  displayCount,
  displayRate,
} = require('@kgrech/factorio-calculator-core');

const gameData = gameDataVanilla1119; // Using version 1.1.19

const graph = getRecipeGraph(gameData);
const items = graph[0]; // List of all items
const recipes = graph[1]; // List of all recipes
const fuels = getFuel(gameData, items).chemical; // List of chemical for furnaces
const modules = getModules(gameData);

const factories = getCategorizedFactories(gameData, recipes);

const data = {
  factories,
  fuel: fuels,
  recipes,
  modules,
};

const defaultSettings = {
  ratePrecision: 2, // defines behaviour of displayRate
  countPrecision: 2, // defines behaviour of displayCount
  preferredFuelIdx: 1, // defines type of fuel to be used in fuels
  preferredFurnaceIdx: 1, // defines a furnace type to use out of factories.smelting
  preferredMinimumAssemblerIdx: 1, // defines a factory type to use out of factories.crafting
  miningProductivity: 0,
  displayRateIdx: 1, // index in [items/sec, items/min, items/h]
  defaultModuleIndices: [5, 5, 5, 5],
  defaultBeacons: {
    modules: [5, 5],
    counts: [1, 1],
  },
  moduleSpec: {},
  beaconSpec: { },
  ignore: [],
};
// Create a factory specification
const spec = new FactorySpec(data, defaultSettings);

console.log('=== Available fuel types ===');
fuels.forEach((fuel) => {
  console.log(fuel.name);
});
console.log('');
console.log('');
console.log('');

console.log('=== Available modules types ===');
modules.forEach((module) => {
  const p = displayCount(module.productivity, spec);
  const s = displayCount(module.speed, spec);
  const w = displayCount(module.power, spec);
  console.log(`${module.name} - productivity: ${p}, speed: ${s} , power: ${w}`);
});
console.log('');
console.log('');
console.log('');

// Items to select grouped like in the game
const itemGroups = getItemGroups(items, gameData);
console.log('=== Available items to build: ===');
itemGroups.forEach((group, idx) => {
  console.log(`\t== Group ${idx}==`);
  group.forEach((row) => {
    console.log(`\t\t${row.map((item) => item.name).join(', ')}`);
  });
});
console.log('');
console.log('');
console.log('');

console.log('=== Available belt types ===');
const belts = getBelts(gameData);
belts.forEach((belt) => {
  console.log(`${belt.name}: ${displayRate(belt.speed, spec)}`);
});
console.log('');
console.log('');
console.log('');

// Initialize solver object
const solver = new Solver(items, recipes);
solver.findSubgraphs(spec, recipes);

// Disable kovarex process (just as an example)
solver.addDisabledRecipes(['kovarex-enrichment-process']);

const itemsToConfigure = [
  'automation-science-pack',
  'logistic-science-pack',
  'military-science-pack',
  'chemical-science-pack',
  'utility-science-pack',
  'space-science-pack',
];
const count = '60';

// Define a build target
const rates = Object.fromEntries(itemsToConfigure.map((item) => {
  console.log(`=== Configuring ${count} of ${item}===`);
  return [item, getRate(solver, spec, {
    itemName: item,
    recipeIndex: 0,
    rate: count,
    rateUpdated: true,
  })];
}));

const totals = solver.solve(rates, spec.ignore, spec);
const itemRates = getItemRates(totals, recipes, spec);

// Iterate over results
console.log('=== Configuration results: ===');
Object.entries(itemRates).forEach(([key, value]) => {
  console.log(`${key}: ${displayRate(value, spec)}`);
});

// Some other helpful functions to explore the results
// const groups = getGroups(totals, recipes);
// const fuelUsers = getFuelUsers(totals, recipes, spec);
