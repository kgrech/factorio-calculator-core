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

let subgraphID = 0;

function Subgraph(recipes) {
  this.id = subgraphID;
  subgraphID++;
  this.recipes = recipes;
  this.products = {};
  for (var recipeName in recipes) {
    var recipe = recipes[recipeName];
    for (var i = 0; i < recipe.products.length; i++) {
      var ing = recipe.products[i];
      this.products[ing.item.name] = ing.item;
    }
  }
  this.ingredients = {};
  for (var recipeName in recipes) {
    var recipe = recipes[recipeName];
    for (var i = 0; i < recipe.ingredients.length; i++) {
      var ing = recipe.ingredients[i];
      if (ing.item.name in this.products) {
        continue;
      }
      this.ingredients[ing.item.name] = ing.item;
    }
  }
}
Subgraph.prototype = {
  constructor: Subgraph,
  isInteresting() {
    return (
      Object.keys(this.recipes).length > 1
      || Object.keys(this.products).length > 1
    );
  },
};

function SubgraphMap(spec, recipes) {
  this.groups = {};
  this.extraUses = {};
  for (const recipeName in recipes) {
    const recipe = recipes[recipeName];
    const g = {};
    g[recipeName] = recipe;
    const s = new Subgraph(g);
    this.groups[recipeName] = s;
    const fuelIngredient = recipe.fuelIngredient(spec);
    for (let i = 0; i < fuelIngredient.length; i++) {
      const ing = fuelIngredient[i];
      if (ing.item.name in this.extraUses) {
        this.extraUses[ing.item.name].push(recipe);
      } else {
        this.extraUses[ing.item.name] = [recipe];
      }
      if (ing.item.name in s.products) {
        continue;
      }
      s.ingredients[ing.item.name] = ing.item;
    }
  }
}
SubgraphMap.prototype = {
  constructor: SubgraphMap,
  merge(recipes) {
    const combinedRecipes = {};
    for (let i = 0; i < recipes.length; i++) {
      var recipeName = recipes[i];
      const group = this.groups[recipeName];
      Object.assign(combinedRecipes, group.recipes);
    }
    const newGroup = new Subgraph(combinedRecipes);
    for (var recipeName in combinedRecipes) {
      this.groups[recipeName] = newGroup;
    }
  },
  mergeGroups(groups) {
    const allRecipes = {};
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      for (const recipeName in group.recipes) {
        allRecipes[recipeName] = recipeName;
      }
    }
    this.merge(Object.values(allRecipes));
  },
  get(recipeName) {
    return this.groups[recipeName];
  },
  groupObjects() {
    const groups = {};
    for (const recipeName in this.groups) {
      const group = this.groups[recipeName];
      groups[group.id] = group;
    }
    return groups;
  },
  getInterestingGroups() {
    const result = [];
    const groups = this.groupObjects();
    for (const id in groups) {
      const g = groups[id];
      if (g.isInteresting()) {
        result.push(g.recipes);
      }
    }
    return result;
  },
  neighbors(group, invert) {
    let itemSet;
    if (invert) {
      itemSet = group.products;
    } else {
      itemSet = group.ingredients;
    }
    const seen = {};
    const result = [];
    for (const itemName in itemSet) {
      const item = itemSet[itemName];
      var recipeSet;
      if (invert) {
        recipeSet = item.usesNames;
        if (itemName in this.extraUses) {
          const names = this.extraUses[itemName].map((i) => i.name);
          recipeSet = recipeSet.concat(names);
        }
      } else {
        recipeSet = item.recipeNames;
      }
      const subgroups = {};
      for (let i = 0; i < recipeSet.length; i++) {
        const recipe = recipeSet[i];
        var group = this.get(recipe);
        subgroups[group.id] = group;
      }
      for (const id in subgroups) {
        const g = subgroups[id];
        if (!(id in seen)) {
          seen[id] = g;
          result.push(g);
        }
      }
    }
    return result;
  },
};

function visit(groupmap, group, seen, invert) {
  if (group.id in seen) {
    return [];
  }
  seen[group.id] = group;
  const neighbors = groupmap.neighbors(group, invert);
  const result = [];
  for (let i = 0; i < neighbors.length; i++) {
    const neighbor = neighbors[i];
    const x = visit(groupmap, neighbor, seen, invert);
    Array.prototype.push.apply(result, x);
  }
  result.push(group);
  return result;
}

function findCycles(groupmap) {
  let seen = {};
  const L = [];
  const groups = groupmap.groupObjects();
  for (const id in groups) {
    const group = groups[id];
    const x = visit(groupmap, group, seen, false);
    Array.prototype.push.apply(L, x);
  }
  const components = [];
  seen = {};
  for (let i = L.length - 1; i >= 0; i--) {
    const root = L[i];
    if (root.id in seen) {
      continue;
    }
    const component = visit(groupmap, root, seen, true);
    components.push(component);
  }
  return components;
}

// Map an item to the items that it depends on.
function getItemDeps(item, groupmap, depmap) {
  if (item.name in depmap) {
    return depmap[item.name];
  }
  const groups = {};
  for (let i = 0; i < item.recipeNames.length; i++) {
    const recipeName = item.recipeNames[i];
    var group = groupmap.get(recipeName);
    groups[group.id] = group;
  }
  const deps = {};
  deps[item.name] = item;
  for (const id in groups) {
    var group = groups[id];
    for (const itemName in group.ingredients) {
      const subitem = group.ingredients[itemName];
      const subdeps = getItemDeps(subitem, groupmap, depmap);
      Object.assign(deps, subdeps);
    }
  }
  depmap[item.name] = deps;
  return deps;
}

const PENDING = {};

// Map an item to the items that depend on it.
function getItemProducts(item, groupmap, prodmap) {
  if (item.name in prodmap) {
    return prodmap[item.name];
  }
  const groups = {};
  let uses = item.usesNames;
  if (item.name in groupmap.extraUses) {
    const names = groupmap.extraUses[item.name].map((i) => i.name);
    uses = uses.concat(names);
  }
  for (let i = 0; i < uses.length; i++) {
    const recipe = uses[i];
    var group = groupmap.get(recipe);
    groups[group.id] = group;
  }
  const prods = {};
  prods[item.name] = item;
  prodmap[item.name] = PENDING;
  for (const id in groups) {
    var group = groups[id];
    for (const itemName in group.products) {
      const subitem = group.products[itemName];
      const subprods = getItemProducts(subitem, groupmap, prodmap);
      if (subprods !== PENDING) {
        Object.assign(prods, subprods);
      }
    }
  }
  prodmap[item.name] = prods;
  return prods;
}

function detectMerge(g, links, toMerge) {
  for (let i = 0; i < links.length - 1; i++) {
    const x = links[i];
    for (let j = i + 1; j < links.length; j++) {
      const y = links[j];
      if (x.a !== y.a && x.b !== y.b) {
        toMerge[g.id] = g;
        return true;
      }
    }
  }
  return false;
}

function findGroups(spec, items, recipes) {
  const groups = new SubgraphMap(spec, recipes);
  // 1) Condense all recipes that produce a given item.
  for (var itemName in items) {
    var item = items[itemName];
    if (item.recipeNames.length > 1) {
      groups.merge(item.recipeNames);
    }
  }

  // Get the "simple" groups, which are used for display purposes.
  const simpleGroups = groups.getInterestingGroups();

  // 2) Condense all recipe cycles.
  const groupCycles = findCycles(groups);
  for (var i = 0; i < groupCycles.length; i++) {
    const cycle = groupCycles[i];
    groups.mergeGroups(cycle);
  }

  // 3) Condense any groups which have a multivariate relationship, including
  //    recipes which are between the two.
  const itemDeps = {};
  const itemProds = {};
  for (var itemName in items) {
    var item = items[itemName];
    if (!(itemName in itemDeps)) {
      getItemDeps(item, groups, itemDeps);
    }
    if (!(itemName in itemProds)) {
      getItemProducts(item, groups, itemProds);
    }
  }

  const groupObjs = groups.groupObjects();
  const itemGroups = {};
  for (var id in groupObjs) {
    var group = groupObjs[id];
    for (const prodID in group.products) {
      var item = group.products[prodID];
      itemGroups[item.name] = group;
    }
  }
  let mergings = [];
  for (var id in groupObjs) {
    var group = groupObjs[id];
    if (!group.isInteresting()) {
      continue;
    }
    const matches = {};
    for (var itemName in group.ingredients) {
      var item = group.ingredients[itemName];
      const deps = itemDeps[item.name];
      for (var depName in deps) {
        var dep = deps[depName];
        var g = itemGroups[depName];
        if (!g.isInteresting()) {
          continue;
        }
        const pair = { a: item, b: dep };
        if (g.id in matches) {
          matches[g.id].push(pair);
        } else {
          matches[g.id] = [pair];
        }
      }
    }
    const toMerge = {};
    let performMerge = false;
    for (const matchID in matches) {
      var g = groupObjs[matchID];
      const links = matches[matchID];
      if (detectMerge(g, links, toMerge)) {
        performMerge = true;
      }
    }
    if (performMerge) {
      const groupsToMerge = {};
      groupsToMerge[group.id] = group;
      const allDeps = {};
      for (var itemName in group.ingredients) {
        for (var depName in itemDeps[itemName]) {
          var dep = itemDeps[itemName][depName];
          allDeps[depName] = dep;
        }
      }
      for (var id in toMerge) {
        var g = toMerge[id];
        groupsToMerge[g.id] = g;
        for (var itemName in g.products) {
          for (const prodName in itemProds[itemName]) {
            if (prodName in g.products) {
              continue;
            }
            if (!(prodName in allDeps)) {
              continue;
            }
            const prodGroup = itemGroups[prodName];
            groupsToMerge[prodGroup.id] = prodGroup;
          }
        }
      }
      mergings.push(groupsToMerge);
    }
  }
  let merge = true;
  while (merge) {
    merge = false;
    const result = [];
    while (mergings.length > 0) {
      const current = mergings.pop();
      const newMergings = [];
      for (var i = 0; i < mergings.length; i++) {
        const x = mergings[i];
        let disjoint = true;
        for (var id in current) {
          if (id in x) {
            disjoint = false;
            break;
          }
        }
        if (disjoint) {
          newMergings.push(x);
        } else {
          merge = true;
          for (var id in x) {
            var g = x[id];
            current[id] = g;
          }
        }
      }
      result.push(current);
      mergings = newMergings;
    }
    mergings = result;
  }
  for (var i = 0; i < mergings.length; i++) {
    const s = Object.values(mergings[i]);
    groups.mergeGroups(s);
  }

  return { groups: groups.getInterestingGroups(), simple: simpleGroups };
}

module.exports = {
  findGroups,
};
