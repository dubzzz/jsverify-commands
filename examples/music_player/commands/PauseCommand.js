function PauseCommand() {
    this.check = model => true;
    this.run = function(player, model) {
        model.is_playing = false;
        player.pause();
        return !player.is_playing();
    };
    this.name = `Pause`;
}

module.exports = PauseCommand;
