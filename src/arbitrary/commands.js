"use strict";
const jsc = require('jsverify');
const lazyseq = require("lazy-seq");

const cloneObject = function(o) {
    const cloned = {};
    Object.keys(o).filter(v => v != "hasStarted").forEach(k => cloned[k] = o[k]);
    return cloned;
};

const jscCommandsArray = function(gen, maxSize) {
    const shrinkImpl = function(arr) {
        if (arr.length === 0) {
            return lazyseq.nil;
        }

        const x = arr[0];
        const xs = arr.slice(1);

        const cuts = [];
        for (let start = Math.floor(xs.length/2) ; start !== 0 ; start = Math.floor(start/2)) {
            cuts.push(start);
        }
        cuts.push(0);

        return lazyseq.fromArray(cuts.map(v => xs.slice(v)))
            .append(x.shrink().map(xp => [xp].concat(xs)))
            .append(shrinkImpl(xs).map(xsp => [x].concat(xsp)));
    };
    return jsc.bless({
        generator: (size) => {
            const arrsize = jsc.random(0, maxSize);
            return [...new Array(arrsize).keys()].map(() => gen.generator(size));
        },
        shrink: (arr) => {
            for (let idx = 0 ; idx != arr.length ; ++idx) {
                if (arr[idx].hasStarted !== true) {
                    arr.splice(idx--, 1);
                }
            }
            return shrinkImpl(arr)
                .map(narr => narr.map(cloneObject));
        },
        show: (arr) => arr.map(c => c.command.name !== undefined ? c.command.name : c.command.toString()).join(',')
    });
};

const arbCommands = function(...commands) {
    return typeof(commands[0]) === 'number'
        ? jscCommandsArray(jsc.oneof(...commands.slice(1)), commands[0])
        : jscCommandsArray(jsc.oneof(...commands), 100);
};

module.exports = {
    commands: arbCommands
};
