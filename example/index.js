const {
  gameDataVanilla110, // Import required version data
  getRecipeGraph,
  getItemGroups,
  BuildTarget,
  Solver,
  getCategorizedFactories,
  FactorySpec,
  getFuel,
  getBelts,
  getItemRates,
  displayRate,
} = require('@kgrech/factorio-calculator-core');

const data = gameDataVanilla110; // Using version 1.1.0

const graph = getRecipeGraph(data);
const items = graph[0]; // List of all items
const recipes = graph[1]; // List of all recipes
const fuels = getFuel(data, items).chemical; // List of chemical for furnaces

const factories = getCategorizedFactories(data, recipes);
const defaultSettings = {
  ratePrecision: 2, // defines behaviour of displayRate
  countPrecision: 1, // defines behaviour of displayCount
  preferredFuelIdx: 1, // defines type of fuel to be used in fuels
  preferredFurnaceIdx: 1, // defines a furnace type to use out of factories.smelting
  preferredMinimumAssemblerIdx: 0, // defines a factory type to use out of factories.crafting
  miningProductivity: 0,
  displayRateIdx: 1, // index in [items/sec, items/min, items/h]
};
// Create a factory specification
const spec = new FactorySpec(factories, defaultSettings, fuels);

console.log('=== Available fuel types ===');
fuels.forEach((fuel) => {
  console.log(fuel.name);
});
console.log('');
console.log('');
console.log('');

// Items to select grouped like in the game
const itemGroups = getItemGroups(items, data);
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
const belts = getBelts(data);
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

const itemToConfigure = 'logistic-robot';
const count = '60';

// Define a build target
console.log(`=== Configuring ${count} of ${itemToConfigure}===`);
const target = new BuildTarget(itemToConfigure, 0);
target.setRate(spec, count);
const rates = {
  'logistic-robot': target.getRate(solver, spec),
};

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
