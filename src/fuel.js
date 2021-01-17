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
const { getItem } = require('./item');

const energySuffixes = ['J', 'kJ', 'MJ', 'GJ', 'TJ', 'PJ'];

function Fuel(name, col, row, item, category, value) {
  this.name = name;
  this.icon_col = col;
  this.icon_row = row;
  this.item = item;
  this.category = category;
  this.value = value;
}
Fuel.prototype = {
  constructor: Fuel,
  valueString() {
    let x = this.value;
    const thousand = RationalFromFloat(1000);
    let i = 0;
    while (thousand.less(x) && i < energySuffixes.length - 1) {
      x = x.div(thousand);
      i++;
    }
    return `${x.toUpDecimal(0)} ${energySuffixes[i]}`;
  },
};

function getFuel(data, items) {
  const fuelCategories = {};
  for (let i = 0; i < data.fuel.length; i++) {
    const fuelName = data.fuel[i];
    const d = data.items[fuelName];
    const fuel = new Fuel(
      fuelName,
      d.icon_col,
      d.icon_row,
      getItem(data, items, fuelName),
      d.fuel_category,
      RationalFromFloat(d.fuel_value),
    );
    let f = fuelCategories[fuel.category];
    if (!f) {
      f = [];
      fuelCategories[fuel.category] = f;
    }
    f.push(fuel);
  }
  for (const category in fuelCategories) {
    fuelCategories[category].sort((a, b) => {
      if (a.value.less(b.value)) {
        return -1;
      } if (b.value.less(a.value)) {
        return 1;
      }
      return 0;
    });
  }
  return fuelCategories;
}

module.exports = {
  getFuel,
};
