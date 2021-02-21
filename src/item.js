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

const { Totals } = require('./totals.js');

function Item(name, col, row, phase, group, subgroup, order) {
  this.name = name;
  this.icon_col = col;
  this.icon_row = row;
  this.recipeNames = [];
  this.usesNames = [];
  this.phase = phase;
  this.group = group;
  this.subgroup = subgroup;
  this.order = order;
}
Item.prototype = {
  constructor: Item,
  addRecipe(recipe) {
    this.recipeNames.push(recipe.name);
  },
  addUse(recipe) {
    this.usesNames.push(recipe.name);
  },
  isWeird(recipes) {
    return (
      this.recipeNames.length > 1
      || recipes[this.recipeNames[0]].solveGroup !== null
    );
  },
  produce(rate, ignore, spec, recipes) {
    const totals = new Totals(rate, this);
    if (this.isWeird(recipes)) {
      totals.addUnfinished(this.name, rate);
      return totals;
    }
    const recipeName = this.recipeNames[0];
    const recipe = recipes[recipeName];
    const gives = recipe.gives(this, spec);
    const rateDivided = rate.div(gives);
    totals.add(recipe.name, rateDivided);
    if (ignore.has(recipe.name)) {
      return totals;
    }
    const ingredients = recipe.ingredients.concat(recipe.fuelIngredient(spec));
    for (let i = 0; i < ingredients.length; i += 1) {
      const ing = ingredients[i];
      const subTotals = ing.item.produce(
        rateDivided.mul(ing.amount),
        ignore,
        spec,
        recipes,
      );
      totals.combine(subTotals);
    }
    return totals;
  },
};

function getItem(data, items, name) {
  if (name in items) {
    return items[name];
  }
  const d = data.items[name];
  let phase;
  if (d.type === 'fluid') {
    phase = 'fluid';
  } else {
    phase = 'solid';
  }
  const item = new Item(
    name,
    d.icon_col,
    d.icon_row,
    phase,
    d.group,
    d.subgroup,
    d.order,
  );
  items[name] = item;
  return item;
}

function getItems(data) {
  const items = {};
  const cycleName = 'nuclear-reactor-cycle';
  const reactor = data.items['nuclear-reactor'];
  items[cycleName] = new Item(
    cycleName,
    reactor.icon_col,
    reactor.icon_row,
    'abstract',
    'production',
    'energy',
    'f[nuclear-energy]-d[reactor-cycle]',
  );
  return items;
}

module.exports = {
  getItem,
  getItems,
  Item,
};
