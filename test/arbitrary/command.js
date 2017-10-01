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
            const arb = command(MyEmptyClass, jsc.nat, jsc.array(jsc.nat), jsc.constant(5));
            var v = arb.generator(GENSIZE);
            assert.ok(v.command instanceof MyEmptyClass, 'command instance of MyEmptyClass');
            assert.ok(Array.isArray(v.parameters), 'parameters is an array');
            assert.equal(v.parameters.length, 3, 'parameters array contains 3 elements');
            assert.equal(typeof(v.parameters[0]), "number", 'first parameter is a number');
            assert.ok(Array.isArray(v.parameters[1]), 'second parameter is an array');
            assert.equal(typeof(v.parameters[2]), "number", 'third parameter is a number');
            assert.deepEqual(v.command.params, v.parameters, "parameters are the one used during instantiation");
        });
    });
});