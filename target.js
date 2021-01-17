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

const { zero, one, RationalFromString } = require('./rational');
const { displayCount, displayRate } = require('./display');

function isFactoryTarget(solver, build_targets, recipeName) {
  // Special case: rocket-part and rocket-launch are linked in a weird way.
  if (recipeName === 'rocket-part') {
    if (isFactoryTarget(solver, build_targets, 'rocket-launch')) {
      return true;
    }
  }
  for (var i = 0; i < build_targets.length; i++) {
    var target = build_targets[i];
    var item = solver.items[target.itemName];
    for (var j = 0; j < item.recipes.length; j++) {
      var recipe = item.recipes[j];
      if (recipe.name === recipeName && target.changedFactory) {
        return true;
      }
    }
  }
  return false;
}

function BuildTarget(itemName, recipeIndex) {
  this.itemName = itemName;
  this.changedFactory = true;
  this.factoriesValue = one;
  this.rateValue = zero;
  this.recipeIndex = recipeIndex;
}

BuildTarget.prototype = {
  constructor: BuildTarget,
  // Returns the rate at which this item is being requested. Also updates
  // the text boxes in response to changes in options.
  getRate: function (solver, spec) {
    var item = solver.items[this.itemName];
    var recipeName = item.recipeNames[this.recipeIndex];
    var recipe = solver.recipes[recipeName];
    var baseRate = spec.recipeRate(recipe);
    if (baseRate) {
      baseRate = baseRate.mul(recipe.gives(item, spec));
      if (this.changedFactory) {
        this.rateValue = baseRate.mul(this.factoriesValue);
      } else {
        this.factoriesValue = this.rateValue.div(baseRate);
      }
    }
    return this.rateValue;
  },
  setFactories: function (factories) {
    this.factoriesValue = RationalFromString(factories);
    this.changedFactory = true;
    this.rateValue = zero;
  },
  setRate: function (spec, rate) {
    this.rateValue = RationalFromString(rate).div(spec.displayRateFactor);
    this.changedFactory = false;
    this.factoriesValue = zero;
  },
  setItemName: function (itemName) {
    this.itemName = itemName;
  },
  setRecipeIndex: function (recipeIndex) {
    this.recipeIndex = recipeIndex;
  },
  getRateString: function (spec) {
    return displayRate(this.rateValue, spec);
  },
  getFactoriesString: function (spec) {
    return displayCount(this.factoriesValue, spec);
  },
};

module.exports = {
  isFactoryTarget: isFactoryTarget,
  BuildTarget: BuildTarget,
};
