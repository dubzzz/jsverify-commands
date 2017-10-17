const assert = require('assert');

const jsc = require('jsverify');
const jscCommands = require('../../src/jscCommands');

const Circular = require('./Circular');

const IsEmptyCommand = require('./commands/IsEmptyCommand');
const IsFullCommand = require('./commands/IsFullCommand');
const PopCommand = require('./commands/PopCommand');
const PushCommand = require('./commands/PushCommand');
const SizeCommand = require('./commands/SizeCommand');

describe('Circular-queue', function() {
    it('should confirm commands', function() {
        var commands = jscCommands.commands(
            jscCommands.command(IsEmptyCommand),
            jscCommands.command(IsFullCommand),
            jscCommands.command(PopCommand),
            jscCommands.command(PushCommand, jsc.nat),
            jscCommands.command(SizeCommand));
        var warmup = (num) => new Object({
            state: new Circular(num),
            model: {entries: [], maxEntries: num}
        });
        var teardown = () => {};
        return jsc.assert(jscCommands.forall(jsc.integer(1, 64), commands, warmup, teardown));
    });
});
