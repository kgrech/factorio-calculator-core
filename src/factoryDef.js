/* Copyright 2015-2019 Kirk McDonald

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */
/* eslint max-classes-per-file: ["error", 4] */

const {
  Factory, Miner, RocketLaunch, RocketSilo,
} = require('./factory');

const {
  zero,
  one,
  RationalFromFloat,
} = require('./rational');

class FactoryDef {
  constructor(name, col, row, categories, maxIngredients, speed, moduleSlots, energyUsage, fuel) {
    this.name = name;
    this.icon_col = col;
    this.icon_row = row;
    this.categories = categories;
    this.max_ing = maxIngredients;
    this.speed = speed;
    this.moduleSlots = moduleSlots;
    this.energyUsage = energyUsage;
    this.fuel = fuel;
  }

  less(other) {
    if (!this.speed.equal(other.speed)) {
      return this.speed.less(other.speed);
    }
    return this.moduleSlots < other.moduleSlots;
  }

  makeFactory(spec, recipe, moduleSpec, beaconModuleSpec) {
    return new Factory(this, spec, recipe, moduleSpec, beaconModuleSpec);
  }

  canBeacon() {
    return this.moduleSlots > 0;
  }
}

class MinerDef extends FactoryDef {
  constructor(name, col, row, categories, power, speed, moduleSlots, energyUsage, fuel) {
    super(name, col, row, categories, 0, 0, moduleSlots, energyUsage, fuel);
    this.mining_power = power;
    this.mining_speed = speed;
  }

  less(other) {
    return this.mining_speed.less(other.mining_speed);
  }

  makeFactory(spec, recipe, moduleSpec, beaconModuleSpec) {
    return new Miner(this, spec, recipe, moduleSpec, beaconModuleSpec);
  }
}

class RocketLaunchDef extends FactoryDef {
  constructor(name, col, row, categories, maxIngredients, speed,
    moduleSlots, energyUsage, fuel, partRecipe) {
    super(name, col, row, categories, maxIngredients, speed, moduleSlots, energyUsage, fuel);
    this.partRecipe = partRecipe;
  }

  makeFactory(spec, recipe, moduleSpec, beaconModuleSpec) {
    return new RocketLaunch(this, spec, recipe, moduleSpec, beaconModuleSpec);
  }
}

class RocketSiloDef extends FactoryDef {
  constructor(name, col, row, categories, maxIngredients, speed,
    moduleSlots, energyUsage, fuel, partRecipe) {
    super(name, col, row, categories, maxIngredients, speed, moduleSlots, energyUsage, fuel);
    this.partRecipe = partRecipe;
  }

  makeFactory(spec, recipe, moduleSpec, beaconModuleSpec) {
    return new RocketSilo(this, spec, recipe, moduleSpec, beaconModuleSpec);
  }
}

function compareFactories(a, b) {
  if (a.less(b)) {
    return -1;
  }
  if (b.less(a)) {
    return 1;
  }
  return 0;
}

function getFactories(data, recipes) {
  const factories = [];
  const pumpDef = data['offshore-pump']['offshore-pump'];
  const pump = new FactoryDef(
    'offshore-pump',
    pumpDef.icon_col,
    pumpDef.icon_row,
    ['water'],
    1,
    one,
    0,
    zero,
    null,
  );
  factories.push(pump);
  const reactorDef = data.reactor['nuclear-reactor'];
  const reactor = new FactoryDef(
    'nuclear-reactor',
    reactorDef.icon_col,
    reactorDef.icon_row,
    ['nuclear'],
    1,
    one,
    0,
    zero,
    null,
  );
  factories.push(reactor);
  const boilerDef = data.boiler.boiler;
  // XXX: Should derive this from game data.
  const boilerEnergy = RationalFromFloat(1800000);
  const boiler = new FactoryDef(
    'boiler',
    boilerDef.icon_col,
    boilerDef.icon_row,
    ['boiler'],
    1,
    one,
    0,
    boilerEnergy,
    'chemical',
  );
  factories.push(boiler);
  const siloDef = data['rocket-silo']['rocket-silo'];

  const partRecipe = recipes['rocket-part'];
  const launch = new RocketLaunchDef(
    'rocket-silo',
    siloDef.icon_col,
    siloDef.icon_row,
    ['rocket-launch'],
    2,
    one,
    0,
    zero,
    null,
    partRecipe,
  );
  factories.push(launch);
  ['assembling-machine', 'furnace'].forEach((type) => {
    Object.values(data[type]).forEach((d) => {
      let fuel = null;
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
          fuel,
        ),
      );
    });
  });
  Object.values(data['rocket-silo']).forEach((d) => {
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
        partRecipe,
      ),
    );
  });
  Object.values(data['mining-drill'])
    .filter((d) => d.name !== 'pumpjack')
    .forEach(((d) => {
      let fuel = null;
      if (d.energy_source && d.energy_source.type === 'burner') {
        fuel = d.energy_source.fuel_category;
      }
      let power;
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
          fuel,
        ),
      );
    }));
  return factories;
}

function getCategorizedFactories(data, recipes) {
  const factories = getFactories(data, recipes);
  const factoryCategories = {};
  factories.forEach((factory) => {
    factory.categories.forEach((category) => {
      if (!(category in factoryCategories)) {
        factoryCategories[category] = [];
      }
      factoryCategories[category].push(factory);
    });
  });
  Object.values(factoryCategories)
    .forEach((factoryCategory) => factoryCategory.sort(compareFactories));
  return factoryCategories;
}

module.exports = {
  FactoryDef,
  MinerDef,
  RocketLaunchDef,
  RocketSiloDef,
  getCategorizedFactories,
};
