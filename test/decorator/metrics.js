"use strict";
const assert = require('assert');
const jsc = require('jsverify');
const lazyseq = require("lazy-seq");

const Metrics = require('../../src/decorator/metrics');

const GENSIZE = 10;

describe('metrics', function() {
    describe('decorate', function() {
        it('should forward calls to underlying generator', function() {
            let callGenerator = 0;
            const arb = jsc.bless({
                generator: size => {
                    ++callGenerator;
                    return [];
                }
            });
            Metrics.decorate(arb, {}).generator(GENSIZE);
            assert.equal(callGenerator, 1);
        });
        it('should forward calls to underlying shrink', function() {
            let callShrink = 0;
            const arb = jsc.bless({
                generator: size => [],
                shrink: arr => {
                    ++callShrink;
                    return lazyseq.nil;
                }
            });
            Metrics.decorate(arb, {}).shrink([]);
            assert.equal(callShrink, 1);
        });
        it('should forward calls to underlying command', function() {
            let callCheck = 0;
            let callRun = 0;
            const CountingCommand = {
                command: {
                    check: () => {
                        ++callCheck;
                        return true;
                    },
                    run: () => {
                        ++callRun;
                        return true;
                    }
                }
            };
            const decoratorArb = Metrics.decorate(jsc.constant([CountingCommand]), {});
            const command = decoratorArb.generator(GENSIZE)[0];
            
            command.command.check();
            assert.equal(callCheck, 1);
            assert.equal(callRun, 0);
                        
            command.command.run();
            assert.equal(callCheck, 1);
            assert.equal(callRun, 1);
        });
        it('should count calls to underlying generator/shrink', function() {
            const buildDummyCmd = function(shrink) {
                return {
                    command: {
                        check: () => {},
                        run: () => {}
                    },
                    shrink: shrink
                };
            };
            const commandGen = jsc.bless({
                generator: size => buildDummyCmd(commandGen.shrink),
                shrink: cmd => lazyseq.fromArray([
                    buildDummyCmd(commandGen.shrink),
                    buildDummyCmd(commandGen.shrink)])
            });
            const arb = jsc.bless({
                generator: size => [commandGen.generator(size)],
                shrink: arr => arr[0].shrink(arr[0]).map(d => [d])
            });
            let recorded = {};
            const decorator = Metrics.decorate(arb, recorded);
            assert.equal(Object.keys(recorded).length, 0, "Commands are only recorded when encountered");
            
            const generated = decorator.generator(GENSIZE);
            assert.deepEqual(recorded[generated[0].command.constructor.name], {
                generated: 1,
                shrink: 0,
                check: {failed: 0, exception: 0, success: 0},
                run: {failed: 0, exception: 0, success: 0}
            });
            
            const shrinks = decorator.shrink(generated);
            assert.deepEqual(recorded[generated[0].command.constructor.name], {
                generated: 2, //increased because shrinks.head() is already built
                shrink: 1,
                check: {failed: 0, exception: 0, success: 0},
                run: {failed: 0, exception: 0, success: 0}
            });

            shrinks.tail();
            assert.deepEqual(recorded[generated[0].command.constructor.name], {
                generated: 3,
                shrink: 1,
                check: {failed: 0, exception: 0, success: 0},
                run: {failed: 0, exception: 0, success: 0}
            });
        });
        it('should count calls', function() {
            const rawArb = jsc.array(jsc.oneof([
                "CheckFail", "CheckThrow", "RunOk", "RunFail", "RunThrow",
                "AnonymousCheckFail", "AnonymousCheckThrow", "AnonymousRunOk", "AnonymousRunFail", "AnonymousRunThrow"
            ].map(jsc.constant)));

            return jsc.assert(jsc.forall(rawArb, async function(commands) {
                let expected = {};
                const increaseGenerated = function(key) {
                    expected[key] = expected[key] || {
                        generated: 0,
                        shrink: 0,
                        check: {failed: 0, exception: 0, success: 0},
                        run: {failed: 0, exception: 0, success: 0}
                    };
                    ++expected[key].generated;
                }
                const CheckFailCommand = function(logit = "CheckFailCommand") {
                    increaseGenerated(logit);
                    this.check = () => {
                        ++expected[logit].check.failed;
                        return false;
                    };
                    this.run = () => {
                        ++expected[logit].run.success;
                        return true;
                    };
                };
                const CheckThrowCommand = function(logit = "CheckThrowCommand") {
                    increaseGenerated(logit);
                    this.check = () => {
                        ++expected[logit].check.exception;
                        throw "CheckThrowCommand";
                    };
                    this.run = () => {
                        ++expected[logit].run.success;
                        return true;
                    };
                };
                const RunOkCommand = function(logit = "RunOkCommand") {
                    increaseGenerated(logit);
                    this.check = () => {
                        ++expected[logit].check.success;
                        return true;
                    };
                    this.run = () => {
                        ++expected[logit].run.success;
                        return true;
                    };
                };
                const RunFailCommand = function(logit = "RunFailCommand") {
                    increaseGenerated(logit);
                    this.check = () => {
                        ++expected[logit].check.success;
                        return true;
                    };
                    this.run = () => {
                        ++expected[logit].run.failed;
                        return false;
                    };
                };
                const RunThrowCommand = function(logit = "RunThrowCommand") {
                    increaseGenerated(logit);
                    this.check = () => {
                        ++expected[logit].check.success;
                        return true;
                    };
                    this.run = () => {
                        ++expected[logit].run.exception;
                        throw "RunThrow";
                    };
                };
                const Anonymous = function(ctor) {
                    const under = new ctor("Anonymous");
                    this.check = () => under.check(),
                    this.run = () => under.run()
                };
                const commandsMapping = {
                    CheckFail: () => new CheckFailCommand(),
                    CheckThrow: () => new CheckThrowCommand(),
                    RunOk: () => new RunOkCommand(),
                    RunFail: () => new RunFailCommand(),
                    RunThrow: () => new RunThrowCommand(),
                    AnonymousCheckFail: () => new Anonymous(CheckFailCommand),
                    AnonymousCheckThrow: () => new Anonymous(CheckThrowCommand),
                    AnonymousRunOk: () => new Anonymous(RunOkCommand),
                    AnonymousRunFail: () => new Anonymous(RunFailCommand),
                    AnonymousRunThrow: () => new Anonymous(RunThrowCommand)
                };
                
                const underlyingArb = jsc.constant(commands.map(name => new Object({command: commandsMapping[name]()})));
                let recorded = {};
                const decorator = Metrics.decorate(underlyingArb, recorded);
                const generated = decorator.generator(GENSIZE);
                for (var idx = 0 ; idx !== generated.length ; ++idx) {
                    try {
                        const cmd = generated[idx].command;
                        cmd.check() && await cmd.run();
                    }
                    catch(err) {}
                    finally {}
                }
                assert.deepEqual(recorded, expected);
                return true;
            }));
        });
    });
});
