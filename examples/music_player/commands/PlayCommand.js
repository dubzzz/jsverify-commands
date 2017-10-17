function PlayCommand() {
    this.check = model => model.num_tracks > 0;
    this.run = function(player, model) {
        model.is_playing = true;
        player.play();
        return player.is_playing();
    };
    this.name = `Play`;
}

module.exports = PlayCommand;
