"use strict";

var runall = async function(commands, state, model) {
    for (var idx = 0 ; idx != commands.length ; ++idx) {
        var cm = commands[idx];
        if (cm.command.check(model)) {
            cm.hasStarted = true;
            try {
                if (! await cm.command.run(state, model)) {
                    return false;
                }
            } catch(e) { return false; }
        }
    }
    return true;
};

var runner = function(warmup, teardown) {
    return async function(seed, commands) {
        var {state, model} = await warmup(seed);
        var result = await runall(commands, state, model);
        await teardown(state, model);
        return result;
    };
};

module.exports = {
    runner: runner
};
