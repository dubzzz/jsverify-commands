function AddTrackCommand(name, position) {
    this.check = model => !model.tracks_already_seen.hasOwnProperty(name);
    this.run = function(player, model) {
        ++model.num_tracks;
        model.tracks_already_seen[name] = undefined;
        
        const track_before = player.track_name();
        player.add_track(name, position % model.num_tracks);
        if (model.is_playing !== player.is_playing()) {
            return false; // should not change playing status
        }
        if (model.num_tracks === 1) {
            return player.track_name() === name;
        }
        return track_before === player.track_name();
    };
    this.name = `AddTrack(${name}, ${position})`;
}

module.exports = AddTrackCommand;
