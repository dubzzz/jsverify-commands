"use strict";

const runall = async function(commands, state, model) {
    for (let idx = 0 ; idx != commands.length ; ++idx) {
        const cm = commands[idx];
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

const runner = function(warmup, teardown) {
    return async function(seed, commands) {
        const {state, model} = await warmup(seed);
        const result = await runall(commands, state, model);
        await teardown(state, model);
        return result;
    };
};

module.exports = {
    runner: runner
};
