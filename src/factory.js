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
/* eslint max-classes-per-file: ["error", 4] */

const {
  half,
  one,
  RationalFromFloat,
  RationalFromFloats,
} = require('./rational');

class Factory {
  constructor(factoryDef, spec, recipe, moduleSpec) {
    this.recipe = recipe;
    this.name = factoryDef.name;
    this.factory = factoryDef;

    const defaultModules = moduleSpec[recipe.name]
      ? moduleSpec[recipe.name]
      : spec.defaultModules;
    this.setModules(factoryDef, defaultModules);

    this.beaconModule = spec.defaultBeacon;
    this.beaconCount = spec.defaultBeaconCount;
  }

  setModules(factoryDef, definedModules) {
    this.modules = [];
    definedModules
      .forEach((module) => {
        if (this.modules.length < factoryDef.moduleSlots) {
          if (module && module != null && module.canUse(this.recipe)) {
            this.modules.push(module);
          } else {
            this.modules.push(null);
          }
        }
      });
    for (let i = this.modules.length; i < factoryDef.moduleSlots; i += 1) {
      this.modules.push(null);
    }
  }

  getModule(index) {
    return this.modules[index];
  }

  // Returns true if the module change requires a recalculation.
  setModule(index, module) {
    if (index >= this.modules.length) {
      return false;
    }
    const oldModule = this.modules[index];
    this.modules[index] = module;
    return (oldModule && oldModule.hasProdEffect()) || (module && module.hasProdEffect());
  }

  speedEffect() {
    let speed = this.modules
      .filter((module) => module)
      .reduce((acc, module) => acc.add(module.speed), one);
    if (this.modules.length > 0) {
      const { beaconModule } = this;
      if (beaconModule) {
        speed = speed.add(beaconModule.speed.mul(this.beaconCount).mul(half));
      }
    }
    return speed;
  }

  prodEffect() {
    return this.modules
      .filter((module) => module)
      .reduce((acc, module) => acc.add(module.productivity), one);
  }

  powerEffect() {
    let power = this.modules
      .filter((module) => module)
      .reduce((acc, module) => acc.add(module.power), one);
    if (this.modules.length > 0) {
      const { beaconModule } = this;
      if (beaconModule) {
        power = power.add(beaconModule.power.mul(this.beaconCount).mul(half));
      }
    }
    const minimum = RationalFromFloats(1, 5);
    if (power.less(minimum)) {
      power = minimum;
    }
    return power;
  }

  powerUsage(spec, count) {
    let power = this.factory.energyUsage;
    if (this.factory.fuel) {
      return { fuel: this.factory.fuel, power: power.mul(count) };
    }
    // Default drain value.
    const drain = power.div(RationalFromFloat(30));
    const divmod = count.divmod(one);
    power = power.mul(count);
    if (!divmod.remainder.isZero()) {
      const idle = one.sub(divmod.remainder);
      power = power.add(idle.mul(drain));
    }
    power = power.mul(this.powerEffect(spec));
    return { fuel: 'electric', power };
  }

  recipeRate(spec, recipe) {
    return recipe.time
      .reciprocate()
      .mul(this.factory.speed)
      .mul(this.speedEffect(spec));
  }
}

class Miner extends Factory {
  recipeRate(spec, recipe) {
    const miner = this.factory;
    return miner.mining_speed
      .div(recipe.mining_time)
      .mul(this.speedEffect(spec));
  }

  prodEffect(spec) {
    const prod = Factory.prototype.prodEffect.call(this, spec);
    return prod.add(spec.miningProd);
  }
}

const rocketLaunchDuration = RationalFromFloats(2475, 60);

function launchRate(spec, partRecipe) {
  const partItem = partRecipe.products[0].item;
  const partFactory = spec.getFactory(partRecipe);
  const gives = partRecipe.gives(partItem, spec);
  // The base rate at which the silo can make rocket parts.
  const rate = Factory.prototype.recipeRate.call(partFactory, spec, partRecipe);
  // Number of times to complete the rocket part recipe per launch.
  const perLaunch = RationalFromFloat(100).div(gives);
  // Total length of time required to launch a rocket.
  const time = perLaunch.div(rate).add(rocketLaunchDuration);
  const launchRateNew = time.reciprocate();
  const partRate = perLaunch.div(time);
  return { part: partRate, launch: launchRateNew };
}

class RocketLaunch extends Factory {
  recipeRate(spec) {
    const { partRecipe } = this.factory;
    return launchRate(spec, partRecipe).launch;
  }
}

class RocketSilo extends Factory {
  recipeRate(spec) {
    const { partRecipe } = this.factory;
    return launchRate(spec, partRecipe).part;
  }
}

module.exports = {
  Factory,
  Miner,
  RocketLaunch,
  RocketSilo,
};
