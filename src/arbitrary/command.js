"use strict";
const jsc = require('jsverify');

var arbCommand = function(TypeName, ...arbs) {
    var Builder = function(parameters) {
        TypeName.apply(this, parameters);
    }
    Builder.prototype = TypeName.prototype;

    return jsc.bless({
        generator: function(size) {
            var parameters = arbs.length === 0 ? [] : jsc.tuple(arbs).generator(size);
            return {
                command: new Builder(parameters),
                parameters: parameters
            };
        },
        shrink: function(cmd) {
            var parameters = arbs.length === 0 ? [] : jsc.tuple(arbs).shrink(cmd.parameters);
            return {
                command: new Builder(parameters),
                parameters: parameters
            };
        },
        show: function(cmd) {
            return cmd.command.toString();
        }
    });
};

module.exports = {
    command: arbCommand
};
