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

const { zero } = require('./rational');

function Requirements(rate, item) {
  this.rate = rate;
  this.item = item;
  this.dependencies = [];
}
Requirements.prototype = {
  constructor: Requirements,
  add(reqs, suppress) {
    if (reqs.item && !suppress) {
      this.dependencies.push(reqs);
    }
  },
};

function Totals(rate, item) {
  this.reqs = new Requirements(rate, item);
  // Maps recipe name to its required rate.
  this.totals = {};
  // Maps item name to its as-yet-unfulfilled rate.
  this.unfinished = {};
  // Maps item name to rate at which it will be wasted.
  this.waste = {};
  this.topo = [];
}
Totals.prototype = {
  constructor: Totals,
  combine(other, suppress) {
    this.reqs.add(other.reqs, suppress);
    let newTopo = [];
    for (let i = 0; i < this.topo.length; i++) {
      var recipeName = this.topo[i];
      if (!(recipeName in other.totals)) {
        newTopo.push(recipeName);
      }
    }
    newTopo = newTopo.concat(other.topo);
    for (var recipeName in other.totals) {
      this.add(recipeName, other.totals[recipeName]);
    }
    for (var itemName in other.unfinished) {
      this.addUnfinished(itemName, other.unfinished[itemName]);
    }
    for (var itemName in other.waste) {
      this.addWaste(itemName, other.waste[itemName]);
    }
    this.topo = newTopo;
  },
  add(recipeName, rate, notopo) {
    this.topo.push(recipeName);
    this.totals[recipeName] = (this.totals[recipeName] || zero).add(rate);
  },
  addUnfinished(itemName, rate) {
    this.unfinished[itemName] = (this.unfinished[itemName] || zero).add(rate);
  },
  addWaste(itemName, rate) {
    this.waste[itemName] = (this.waste[itemName] || zero).add(rate);
  },
  get(recipeName) {
    return this.totals[recipeName];
  },
  getWaste(itemName) {
    const waste = this.waste[itemName];
    if (!waste) {
      return zero;
    }
    return waste;
  },
};

module.exports = {
  Totals,
};
