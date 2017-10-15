function PushCommand(value) {
    this.check = desc => desc.entries.length < desc.maxEntries;
    this.run = function(circ, desc) {
        circ.push(value);
        desc.entries.push(value);
        return true;
    };
    this.name = `PushCommand(${value})`;
}

module.exports = PushCommand;
