/*Copyright 2015-2019 Kirk McDonald

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/
'use strict';

const {
  half,
  zero,
  one,
  RationalFromFloat,
  RationalFromFloats,
} = require('./rational');

const useLegacyCalculations = false;

function FactoryDef(
  name,
  col,
  row,
  categories,
  max_ingredients,
  speed,
  moduleSlots,
  energyUsage,
  fuel
) {
  this.name = name;
  this.icon_col = col;
  this.icon_row = row;
  this.categories = categories;
  this.max_ing = max_ingredients;
  this.speed = speed;
  this.moduleSlots = moduleSlots;
  this.energyUsage = energyUsage;
  this.fuel = fuel;
}
FactoryDef.prototype = {
  constructor: FactoryDef,
  less: function (other) {
    if (!this.speed.equal(other.speed)) {
      return this.speed.less(other.speed);
    }
    return this.moduleSlots < other.moduleSlots;
  },
  makeFactory: function (spec, recipe) {
    return new Factory(this, spec, recipe);
  },
  canBeacon: function () {
    return this.moduleSlots > 0;
  },
};

function MinerDef(
  name,
  col,
  row,
  categories,
  power,
  speed,
  moduleSlots,
  energyUsage,
  fuel
) {
  FactoryDef.call(
    this,
    name,
    col,
    row,
    categories,
    0,
    0,
    moduleSlots,
    energyUsage,
    fuel
  );
  this.mining_power = power;
  this.mining_speed = speed;
}
MinerDef.prototype = Object.create(FactoryDef.prototype);
MinerDef.prototype.less = function (other) {
  if (useLegacyCalculations && !this.mining_power.equal(other.mining_power)) {
    return this.mining_power.less(other.mining_power);
  }
  return this.mining_speed.less(other.mining_speed);
};
MinerDef.prototype.makeFactory = function (spec, recipe) {
  return new Miner(this, spec, recipe);
};

function RocketLaunchDef(
  name,
  col,
  row,
  categories,
  max_ingredients,
  speed,
  moduleSlots,
  energyUsage,
  fuel,
  partRecipe
) {
  FactoryDef.call(
    this,
    name,
    col,
    row,
    categories,
    max_ingredients,
    speed,
    moduleSlots,
    energyUsage,
    fuel
  );
  this.partRecipe = partRecipe;
}
RocketLaunchDef.prototype = Object.create(FactoryDef.prototype);
RocketLaunchDef.prototype.makeFactory = function (spec, recipe) {
  return new RocketLaunch(this, spec, recipe);
};

function RocketSiloDef(
  name,
  col,
  row,
  categories,
  max_ingredients,
  speed,
  moduleSlots,
  energyUsage,
  fuel,
  partRecipe
) {
  FactoryDef.call(
    this,
    name,
    col,
    row,
    categories,
    max_ingredients,
    speed,
    moduleSlots,
    energyUsage,
    fuel
  );
  this.partRecipe = partRecipe;
}
RocketSiloDef.prototype = Object.create(FactoryDef.prototype);
RocketSiloDef.prototype.makeFactory = function (spec, recipe) {
  return new RocketSilo(this, spec, recipe);
};

function Factory(factoryDef, spec, recipe) {
  this.recipe = recipe;
  this.modules = [];
  this.setFactory(factoryDef, spec);
  this.beaconModule = spec.defaultBeacon;
  this.beaconCount = spec.defaultBeaconCount;
}
Factory.prototype = {
  constructor: Factory,
  setFactory: function (factoryDef, spec) {
    this.name = factoryDef.name;
    this.factory = factoryDef;
    if (this.modules.length > factoryDef.moduleSlots) {
      this.modules.length = factoryDef.moduleSlots;
    }
    var toAdd = null;
    if (spec.defaultModule && spec.defaultModule.canUse(this.recipe)) {
      toAdd = spec.defaultModule;
    }
    while (this.modules.length < factoryDef.moduleSlots) {
      this.modules.push(toAdd);
    }
  },
  getModule: function (index) {
    return this.modules[index];
  },
  // Returns true if the module change requires a recalculation.
  setModule: function (index, module) {
    if (index >= this.modules.length) {
      return false;
    }
    var oldModule = this.modules[index];
    var needRecalc =
      (oldModule && oldModule.hasProdEffect()) ||
      (module && module.hasProdEffect());
    this.modules[index] = module;
    return needRecalc;
  },
  speedEffect: function (spec) {
    var speed = one;
    for (var i = 0; i < this.modules.length; i++) {
      var module = this.modules[i];
      if (!module) {
        continue;
      }
      speed = speed.add(module.speed);
    }
    if (this.modules.length > 0) {
      var beaconModule = this.beaconModule;
      if (beaconModule) {
        speed = speed.add(beaconModule.speed.mul(this.beaconCount).mul(half));
      }
    }
    return speed;
  },
  prodEffect: function (spec) {
    var prod = one;
    for (var i = 0; i < this.modules.length; i++) {
      var module = this.modules[i];
      if (!module) {
        continue;
      }
      prod = prod.add(module.productivity);
    }
    return prod;
  },
  powerEffect: function (spec) {
    var power = one;
    for (var i = 0; i < this.modules.length; i++) {
      var module = this.modules[i];
      if (!module) {
        continue;
      }
      power = power.add(module.power);
    }
    if (this.modules.length > 0) {
      var beaconModule = this.beaconModule;
      if (beaconModule) {
        power = power.add(beaconModule.power.mul(this.beaconCount).mul(half));
      }
    }
    var minimum = RationalFromFloats(1, 5);
    if (power.less(minimum)) {
      power = minimum;
    }
    return power;
  },
  powerUsage: function (spec, count) {
    var power = this.factory.energyUsage;
    if (this.factory.fuel) {
      return { fuel: this.factory.fuel, power: power.mul(count) };
    }
    // Default drain value.
    var drain = power.div(RationalFromFloat(30));
    var divmod = count.divmod(one);
    power = power.mul(count);
    if (!divmod.remainder.isZero()) {
      var idle = one.sub(divmod.remainder);
      power = power.add(idle.mul(drain));
    }
    power = power.mul(this.powerEffect(spec));
    return { fuel: 'electric', power: power };
  },
  recipeRate: function (spec, recipe) {
    return recipe.time
      .reciprocate()
      .mul(this.factory.speed)
      .mul(this.speedEffect(spec));
  },
  copyModules: function (other, recipe) {
    var length = Math.max(this.modules.length, other.modules.length);
    var needRecalc = false;
    for (var i = 0; i < length; i++) {
      var module = this.getModule(i);
      if (!module || module.canUse(recipe)) {
        needRecalc = other.setModule(i, module) || needRecalc;
      }
    }
    if (other.factory.canBeacon()) {
      other.beaconModule = this.beaconModule;
      other.beaconCount = this.beaconCount;
    }
    return needRecalc;
  },
};

function Miner(factory, spec, recipe) {
  Factory.call(this, factory, spec, recipe);
}
Miner.prototype = Object.create(Factory.prototype);
Miner.prototype.recipeRate = function (spec, recipe) {
  var miner = this.factory;
  var rate;
  if (useLegacyCalculations) {
    rate = miner.mining_power.sub(recipe.hardness);
  } else {
    rate = one;
  }
  return rate
    .mul(miner.mining_speed)
    .div(recipe.mining_time)
    .mul(this.speedEffect(spec));
};
Miner.prototype.prodEffect = function (spec) {
  var prod = Factory.prototype.prodEffect.call(this, spec);
  return prod.add(spec.miningProd);
};

var rocketLaunchDuration = RationalFromFloats(2475, 60);

function launchRate(spec, partRecipe) {
  var partItem = partRecipe.products[0].item;
  var partFactory = spec.getFactory(partRecipe);
  var gives = partRecipe.gives(partItem, spec);
  // The base rate at which the silo can make rocket parts.
  var rate = Factory.prototype.recipeRate.call(partFactory, spec, partRecipe);
  // Number of times to complete the rocket part recipe per launch.
  var perLaunch = RationalFromFloat(100).div(gives);
  // Total length of time required to launch a rocket.
  var time = perLaunch.div(rate).add(rocketLaunchDuration);
  var launchRateNew = time.reciprocate();
  var partRate = perLaunch.div(time);
  return { part: partRate, launch: launchRateNew };
}

function RocketLaunch(factory, spec, recipe) {
  Factory.call(this, factory, spec, recipe);
}
RocketLaunch.prototype = Object.create(Factory.prototype);
RocketLaunch.prototype.recipeRate = function (spec, recipe) {
  const partRecipe = this.factory.partRecipe;
  return launchRate(spec, partRecipe).launch;
};

function RocketSilo(factory, spec, recipe) {
  Factory.call(this, factory, spec, recipe);
}
RocketSilo.prototype = Object.create(Factory.prototype);
RocketSilo.prototype.recipeRate = function (spec, recipe) {
  const partRecipe = this.factory.partRecipe;
  return launchRate(spec, partRecipe).part;
};

var assembly_machine_categories = {
  'advanced-crafting': true,
  crafting: true,
  'crafting-with-fluid': true,
};

function compareFactories(a, b) {
  if (a.less(b)) {
    return -1;
  }
  if (b.less(a)) {
    return 1;
  }
  return 0;
}

const displayRates = [one, RationalFromFloat(60), RationalFromFloat(3600)];

function FactorySpec(factories, settings) {
  this.settings = settings;
  this.factories = factories;
  this.furnace = factories.smelting[settings.preferredFurnaceIdx];
  this.minimum = this.factories.crafting[settings.preferredMinimumAssemblerIdx];

  this.miningProd = RationalFromFloat(settings.miningProductivity / 100.0);
  this.displayRateFactor = displayRates[settings.displayRateIdx];

  this.defaultModule = null;
  this.defaultBeacon = null;
  this.defaultBeaconCount = zero;

  this.ignore = {};
  this.spec = {};
}

FactorySpec.prototype = {
  constructor: FactorySpec,
  useMinimum: function (recipe) {
    return recipe.category in assembly_machine_categories;
  },
  useFurnace: function (recipe) {
    return recipe.category === 'smelting';
  },
  getFactoryDef: function (recipe) {
    if (this.useFurnace(recipe)) {
      return this.furnace;
    }
    var factories = this.factories[recipe.category];
    if (!factories) {
      return null;
    }
    if (!this.useMinimum(recipe)) {
      return factories[factories.length - 1];
    }
    var factoryDef;
    for (var i = 0; i < factories.length; i++) {
      factoryDef = factories[i];
      if (
        factoryDef.less(this.minimum) ||
        (useLegacyCalculations &&
          factoryDef.max_ing < recipe.ingredients.length)
      ) {
        continue;
      }
      break;
    }
    return factoryDef;
  },
  // TODO: This should be very cheap. Calling getFactoryDef on each call
  // should not be necessary. Changing the minimum should proactively update
  // all of the factories to which it applies.
  getFactory: function (recipe) {
    if (!recipe.category) {
      return null;
    }
    var factoryDef = this.getFactoryDef(recipe);
    if (!factoryDef) {
      return null;
    }
    var factory = this.spec[recipe.name];
    // If the minimum changes, update the factory the next time we get it.
    if (factory) {
      factory.setFactory(factoryDef, this);
      return factory;
    }
    this.spec[recipe.name] = factoryDef.makeFactory(this, recipe);
    this.spec[recipe.name].beaconCount = this.defaultBeaconCount;
    return this.spec[recipe.name];
  },
  getCount: function (recipe, rate) {
    var factory = this.getFactory(recipe);
    if (!factory) {
      return zero;
    }
    return rate.div(factory.recipeRate(this, recipe));
  },
  recipeRate: function (recipe) {
    var factory = this.getFactory(recipe);
    if (!factory) {
      return null;
    }
    return factory.recipeRate(this, recipe);
  },
};

function getFactories(data, recipes) {
  var factories = [];
  var pumpDef = data['offshore-pump']['offshore-pump'];
  var pump = new FactoryDef(
    'offshore-pump',
    pumpDef.icon_col,
    pumpDef.icon_row,
    ['water'],
    1,
    one,
    0,
    zero,
    null
  );
  factories.push(pump);
  var reactorDef = data.reactor['nuclear-reactor'];
  var reactor = new FactoryDef(
    'nuclear-reactor',
    reactorDef.icon_col,
    reactorDef.icon_row,
    ['nuclear'],
    1,
    one,
    0,
    zero,
    null
  );
  factories.push(reactor);
  var boilerDef = data.boiler.boiler;
  // XXX: Should derive this from game data.
  var boiler_energy;
  if (useLegacyCalculations) {
    boiler_energy = RationalFromFloat(3600000);
  } else {
    boiler_energy = RationalFromFloat(1800000);
  }
  var boiler = new FactoryDef(
    'boiler',
    boilerDef.icon_col,
    boilerDef.icon_row,
    ['boiler'],
    1,
    one,
    0,
    boiler_energy,
    'chemical'
  );
  factories.push(boiler);
  var siloDef = data['rocket-silo']['rocket-silo'];

  const partRecipe = recipes['rocket-part'];
  var launch = new RocketLaunchDef(
    'rocket-silo',
    siloDef.icon_col,
    siloDef.icon_row,
    ['rocket-launch'],
    2,
    one,
    0,
    zero,
    null,
    partRecipe
  );
  factories.push(launch);
  for (var type in { 'assembling-machine': true, furnace: true }) {
    for (var name in data[type]) {
      var d = data[type][name];
      var fuel = null;
      if (d.energy_source && d.energy_source.type === 'burner') {
        fuel = d.energy_source.fuel_category;
      }
      factories.push(
        new FactoryDef(
          d.name,
          d.icon_col,
          d.icon_row,
          d.crafting_categories,
          d.ingredient_count,
          RationalFromFloat(d.crafting_speed),
          d.module_slots,
          RationalFromFloat(d.energy_usage),
          fuel
        )
      );
    }
  }
  for (var name in data['rocket-silo']) {
    var d = data['rocket-silo'][name];
    factories.push(
      new RocketSiloDef(
        d.name,
        d.icon_col,
        d.icon_row,
        d.crafting_categories,
        d.ingredient_count,
        RationalFromFloat(d.crafting_speed),
        d.module_slots,
        RationalFromFloat(d.energy_usage),
        null,
        partRecipe
      )
    );
  }
  for (var name in data['mining-drill']) {
    var d = data['mining-drill'][name];
    if (d.name === 'pumpjack') {
      continue;
    }
    var fuel = null;
    if (d.energy_source && d.energy_source.type === 'burner') {
      fuel = d.energy_source.fuel_category;
    }
    var power;
    if (d.mining_power) {
      power = RationalFromFloat(d.mining_power);
    } else {
      power = null;
    }
    factories.push(
      new MinerDef(
        d.name,
        d.icon_col,
        d.icon_row,
        ['mining-basic-solid'],
        power,
        RationalFromFloat(d.mining_speed),
        d.module_slots,
        RationalFromFloat(d.energy_usage),
        fuel
      )
    );
  }
  return factories;
}

function getCategorizedFactories(data, recipes) {
  const factories = getFactories(data, recipes);
  let factoryCategories = {};
  for (var i = 0; i < factories.length; i++) {
    var factory = factories[i];
    for (var j = 0; j < factory.categories.length; j++) {
      var category = factory.categories[j];
      if (!(category in factoryCategories)) {
        factoryCategories[category] = [];
      }
      factoryCategories[category].push(factory);
    }
  }
  for (var category in factoryCategories) {
    factoryCategories[category].sort(compareFactories);
  }
  return factoryCategories;
}

module.exports = {
  getCategorizedFactories: getCategorizedFactories,
  FactorySpec: FactorySpec,
  Factory: Factory,
};
