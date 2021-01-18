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

const { RationalFromFloat } = require('./rational');

function Module(name, col, row, category, order, productivity, speed, power, limit) {
  // Other module effects not modeled by this calculator.
  this.name = name;
  this.icon_col = col;
  this.icon_row = row;
  this.category = category;
  this.order = order;
  this.productivity = productivity;
  this.speed = speed;
  this.power = power;
  this.limit = {};
  if (limit) {
    for (let i = 0; i < limit.length; i += 1) {
      this.limit[limit[i]] = true;
    }
  }
}
Module.prototype = {
  constructor: Module,
  shortName() {
    return this.name[0] + this.name[this.name.length - 1];
  },
  canUse(recipe) {
    if (recipe.allModules()) {
      return true;
    }
    if (Object.keys(this.limit).length > 0) {
      return recipe.name in this.limit;
    }
    return true;
  },
  canBeacon() {
    return this.productivity.isZero();
  },
  hasProdEffect() {
    return !this.productivity.isZero();
  },
};

function getModules(data) {
  const modules = [];
  for (let i = 0; i < data.modules.length; i += 1) {
    const name = data.modules[i];
    const item = data.items[name];
    const { effect } = item;
    const { category } = item;
    const { order } = item;
    const speed = RationalFromFloat((effect.speed || {}).bonus || 0);
    const productivity = RationalFromFloat((effect.productivity || {}).bonus || 0);
    const power = RationalFromFloat((effect.consumption || {}).bonus || 0);
    const limit = item.limitation;
    modules.push(new Module(
      name,
      item.icon_col,
      item.icon_row,
      category,
      order,
      productivity,
      speed,
      power,
      limit,
    ));
  }
  return modules;
}

module.exports = {
  getModules,
  Module,
};
