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

const { sorted } = require('./sort');

function getItemGroups(items, data) {
  // {groupName: {subgroupName: [item]}}
  const itemGroupMap = {};
  for (const itemName in items) {
    const item = items[itemName];
    var group = itemGroupMap[item.group];
    if (!group) {
      group = {};
      itemGroupMap[item.group] = group;
    }
    let subgroup = group[item.subgroup];
    if (!subgroup) {
      subgroup = [];
      group[item.subgroup] = subgroup;
    }
    subgroup.push(item);
  }
  const itemGroups = [];
  const groupNames = sorted(itemGroupMap, (k) => data.groups[k].order);
  for (let i = 0; i < groupNames.length; i++) {
    var groupName = groupNames[i];
    const subgroupNames = sorted(itemGroupMap[groupName], (k) => data.groups[groupName].subgroups[k]);
    var group = [];
    itemGroups.push(group);
    for (let j = 0; j < subgroupNames.length; j++) {
      const subgroupName = subgroupNames[j];
      var items = itemGroupMap[groupName][subgroupName];
      items = sorted(items, (element) => element.order);
      group.push(items);
    }
  }
  return itemGroups;
}

module.exports = {
  getItemGroups,
};
