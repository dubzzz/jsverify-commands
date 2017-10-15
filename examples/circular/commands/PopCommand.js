function PopCommand() {
    this.check = desc => desc.entries.length > 0;
    this.run = (circ, desc) => circ.pop() === desc.entries.splice(0, 1)[0];
    this.name = `PopCommand`;
}

module.exports = PopCommand;
