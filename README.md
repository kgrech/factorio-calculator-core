# Factorio Calculator Algorithm [![Build Status](https://travis-ci.com/kgrech/factorio-calculator-core.svg?branch=master)](https://travis-ci.com/kgrech/factorio-calculator-core)

## Project history

This is the repository for the Factorio Calculator algorithm. It is a core algorithm to create a tool for calculating resource requirements and production ratios in the game [Factorio](https://factorio.com/). The package contains pure javascript implementation of algorithm and not a UI part.

The algorithm is developed by Kirk McDonald as part of [Factorio Calculator](https://kirkmcdonald.github.io/calc.html) project. The code is forked from the original Factorio Calculator [repository](https://github.com/KirkMcDonald/kirkmcdonald.github.io).

The following changes are made to the original code:
- removed the code related to the DOM document manipulation and html code.
- Avoid usage of global variables originally defined in settings.js and keeping them inside the FactorySpec object.
- refactored item class to keep the recipes and uses names instead of objects, avoiding the graph structure and making it serializable.
- Enforced basic linter rules for modern javascript
- Packaged and published npm package. 


## Usage of the package

In order to add the library in your npm project simply type:
```
npm install --save @kgrech/factorio-calculator-core
```

Please see example of minimal usage of the package in the [example](https://github.com/kgrech/factorio-calculator-core/tree/master/example) subfolder.

## Available APIs

- FactorySpec
- Item
- Module
- Rational
- RationalFromFloat
- Recipe
- Solver
- alignCount
- alignPower
- alignRate
- displayCount
- displayRate
- formatName
- getRateAndFactories
- getRate
- getFactories
- getBelts
- getCategorizedFactories
- getFuel
- getFuelUsers
- getGroups
- getItemGroups
- getItemRates
- getModules 
- getRecipeGraph
- getSprites
- one
- pipeLength
- pipeThroughput
- zero
- gameDataVanilla110
- gameDataVanilla110Expensive
- gameDataVanilla100
- gameDataVanilla100Expensive



## npmjs.com package page
See [@kgrech/factorio-calculator-core](https://www.npmjs.com/package/@kgrech/factorio-calculator-core) package page.