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

const { minusOne, zero, one } = require('./rational');
const { Matrix } = require('./matrix');
const { simplex } = require('./simplex');

const PRIORITY = ['uranium-ore', 'steam', 'coal', 'crude-oil', 'water'];

const useLegacyCalculations = false;

function MatrixSolver(spec, recipes, allWorldRecipes) {
  const products = {};
  const ingredients = {};
  const recipeArray = [];
  for (var recipeName in recipes) {
    var recipe = recipes[recipeName];
    recipeArray.push(recipe);
    for (var i = 0; i < recipe.products.length; i++) {
      var ing = recipe.products[i];
      products[ing.item.name] = ing.item;
    }
    var ings = recipe.getIngredients(spec);
    for (var i = 0; i < ings.length; i++) {
      var ing = ings[i];
      ingredients[ing.item.name] = ing.item;
    }
  }
  const items = [];
  this.items = items;
  // Map of items produced by this matrix.
  this.outputs = {};
  // Array of items produced by this matrix.
  this.outputItems = [];
  // Map from item name to waste-item column (minus offset).
  const wasteItems = {};
  for (var itemName in products) {
    var item = products[itemName];
    this.outputs[item.name] = item;
    items.push(item);
    wasteItems[item.name] = this.outputItems.length;
    this.outputItems.push(item);
  }
  // Array of the recipes that produce the "inputs" to this matrix.
  this.inputRecipes = [];
  for (var itemName in ingredients) {
    if (itemName in products) {
      continue;
    }
    var item = ingredients[itemName];
    items.push(item);
    var recipeName = item.recipeNames[0];
    this.inputRecipes.push(allWorldRecipes[recipeName]);
  }
  const allRecipes = recipeArray.concat(this.inputRecipes);
  const itemIndexes = {};
  for (var i = 0; i < items.length; i++) {
    itemIndexes[items[i].name] = i;
  }
  this.recipeIndexes = {};
  this.inputColumns = [];
  for (var i = 0; i < allRecipes.length; i++) {
    this.recipeIndexes[allRecipes[i].name] = i;
    if (i >= recipeArray.length) {
      this.inputColumns.push(i);
    }
  }
  const rows = allRecipes.length + 2;
  const cols = items.length + allRecipes.length + 3;
  const recipeMatrix = new Matrix(rows, cols);
  for (var i = 0; i < recipeArray.length; i++) {
    var recipe = recipeArray[i];
    var ings = recipe.getIngredients(spec);
    for (var j = 0; j < ings.length; j++) {
      var ing = ings[j];
      var k = itemIndexes[ing.item.name];
      recipeMatrix.addIndex(i, k, zero.sub(ing.amount));
    }
    for (var j = 0; j < recipe.products.length; j++) {
      var ing = recipe.products[j];
      var k = itemIndexes[ing.item.name];
      recipeMatrix.addIndex(i, k, ing.amount);
    }
    // Recipe tax.
    recipeMatrix.setIndex(i, items.length, minusOne);
  }
  for (var i = 0; i < this.inputRecipes.length; i++) {
    var recipe = this.inputRecipes[i];
    for (var j = 0; j < recipe.products.length; j++) {
      var ing = recipe.products[j];
      var k = itemIndexes[ing.item.name];
      recipeMatrix.addIndex(i + recipeArray.length, k, ing.amount);
    }
  }
  // Add "recipe tax," so that wasted items will be wasted directly.
  // There is no surplus variable for this value.
  recipeMatrix.setIndex(allRecipes.length, items.length, one);
  // Add surplus variables.
  for (var i = 0; i < allRecipes.length; i++) {
    var col = items.length + i + 1;
    recipeMatrix.setIndex(i, col, one);
  }
  recipeMatrix.setIndex(rows - 1, col + 1, one);
  // The matrix. (matrix.js)
  this.matrix = recipeMatrix;
  // Map from item name to row number.
  this.itemIndexes = itemIndexes;
  // List of all recipes in matrix, in matrix column order.
  this.recipes = allRecipes;
  this.lastProblem = null;
  this.lastSolution = null;
}
MatrixSolver.prototype = {
  constructor: MatrixSolver,
  match(products) {
    const result = {};
    for (const itemName in products) {
      if (itemName in this.outputs) {
        result[itemName] = products[itemName];
      }
    }
    return result;
  },
  getPriorityRatio(A) {
    let min = null;
    let max = null;
    for (let i = 0; i < A.mat.length; i++) {
      const x = A.mat[i].abs();
      if (x.isZero()) {
        continue;
      }
      if (min === null || x.less(min)) {
        min = x;
      }
      if (max === null || max.less(x)) {
        max = x;
      }
    }
    return max.div(min);
  },
  setCost(A) {
    // Recipe tax cost.
    A.setIndex(this.recipes.length, A.cols - 1, one);
    const ratio = this.getPriorityRatio(A);
    // Cost == 1 already "spent" on recipe tax.
    let cost = ratio;
    // Maps priority number to column number.
    for (let i = PRIORITY.length - 1; i >= 0; i--) {
      const name = PRIORITY[i];
      const row = this.recipeIndexes[name];
      if (!row) {
        continue;
      }
      A.setIndex(row, A.cols - 1, cost);
      cost = cost.mul(ratio);
    }
  },
  solveFor(products, spec, disabled) {
    const A = this.matrix.copy();
    for (const itemName in products) {
      if (itemName in this.itemIndexes) {
        var col = this.itemIndexes[itemName];
        var rate = products[itemName];
        A.setIndex(A.rows - 1, col, zero.sub(rate));
      }
    }
    // Zero out disabled recipes
    for (const recipeName in disabled) {
      if (recipeName in this.recipeIndexes) {
        var i = this.recipeIndexes[recipeName];
        A.zeroRow(i);
      }
    }
    // Apply productivity effects.
    for (var i = 0; i < this.recipes.length; i++) {
      const recipe = this.recipes[i];
      if (recipe.name in disabled) {
        continue;
      }
      const factory = spec.getFactory(recipe);
      if (factory) {
        const prod = factory.prodEffect(spec);
        if (prod.equal(one)) {
          continue;
        }
        if (useLegacyCalculations) {
          for (var j = 0; j < recipe.products.length; j++) {
            var ing = recipe.products[j];
            var k = this.itemIndexes[ing.item.name];
            A.setIndex(i, k, zero);
          }
          const ings = recipe.getIngredients(spec);
          for (var j = 0; j < ings.length; j++) {
            var ing = ings[j];
            var k = this.itemIndexes[ing.item.name];
            if (k !== undefined) {
              A.setIndex(i, k, zero.sub(ing.amount));
            }
          }
          for (var j = 0; j < recipe.products.length; j++) {
            var ing = recipe.products[j];
            var k = this.itemIndexes[ing.item.name];
            A.addIndex(i, k, ing.amount.mul(prod));
          }
        } else {
          for (var j = 0; j < this.items.length; j++) {
            const n = A.index(i, j);
            if (!zero.less(n)) {
              continue;
            }
            A.setIndex(i, j, n.mul(prod));
          }
        }
      }
    }
    this.setCost(A);
    this.lastProblem = A.copy();
    // Solve.
    simplex(A);
    // Convert array of rates into map from recipe name to rate.
    const solution = {};
    for (var i = 0; i < this.recipes.length; i++) {
      var col = this.items.length + i + 1;
      var rate = A.index(A.rows - 1, col);
      if (zero.less(rate)) {
        solution[this.recipes[i].name] = rate;
      }
    }
    const waste = {};
    for (var i = 0; i < this.outputItems.length; i++) {
      var rate = A.index(A.rows - 1, i);
      if (zero.less(rate)) {
        waste[this.outputItems[i].name] = rate;
      }
    }
    this.lastSolution = A;
    return { solution, waste };
  },
};

module.exports = {
  MatrixSolver,
};
