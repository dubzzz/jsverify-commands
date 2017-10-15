function IsEmptyCommand() {
    this.check = desc => true;
    this.run = (circ, desc) => circ.isEmpty() === (desc.entries.length === 0);
    this.name = `IsEmptyCommand`;
}

module.exports = IsEmptyCommand;
