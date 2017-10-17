"use strict";
const assert = require('assert');
const jsc = require('jsverify');

const {command} = require('../../src/arbitrary/command');

const GENSIZE = 10;
function MyEmptyClass(...params) {
    this.params = params;
};

const knownArbs = {
    "bool" : {
        arb: jsc.bool,
        check: v => v === true || v === false
    },
    "nat"  : {
        arb: jsc.nat,
        check: v => typeof(v) === 'number'
    },
    "oneof": {
        arb: jsc.oneof(jsc.constant(5), jsc.constant(42)),
        check: v => v === 5 || v === 42
    },
    "array": {
        arb: jsc.array(jsc.nat),
        check: v => Array.isArray(v) && v.find(i => typeof(i) !== 'number') === undefined
    },
};
const allowedArbs = jsc.oneof(...Object.keys(knownArbs).map(v => jsc.constant(v)));

var buildCommandFor = function(CommandType, arbsName) {
    return command(...[CommandType].concat(arbsName.map(v => knownArbs[v].arb)));
};

var areRightTypes = function(params, arbsName) {
    return params.every((e, i) => knownArbs[arbsName[i]].check(e));
};

var areSameParams = function(params1, params2) {
    return params1.length === params2.length
        && params1.every((e, i) => e === params2[i]);
};

var areEquivalentParams = function(params1, params2) {
    return params1.length === params2.length
        && params1.every((e, i) => Array.isArray(e) ? e.every((ee, j) => ee === params2[i][j]) : e === params2[i]);
};

describe('command', function() {
    describe('generator', function() {
        it('should instantiate an object from the given class', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var v = arb.generator(GENSIZE);
                return v.command instanceof MyEmptyClass;
            }));
        });
        
        it('should call constructor with the right number of parameters', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var v = arb.generator(GENSIZE);
                return v.command.params.length === arbsName.length;
            }));
        });
                
        it('should call constructor with the right types', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var v = arb.generator(GENSIZE);
                return areRightTypes(v.command.params, arbsName);
            }));
        });

        it('should keep track of parameters', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var v = arb.generator(GENSIZE);
                return areSameParams(v.parameters, v.command.params);
            }));
        });

        it('should provide a shrink method', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var v = arb.generator(GENSIZE);
                return typeof(v.shrink) === "function";
            }));
        });
    });
    describe('shrink', function() {
        it('should instantiate objects from the given class', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var generated = arb.generator(GENSIZE);
                return arb.shrink(generated).every(v => v.command instanceof MyEmptyClass);
            }));
        });

        it('should call constructor with the right number of parameters', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var generated = arb.generator(GENSIZE);
                return arb.shrink(generated).every(v => v.command.params.length === arbsName.length);
            }));
        });
        
        it('should call constructor with the right types', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var generated = arb.generator(GENSIZE);
                return arb.shrink(generated).every(v => areRightTypes(v.command.params, arbsName));
            }));
        });

        it('should keep track of parameters', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var generated = arb.generator(GENSIZE);
                return arb.shrink(generated).every(v => areSameParams(v.parameters, v.command.params));
            }));
        });
        
        it('should provide a shrink method on all shrinks', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var generated = arb.generator(GENSIZE);
                return arb.shrink(generated).every(v => typeof(v.shrink) === "function");
            }));
        });

        it('should provide equivalent shrink method on instance', function() {
            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = buildCommandFor(MyEmptyClass, arbsName);
                var generated = arb.generator(GENSIZE);
                var viaShrinkMethod = generated.shrink();
                viaShrinkMethod = Array.isArray(viaShrinkMethod) ? viaShrinkMethod : viaShrinkMethod.toArray();
                var arbShrink = arb.shrink(generated);
                arbShrink = Array.isArray(arbShrink) ? arbShrink : arbShrink.toArray();
                return arbShrink.length === viaShrinkMethod.length
                    && arbShrink.every((v, idx) => areEquivalentParams(v.command.params, viaShrinkMethod[idx].command.params));
            }));
        });
    });
});