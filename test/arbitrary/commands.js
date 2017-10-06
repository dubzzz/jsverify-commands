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
var FakeSuccessCommand = function(id) { this.id = id; };
var FakeFailureCommand = function(id) { this.id = id; };
var FakeDoNotRunCommand = function(id) { this.id = id; };

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

        it('should instantiate an array with size restriction', function() {
            jsc.assert(jsc.forall(jsc.integer(1, 1024), jsc.integer(1, 1024), function(size, num) {
                const classes = [...Array(num).keys()].map(fakeClass);
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, [size].concat(arbs));
                var v = arb.generator(GENSIZE);
                return Array.isArray(v) && v.length <= size;
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
            var fakeGenerated = classesToGenerate.map((c, idx) => new Object({command: new c.Cls(idx), parameters: [], name: c.name}));
            for (var idx = 0 ; idx != fakeGenerated.length ; ++idx) {
                var c = fakeGenerated[idx].command;
                fakeGenerated[idx].hasStarted = !(c instanceof FakeDoNotRunCommand);
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
                return arb.shrink(fakeGenerated).take(100).every(onlyPlayedCommands);
            }));
        });
        
        it('should suggest shrinks', function() {
            jsc.assert(jsc.forall(jsc.integer(2, 1024), function(num) {
                const arb = commands(fakeJscCommand(FakeSuccessCommand));
                const classesToGenerate = [...Array(num).keys()].map(() => new Object({Cls: FakeSuccessCommand, name: ''}));
                const fakeGenerated = fakeCommandsAfterRun(classesToGenerate);
                return !arb.shrink(fakeGenerated).isNil;
            }));
        });
        
        it('should replay less commands', function() {
            jsc.assert(jsc.forall(jsc.array(oneOfClasses), function(classesToGenerate) {
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, arbs);
                const fakeGenerated = fakeCommandsAfterRun(classesToGenerate);
                const numStarted = fakeGenerated.filter(c => c.hasStarted === true).length;
                return arb.shrink(fakeGenerated).take(100).every(a => a.length <= numStarted);
            }));
        });
        
        it('should not reorder commands', function() {
            jsc.assert(jsc.forall(jsc.array(oneOfClasses), function(classesToGenerate) {
                const arbs = classes.map(fakeJscCommand);
                const arb = commands.apply(this, arbs);
                const fakeGenerated = fakeCommandsAfterRun(classesToGenerate);
                return arb.shrink(fakeGenerated).take(100).every(a => {
                    for (var idx = 1 ; idx < a.length ; ++idx) {
                        if (a[idx-1].command.id >= a[idx].command.id) {
                            return false;
                        }
                    }
                    return true;
                });
            }));
        });
        
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
