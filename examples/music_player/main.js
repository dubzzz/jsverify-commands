const assert = require('assert');

const jsc = require('jsverify');
const jscCommands = require('../../src/jscCommands');

const MusicPlayer = require('./MusicPlayer');

const PlayCommand = require('./commands/PlayCommand');
const PauseCommand = require('./commands/PauseCommand');
const NextCommand = require('./commands/NextCommand');
const AddTrackCommand = require('./commands/AddTrackCommand');

describe('MusicPlayer', function() {
    it('should follow specifications', function() {
        var commands = jscCommands.commands(
            jscCommands.command(PlayCommand),
            jscCommands.command(PauseCommand),
            jscCommands.command(NextCommand),
            jscCommands.command(AddTrackCommand, jsc.string, jsc.nat));
        var warmup = () => new Object({
                state: new MusicPlayer(),
                model: { is_playing: false, num_tracks: 0, tracks_already_seen: {} }
        });
        var teardown = () => {};

        return jsc.assert(jscCommands.forall(commands, warmup, teardown));
    });
});
