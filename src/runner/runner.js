"use strict";

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

var runner = function(warmup, teardown) {
    return async function(seed, commands) {
        var actions = commands.map(c => c.command);
        var {state, model} = await warmup(seed);
        var result = await runall(actions, state, model);
        await teardown(state, model);
        return result;
    };
};

module.exports = {
    runner: runner
};
