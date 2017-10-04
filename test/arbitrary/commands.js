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
var FakeSuccessCommand = function() {};
var FakeFailureCommand = function() {};
var FakeDoNotRunCommand = function() {};

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

        it('should instantiate command elements', function() {
            jsc.assert(jsc.forall(jsc.integer(1, 1024), function(num) {
                const classes = [...Array(num).keys()].map(fakeClass);
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, arbs);
                var v = arb.generator(GENSIZE);
                return v.every(cmd => classes.find(c => cmd.command instanceof c) !== undefined);
            }));
        });
    });
    describe('shrink', function() {
        const classes = [FakeSuccessCommand, FakeDoNotRunCommand, FakeFailureCommand];
        const oneOfClasses = jsc.oneof(classes.map(c => jsc.constant({Cls: c, name: c.name})));
        var fakeCommandsAfterRun = function(classesToGenerate) {
            var fakeGenerated = classesToGenerate.map(c => new Object({command: new c.Cls(), parameters: [], name: c.name}));
            for (var idx = 0 ; idx != fakeGenerated.length ; ++idx) {
                var c = fakeGenerated[idx].command;
                c.hasStarted = !(c instanceof FakeDoNotRunCommand);
                if (c instanceof FakeFailureCommand) {
                    break;
                }
            }
            return fakeGenerated;
        };
        
        it('should replay only played commands', function() {
            jsc.assert(jsc.forall(jsc.array(oneOfClasses), function(classesToGenerate) {
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, arbs);
                const fakeGenerated = fakeCommandsAfterRun(classesToGenerate);
                const generatedContainFailures = fakeGenerated.find(c => c.command instanceof FakeFailureCommand) !== undefined;
                const onlyPlayedCommands = function(arr) {
                    if (arr.length === 0) {
                        return true;
                    }
                    if (generatedContainFailures) {
                        const lastItem = arr.slice(-1)[0].command;
                        return (lastItem instanceof FakeSuccessCommand || lastItem instanceof FakeFailureCommand)
                                && arr.slice(0, -1).every(c => c.command instanceof FakeSuccessCommand);
                    }
                    return arr.slice(0, -1).every(c => c.command instanceof FakeSuccessCommand);
                };
                return arb.shrink(fakeGenerated).every(onlyPlayedCommands);
            }));
        });
        
        it('should replay less commands', function() {
            jsc.assert(jsc.forall(jsc.array(oneOfClasses), function(classesToGenerate) {
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, arbs);
                const fakeGenerated = fakeCommandsAfterRun(classesToGenerate);
                const numStarted = fakeGenerated.filter(c => c.hasStarted === true).length;
                return arb.shrink(fakeGenerated).every(a => a.length <= numStarted);
            }));
        });
        
        /*it('should not reorder commands', function() {
            jsc.assert(jsc.forall(jsc.array(jsc.oneof(classes)), function(classesToGenerate) {
                //TODO
            }));
        });*/
        
        it('should remove hasStarted flags', function() {
            jsc.assert(jsc.forall(jsc.array(oneOfClasses), function(classesToGenerate) {
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, arbs);
                const fakeGenerated = fakeCommandsAfterRun(classesToGenerate);
                return arb.shrink(fakeGenerated).every(a => a.every(c => !c.hasOwnProperty('hasStarted')));
            }));
        });
    });
});