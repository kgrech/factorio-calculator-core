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

const bigInt = require('big-integer');

function Rational(p, q) {
  if (q.lesser(bigInt.zero)) {
    p = bigInt.zero.minus(p);
    q = bigInt.zero.minus(q);
  }
  const gcd = bigInt.gcd(p.abs(), q);
  if (gcd.greater(bigInt.one)) {
    p = p.divide(gcd);
    q = q.divide(gcd);
  }
  this.p = p;
  this.q = q;
}
Rational.prototype = {
  constructor: Rational,
  toFloat() {
    return this.p.toJSNumber() / this.q.toJSNumber();
  },
  toString() {
    if (this.q.equals(bigInt.one)) {
      return this.p.toString();
    }
    return `${this.p.toString()}/${this.q.toString()}`;
  },
  toDecimal(maxDigits, roundingFactor) {
    if (maxDigits == null) {
      maxDigits = 3;
    }
    if (roundingFactor == null) {
      roundingFactor = new Rational(bigInt(5), bigInt(10).pow(maxDigits + 1));
    }

    let sign = '';
    let x = this.abs();
    if (this.less(zero)) {
      sign = '-';
    }
    x = x.add(roundingFactor);
    let divmod = x.p.divmod(x.q);
    const integerPart = divmod.quotient.toString();
    let decimalPart = '';
    let fraction = new Rational(divmod.remainder, x.q);
    const ten = new Rational(bigInt(10), bigInt.one);
    while (maxDigits > 0 && !fraction.equal(roundingFactor)) {
      fraction = fraction.mul(ten);
      roundingFactor = roundingFactor.mul(ten);
      divmod = fraction.p.divmod(fraction.q);
      decimalPart += divmod.quotient.toString();
      fraction = new Rational(divmod.remainder, fraction.q);
      maxDigits--;
    }
    if (fraction.equal(roundingFactor)) {
      while (decimalPart[decimalPart.length - 1] === '0') {
        decimalPart = decimalPart.slice(0, decimalPart.length - 1);
      }
    }
    if (decimalPart !== '') {
      return `${sign + integerPart}.${decimalPart}`;
    }
    return sign + integerPart;
  },
  toUpDecimal(maxDigits) {
    const fraction = new Rational(bigInt.one, bigInt(10).pow(maxDigits));
    const divmod = this.divmod(fraction);
    if (!divmod.remainder.isZero()) {
      return this.add(fraction).toDecimal(maxDigits, zero);
    }
    return this.toDecimal(maxDigits, zero);
  },
  toMixed() {
    const divmod = this.p.divmod(this.q);
    if (divmod.quotient.isZero() || divmod.remainder.isZero()) {
      return this.toString();
    }
    return (
      `${divmod.quotient.toString()
      } + ${
        divmod.remainder.toString()
      }/${
        this.q.toString()}`
    );
  },
  isZero() {
    return this.p.isZero();
  },
  isInteger() {
    return this.q.equals(bigInt.one);
  },
  ceil() {
    const divmod = this.p.divmod(this.q);
    let result = new Rational(divmod.quotient, bigInt.one);
    if (!divmod.remainder.isZero()) {
      result = result.add(one);
    }
    return result;
  },
  floor() {
    const divmod = this.p.divmod(this.q);
    let result = new Rational(divmod.quotient, bigInt.one);
    if (result.less(zero) && !divmod.remainder.isZero()) {
      result = result.sub(one);
    }
    return result;
  },
  equal(other) {
    return this.p.equals(other.p) && this.q.equals(other.q);
  },
  less(other) {
    return this.p.times(other.q).lesser(this.q.times(other.p));
  },
  abs() {
    if (this.less(zero)) {
      return this.mul(minusOne);
    }
    return this;
  },
  add(other) {
    return new Rational(
      this.p.times(other.q).plus(this.q.times(other.p)),
      this.q.times(other.q),
    );
  },
  sub(other) {
    return new Rational(
      this.p.times(other.q).subtract(this.q.times(other.p)),
      this.q.times(other.q),
    );
  },
  mul(other) {
    return new Rational(this.p.times(other.p), this.q.times(other.q));
  },
  div(other) {
    return new Rational(this.p.times(other.q), this.q.times(other.p));
  },
  divmod(other) {
    const quotient = this.div(other);
    const div = quotient.floor();
    const mod = this.sub(other.mul(div));
    return { quotient: div, remainder: mod };
  },
  reciprocate() {
    return new Rational(this.q, this.p);
  },
};

function RationalFromString(s) {
  const i = s.indexOf('/');
  if (i === -1) {
    return RationalFromFloat(Number(s));
  }
  const j = s.indexOf('+');
  const q = bigInt(s.slice(i + 1));
  if (j !== -1) {
    const integer = bigInt(s.slice(0, j));
    var p = bigInt(s.slice(j + 1, i)).plus(integer.times(q));
  } else {
    var p = bigInt(s.slice(0, i));
  }
  return new Rational(p, q);
}

// Decimal approximations.
const _one_third = new Rational(bigInt(33333), bigInt(100000));
const _two_thirds = new Rational(bigInt(33333), bigInt(50000));

function RationalFromFloat(x) {
  if (Number.isInteger(x)) {
    return RationalFromFloats(x, 1);
  }
  // Sufficient precision for our data?
  const r = new Rational(bigInt(Math.round(x * 100000)), bigInt(100000));
  // Recognize 1/3 and 2/3 explicitly.
  const divmod = r.divmod(one);
  if (divmod.remainder.equal(_one_third)) {
    return divmod.quotient.add(oneThird);
  } if (divmod.remainder.equal(_two_thirds)) {
    return divmod.quotient.add(twoThirds);
  }
  return r;
}

function RationalFromFloats(p, q) {
  return new Rational(bigInt(p), bigInt(q));
}

var minusOne = new Rational(bigInt.minusOne, bigInt.one);
var zero = new Rational(bigInt.zero, bigInt.one);
var one = new Rational(bigInt.one, bigInt.one);
const half = new Rational(bigInt.one, bigInt(2));
var oneThird = new Rational(bigInt.one, bigInt(3));
var twoThirds = new Rational(bigInt(2), bigInt(3));

module.exports = {
  minusOne,
  zero,
  one,
  half,
  oneThird,
  twoThirds,
  Rational,
  RationalFromFloat,
  RationalFromFloats,
  RationalFromString,
};
