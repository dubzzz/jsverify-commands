function SizeCommand() {
    this.check = desc => true;
    this.run = (circ, desc) => circ.size() === desc.entries.length;
    this.name = `SizeCommand`;
}

module.exports = SizeCommand;
