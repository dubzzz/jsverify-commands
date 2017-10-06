"use strict";
const jsc = require('jsverify');

var runall = async function(actions, state, model) {
    for (var idx = 0 ; idx != actions.length ; ++idx) {
        var ac = actions[idx];
        if (ac.check(model)) {
            ac.hasStarted = true;
            if (! await ac.run(state, model)) {
                return false;
            }
        }
    }
    return true;
};

var forallImpl = function(arbSeed, arbCommands, warmup, teardown) {
    return jsc.forall(arbSeed, arbCommands, async function(seed, commands) {
        var actions = commands.map(c => c.command);
        var {state, model} = await warmup(seed);
        var result = await runall(actions, state, model);
        await teardown();
        return result;
    });
};

var DEFAULT_SEED_GEN = jsc.constant(undefined);
var DEFAULT_WARMUP = seed => new Object({state: {}, model: {}});
var DEFAULT_TEARDOWN = () => {};

var isGenerator = function(obj) {
    return obj !== undefined && obj.generator !== undefined;
};
var forall = function(...params) {
    if (params.length === 0 || ! isGenerator(params[0])) {
        throw "forall requires at least a commands generator as first argument";
    }
    if (! isGenerator(params[1])) {
        return forallImpl(DEFAULT_SEED_GEN, params[0], params[1] || DEFAULT_WARMUP, params[2] || DEFAULT_TEARDOWN);
    }
    return forallImpl(params[0], params[1], params[2] || DEFAULT_WARMUP, params[3] || DEFAULT_TEARDOWN);
};

module.exports = {
    forall: forall
};
