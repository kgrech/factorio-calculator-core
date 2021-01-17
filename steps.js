/*Copyright 2015-2019 Kirk McDonald

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/
'use strict';

// The name "steps" dates back to the earliest versions of this calculator and
// is now probably a misnomer. It originally referred to the "steps" you had
// to take to construct any given item. This purpose has been replaced with the
// visualization, leaving only the list of total item-rates, which has since
// been expanded to include the infrastructure needed to transport those
// item-rates.

const {
  zero,
  one,
  RationalFromFloat,
  RationalFromFloats,
} = require('./rational');

// For pipe segment of the given length, returns maximum throughput as fluid/s.
function pipeThroughput(length) {
  if (length.equal(zero)) {
    // A length of zero represents a solid line of pumps.
    return RationalFromFloat(12000);
  } else if (length.less(RationalFromFloat(198))) {
    var numerator = RationalFromFloat(50)
      .mul(length)
      .add(RationalFromFloat(150));
    var denominator = RationalFromFloat(3).mul(length).sub(one);
    return numerator.div(denominator).mul(RationalFromFloat(60));
  } else {
    return RationalFromFloat(60 * 4000).div(RationalFromFloat(39).add(length));
  }
}

// Throughput at which pipe length equation changes.
var pipeThreshold = RationalFromFloats(4000, 236);

// For fluid throughput in fluid/s, returns maximum length of pipe that can
// support it.
function pipeLength(throughput) {
  throughput = throughput.div(RationalFromFloat(60));
  if (RationalFromFloat(200).less(throughput)) {
    return null;
  } else if (RationalFromFloat(100).less(throughput)) {
    return zero;
  } else if (pipeThreshold.less(throughput)) {
    var numerator = throughput.add(RationalFromFloat(150));
    var denominator = RationalFromFloat(3)
      .mul(throughput)
      .sub(RationalFromFloat(50));
    return numerator.div(denominator);
  } else {
    return RationalFromFloat(4000).div(throughput).sub(RationalFromFloat(39));
  }
}

module.exports = {
  pipeThroughput,
  pipeLength,
};
