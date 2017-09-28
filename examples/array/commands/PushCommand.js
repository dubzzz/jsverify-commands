function PushCommand(value) {
    var self = this;
    
    self.check = function(desc) {
        return true;
    };

    self.run = function(tab, desc) {
        tab.push(value);
        ++desc.numEntries;
        
        return tab.length == desc.numEntries;
    };
    self.toString = () => `PushCommand(${value})`;
}

module.exports = PushCommand;
