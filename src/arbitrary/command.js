"use strict";
const jsc = require('jsverify');
const lazyseq = require("lazy-seq");

const arbNullTuple = function(arbsArray) {
    if (arbsArray.length === 0) {
        return jsc.bless({
            generator: size => [],
            shrink: lazyseq.nil,
            show: t => "empty"
        });
    }
    return jsc.tuple(arbsArray);
};

const arbCommand = function(TypeName, ...arbs) {
    const arbParameters = arbNullTuple(arbs);
    const build = function(parameters) {
        return {
            command: new TypeName(...parameters),
            parameters: parameters,
            shrink: () => arbParameters.shrink(parameters).map(build)
        };
    };

    return jsc.bless({
        generator: size => build(arbParameters.generator(size)),
        shrink: cmd => cmd.shrink(),
        show: cmd => cmd.command.toString()
    });
};

module.exports = {
    command: arbCommand
};
