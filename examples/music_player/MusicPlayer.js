function MusicPlayer() {
    let tracks = [];
    let is_playing = false;
    let playing_idx = 0;
    
    this.is_playing = () => is_playing;
    this.track_name = () => tracks[playing_idx];
    
    this.play = () => is_playing = true;
    this.pause = () => is_playing = false;
    
    this.add_track = (name, position) => {
        tracks = tracks.slice(0, position).concat(name).concat(tracks.slice(position));
        if (tracks.length !== 1 && playing_idx >= position) {
            ++playing_idx;
        }
    };
    this.next = () => {
        if (++playing_idx >= tracks.length)
	    {
            playing_idx = 0;
        }
    };
}

module.exports = MusicPlayer;
