"use strict";
const jsc = require('jsverify');

var runall = async function(actions, state, model) {
    for (var idx = 0 ; idx != actions.length ; ++idx) {
        var ac = actions[idx];
        if (ac.check(model)) {
            if (! await ac.run(state, model)) {
                console.error("Test failed @ step #" + idx + " on task " + ac);
                return false;
            }
        }
    }
    return true;
};

var forAllCommandsHelper = function(arbSeed, arbCommands, warmup, teardown) {
    var testNumber = 0;
    return jsc.forall(arbSeed, arbCommands, async function(seed, commands) {
        var actions = commands.map(c => c.command);
        console.log("#" + (++testNumber) + ": " + actions.join(', '));
        var {state, model} = await warmup(seed);
        var result = await runall(actions, state, model);
        await teardown();
        return result;
    });
};
var forallCommandsSeeded = (arbSeed,
                            arbCommands,
                            warmup = async (seed) => { return {state: {}, model: {}}; },
                            teardown = async () => { return; }) => forAllCommandsHelper(arbSeed, arbCommands, warmup, teardown);

module.exports = {
    forallCommands: (...params) => forallCommandsSeeded.apply(this, [jsc.constant(undefined)].concat(params)),
    forallCommandsSeeded: forallCommandsSeeded
};
