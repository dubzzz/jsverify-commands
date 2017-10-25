"use strict";
const assert = require('assert');
const jsc = require('jsverify');
const lazyseq = require("lazy-seq");

const Metrics = require('../../src/decorator/metrics');

const GENSIZE = 10;

describe('metrics', function() {
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
});
