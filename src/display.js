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

const { zero, RationalFromFloat } = require('./rational');

// value format
const displayFormat = 'decimal';

function formatName(name) {
  name = name.replace(new RegExp('-', 'g'), ' ');
  return name[0].toUpperCase() + name.slice(1);
}

function displayRate(x, spec) {
  x = x.mul(spec.displayRateFactor);
  if (displayFormat === 'rational') {
    return x.toMixed();
  }
  return x.toDecimal(spec.settings.ratePrecision);
}

function displayCount(x, spec) {
  if (displayFormat === 'rational') {
    return x.toMixed();
  }
  return x.toUpDecimal(spec.settings.countPrecision);
}

function align(s, prec) {
  if (displayFormat === 'rational') {
    return s;
  }
  let idx = s.indexOf('.');
  if (idx === -1) {
    idx = s.length;
  }
  let toAdd = prec - s.length + idx;
  if (prec > 0) {
    toAdd += 1;
  }
  while (toAdd > 0) {
    s += '\u00A0';
    toAdd--;
  }
  return s;
}

function alignRate(x, spec) {
  return align(displayRate(x, spec), spec.settings.ratePrecision);
}

function alignCount(x, spec) {
  return align(displayCount(x, spec), spec.settings.countPrecision);
}

const powerSuffixes = ['\u00A0W', 'kW', 'MW', 'GW', 'TW', 'PW'];

function alignPower(x, spec) {
  const thousand = RationalFromFloat(1000);
  let i = 0;
  while (thousand.less(x) && i < powerSuffixes.length - 1) {
    x = x.div(thousand);
    i++;
  }
  return (
    `${align(displayCount(x, spec), spec.settings.countPrecision)
    } ${
      powerSuffixes[i]}`
  );
}

function RecipeGroup(id) {
  this.id = id;
  this.recipes = [];
}
RecipeGroup.prototype = {
  constructor: RecipeGroup,
  equal(other) {
    if (this.id !== other.id) {
      return false;
    }
    if (this.recipes.length !== other.recipes.length) {
      return false;
    }
    for (let i = 0; i < this.recipes.length; i++) {
      if (this.recipes[i].name !== other.recipes[i].name) {
        return false;
      }
    }
    return true;
  },
};

// === Refactored RecipeTable.display solution ====

function getItemRates(totals, recipes, spec) {
  const itemCounts = {};
  for (let i = 0; i < totals.topo.length; i++) {
    const recipeName = totals.topo[i];
    const recipeRate = totals.totals[recipeName];
    const recipe = recipes[recipeName];
    for (let j = 0; j < recipe.products.length; j++) {
      const ing = recipe.products[j];
      if (!(ing.item.name in itemCounts)) {
        itemCounts[ing.item.name] = zero;
      }
      itemCounts[ing.item.name] = itemCounts[ing.item.name].add(
        recipeRate.mul(recipe.gives(ing.item, spec)),
      );
    }
  }
  return itemCounts;
}

function getFuelUsers(totals, recipes, spec) {
  const fuelUsers = new Map();
  for (let i = 0; i < totals.topo.length; i++) {
    const recipeName = totals.topo[i];
    const recipe = recipes[recipeName];
    for (const fuelIng of recipe.fuelIngredient(spec)) {
      if (!fuelUsers.has(fuelIng.item)) {
        fuelUsers.set(fuelIng.item, []);
      }
      fuelUsers.get(fuelIng.item).push(recipe);
    }
  }
  return fuelUsers;
}

function getGroups(totals, recipes) {
  const groups = [];
  const groupMap = {};
  for (let i = 0; i < totals.topo.length; i++) {
    const recipeName = totals.topo[i];
    const recipe = recipes[recipeName];
    var group;
    if (recipe.displayGroup === null) {
      group = new RecipeGroup(null);
      groups.push(group);
    } else if (recipe.displayGroup in groupMap) {
      group = groupMap[recipe.displayGroup];
    } else {
      group = new RecipeGroup(recipe.displayGroup);
      groups.push(group);
      groupMap[recipe.displayGroup] = group;
    }
    group.recipes.push(recipe);
  }
  return groups;
}

module.exports = {
  formatName,
  displayRate,
  displayCount,
  alignRate,
  alignCount,
  alignPower,
  getItemRates,
  getFuelUsers,
  getGroups,
};
