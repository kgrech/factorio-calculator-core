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

const { zero, one, RationalFromString } = require('./rational');
const { displayCount, displayRate } = require('./display');

const getRateAndFactories = (solver, spec, target) => {
  const item = solver.items[target.itemName];
  const recipeName = item.recipeNames[target.recipeIndex];
  const recipe = solver.recipes[recipeName];
  let baseRate = spec.recipeRate(recipe);
  if (!baseRate) {
    return {
      rate: zero,
      factories: one,
    };
  }
  baseRate = baseRate.mul(recipe.gives(item, spec));
  if (target.rateUpdated) {
    const rate = RationalFromString(target.rate).div(spec.displayRateFactor);
    const factories = rate.div(baseRate);
    return { rate, factories };
  }
  const factories = RationalFromString(target.factories);
  const rate = baseRate.mul(factories);
  return { rate, factories };
};

const getRate = (solver, spec, target) => getRateAndFactories(solver, spec, target).rate;
const getFactories = (solver, spec, target) => getRateAndFactories(solver, spec, target).factories;

const updateTarget = (solver, spec, target) => {
  const { rate, factories } = getRateAndFactories(solver, spec, target);
  return {
    ...target,
    rate: displayRate(rate, spec),
    factories: displayCount(factories, spec),
  };
};

module.exports = {
  getRateAndFactories,
  getRate,
  getFactories,
  updateTarget,
};
