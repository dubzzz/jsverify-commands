function IsFullCommand() {
    this.check = desc => true;
    this.run = (circ, desc) => circ.isFull() === (desc.entries.length === desc.maxEntries);
    this.name = `IsFullCommand`;
}

module.exports = IsFullCommand;
