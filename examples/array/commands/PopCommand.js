function PopCommand() {
    var self = this;
    
    self.check = function(desc) {
        return desc.numEntries > 0;
    };

    self.run = function(tab, desc) {
        tab.pop();
        --desc.numEntries;

        return tab.length == desc.numEntries;
    };
    self.toString = () => `PopCommand`;
}

module.exports = PopCommand;
