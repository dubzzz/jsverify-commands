"use strict";
const assert = require('assert');
const jsc = require('jsverify');
const lazyseq = require("lazy-seq");

const {commands} = require('../../src/arbitrary/commands');

const GENSIZE = 10;
var fakeJscCommand = function(ClassType) {
    return jsc.bless({
        generator: size => new Object({ command: new ClassType(), parameters: [] }),
        shrink: lazyseq.nil,
        show: t => "fake"
    });
};
var fakeClass = function() {
    return function() {};
};

describe('commands', function() {
    describe('generator', function() {
        it('should instantiate an array', function() {
            jsc.assert(jsc.forall(jsc.integer(1, 1024), function(num) {
                const classes = [...Array(num).keys()].map(fakeClass);
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, arbs);
                var v = arb.generator(GENSIZE);
                return Array.isArray(v);
            }));
        });

        it('should instantiate multiple command', function() {
            jsc.assert(jsc.forall(jsc.integer(1, 1024), function(num) {
                const classes = [...Array(num).keys()].map(fakeClass);
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, arbs);
                var v = arb.generator(GENSIZE);
                return v.every(cmd => classes.find(c => cmd.command instanceof c) !== undefined);
            }));
        });
    });
});