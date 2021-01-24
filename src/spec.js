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

const {
  zero,
  one,
  RationalFromFloat,
} = require('./rational');

const assemblyMachineCategories = new Set([
  'advanced-crafting',
  'crafting',
  'crafting-with-fluid',
]);

const displayRates = [one, RationalFromFloat(60), RationalFromFloat(3600)];

const getModule = (modules, idx) => (idx >= 0 && idx < modules.length ? modules[idx] : null);

class FactorySpec {
  constructor(factories, settings, fuel, recipes, modules, moduleIdxSpec = {}) {
    this.settings = settings;
    this.factories = factories;
    this.furnace = factories.smelting[settings.preferredFurnaceIdx];
    this.minimum = factories.crafting[settings.preferredMinimumAssemblerIdx];

    this.miningProd = RationalFromFloat(settings.miningProductivity / 100.0);
    this.displayRateFactor = displayRates[settings.displayRateIdx];
    this.preferredFuel = fuel[settings.preferredFuelIdx];
    this.defaultModules = this.settings.defaultModuleIndices
      .map((idx) => getModule(modules, idx));

    this.defaultBeacon = getModule(modules, settings.defaultBeaconIdx);
    this.defaultBeaconCount = RationalFromFloat(settings.defaultBeaconCount);

    this.ignore = {};
    const moduleSpec = Object.fromEntries(
      Object.entries(moduleIdxSpec).map(([recipeName, indexArray]) => {
        const modulesArray = indexArray
          .map((idx) => getModule(modules, idx));
        return [recipeName, modulesArray];
      }),
    );
    this.initFactories(recipes, moduleSpec);
  }

  initFactories(recipes, moduleSpec) {
    this.spec = {};
    Object.values(recipes)
      .filter((recipe) => recipe.category)
      .forEach((recipe) => {
        const factoryDef = this.getFactoryDef(recipe);
        this.spec[recipe.name] = factoryDef.makeFactory(this, recipe, moduleSpec);
        this.spec[recipe.name].beaconCount = this.defaultBeaconCount;
      });
  }

  getFactoryDef(recipe) {
    if (recipe.category === 'smelting') {
      return this.furnace;
    }
    const factories = this.factories[recipe.category];
    if (!assemblyMachineCategories.has(recipe.category)) {
      return factories[factories.length - 1];
    }
    const factoryDef = factories.find((def) => !def.less(this.minimum));
    return factoryDef || factories[factories.length - 1];
  }

  getFactory(recipe) {
    return this.spec[recipe.name];
  }

  getCount(recipe, rate) {
    const factory = this.getFactory(recipe);
    if (!factory) {
      return zero;
    }
    return rate.div(factory.recipeRate(this, recipe));
  }

  recipeRate(recipe) {
    const factory = this.getFactory(recipe);
    if (!factory) {
      return zero;
    }
    return factory.recipeRate(this, recipe);
  }
}

module.exports = {
  FactorySpec,
};
