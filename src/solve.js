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

const { findGroups } = require('./subgraphs');
const { MatrixSolver } = require('./vectorize');
const { Totals } = require('./totals');

function UnknownRecipe(item) {
  this.name = item.name;
  this.item = item;
}

function walk(item, seen, solvers, allRecipes) {
  for (var i = 0; i < solvers.length; i++) {
    var m = solvers[i];
    if (item.name in m.outputs) {
      return m;
    }
  }
  seen[item.name] = item;
  for (var i = 0; i < item.recipeNames.length; i++) {
    const recipe = allRecipes[item.recipeNames[i]];
    for (let j = 0; j < recipe.ingredients.length; j++) {
      const ing = recipe.ingredients[j];
      if (ing.item.name in seen) {
        continue;
      }
      var m = walk(ing.item, seen, solvers, allRecipes);
      if (m) {
        return m;
      }
    }
  }
  return null;
}

function insertBefore(array, newItem, existingItem) {
  if (!existingItem) {
    array.push(newItem);
    return;
  }
  for (let i = 0; i < array.length; i++) {
    if (array[i] === existingItem) {
      array.splice(i, 0, newItem);
      return;
    }
  }
  array.push(newItem);
}

function topologicalOrder(matrixSolvers, allRecipes) {
  const result = [];
  for (let i = 0; i < matrixSolvers.length; i++) {
    const m = matrixSolvers[i];
    const items = {};
    // Obtain set of items depended on by the group.
    for (let j = 0; j < m.inputRecipes.length; j++) {
      const recipe = m.inputRecipes[j];
      for (let k = 0; k < recipe.ingredients.length; k++) {
        const ing = recipe.ingredients[k];
        items[ing.item.name] = ing.item;
      }
    }
    let dep = null;
    for (const itemName in items) {
      const item = items[itemName];
      const m2 = walk(item, {}, matrixSolvers, allRecipes);
      if (m2) {
        dep = m2;
        break;
      }
    }
    insertBefore(result, m, dep);
  }
  return result;
}

function Solver(items, recipes) {
  this.items = items;
  this.recipes = recipes;
  this.disabledRecipes = {};
  this.matrixSolvers = [];
}
Solver.prototype = {
  constructor: Solver,
  findSubgraphs(spec, allRecipes) {
    const r = findGroups(spec, this.items, this.recipes);
    // Clear all group tags.
    for (var recipeName in this.recipes) {
      const recipe = this.recipes[recipeName];
      recipe.displayGroup = null;
      recipe.solveGroup = null;
    }
    for (var i = 0; i < r.simple.length; i++) {
      var group = r.simple[i];
      // The order in which these group IDs are assigned does not matter.
      for (var recipeName in group) {
        group[recipeName].displayGroup = i;
      }
    }
    const { groups } = r;
    this.matrixSolvers = [];
    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      this.matrixSolvers.push(new MatrixSolver(spec, group, allRecipes));
      for (var recipeName in group) {
        group[recipeName].solveGroup = i;
      }
    }
    this.matrixSolvers = topologicalOrder(this.matrixSolvers, allRecipes);
  },
  addDisabledRecipes(recipes) {
    for (const recipeName of recipes) {
      this.disabledRecipes[recipeName] = true;
    }
  },
  removeDisabledRecipes(recipes) {
    for (const recipeName in recipes) {
      delete this.disabledRecipes[recipeName];
    }
  },
  solve(rates, ignore, spec) {
    const totals = new Totals();
    for (var itemName in rates) {
      const item = this.items[itemName];
      var rate = rates[itemName];
      var subTotals = item.produce(rate, ignore, spec, this.recipes);
      totals.combine(subTotals);
    }
    if (Object.keys(totals.unfinished).length === 0) {
      return totals;
    }
    for (let i = 0; i < this.matrixSolvers.length; i++) {
      const solver = this.matrixSolvers[i];
      const match = solver.match(totals.unfinished);
      if (Object.keys(match).length === 0) {
        continue;
      }
      const solution = solver.solveFor(match, spec, this.disabledRecipes);
      for (var itemName in match) {
        delete totals.unfinished[itemName];
      }
      for (const recipeName in solution.solution) {
        var rate = solution.solution[recipeName];
        const recipe = this.recipes[recipeName];
        if (solver.inputRecipes.indexOf(recipe) !== -1) {
          const ing = recipe.products[0];
          const subRate = recipe.gives(ing.item, spec).mul(rate);
          var subTotals = ing.item.produce(subRate, ignore, spec, this.recipes);
          totals.combine(subTotals, true);
        } else {
          totals.add(recipeName, rate);
        }
      }
      for (var itemName in solution.waste) {
        totals.addWaste(itemName, solution.waste[itemName]);
      }
    }
    return totals;
  },
};

module.exports = {
  UnknownRecipe,
  Solver,
};
