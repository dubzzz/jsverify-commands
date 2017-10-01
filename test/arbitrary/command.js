const assert = require('assert');
const jsc = require('jsverify');

const {command} = require('../../src/arbitrary/command');

const GENSIZE = 10;
function MyEmptyClass(...params) {
    this.params = params;
};

describe('command', function() {
    describe('generator', function() {
        it('should instantiate an object from the given class', function() {
            const arb = command(MyEmptyClass);
            var v = arb.generator(GENSIZE);
            assert.ok(v.command instanceof MyEmptyClass, 'command instance of MyEmptyClass');
            assert.ok(Array.isArray(v.parameters), 'parameters is an array');
            assert.equal(v.parameters.length, 0, 'parameters array is empty');
        });

        it('should instantiate using asked parameter types', function() {
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
            const allowedArbs = jsc.oneof.apply(this, Object.keys(knownArbs).map(v => jsc.constant(v)));

            jsc.assert(jsc.forall(jsc.array(allowedArbs), function(arbsName) {
                const arb = command.apply(this, [MyEmptyClass].concat(arbsName.map(v => knownArbs[v].arb)));
                var v = arb.generator(GENSIZE);
                var success = true;

                success = success && v.command instanceof MyEmptyClass;
                success = success && Array.isArray(v.parameters);
                success = success && v.parameters.length === arbsName.length;
                success = success && v.command.params.length === arbsName.length;

                for (var idx = 0 ; idx !== arbsName.length ; ++idx) {
                    success = success && knownArbs[arbsName[idx]].check(v.parameters[idx]);
                    success = success && v.parameters[idx] == v.command.params[idx];
                }

                return success;
            }));
        });
    });
});