function NextCommand() {
    this.check = model => true;
    this.run = function(player, model) {
        const track_before = player.track_name();
        player.next();
        if (model.is_playing !== player.is_playing()) {
            return false; // should not change playing status
        }
        if (model.num_tracks <= 1) {
            return track_before === player.track_name(); // keep playing the same
        }
        else {
            return track_before !== player.track_name(); // go to another track
        }
    };
    this.name = `Next`;
}

module.exports = NextCommand;
