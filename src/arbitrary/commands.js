"use strict";
const jsc = require('jsverify');
const lazyseq = require("lazy-seq");

var cloneObject = function(o) {
    var cloned = {};
    Object.keys(o).filter(v => v != "hasStarted").forEach(k => cloned[k] = o[k]);
    return cloned;
};



var jscCommandsArray = function(gen, maxSize) {
    /**
     * jsc.array uses logsize function as a limiter of its size...
     * 
     * // Helper, essentially: log2(size + 1)
     * function logsize(size) {
     *   return Math.max(Math.round(Math.log(size + 1) / Math.log(2), 0));
     * }
     */
    var shrinkImpl = function(arr) {
        if (arr.length === 0) {
            return lazyseq.nil;
        }

        var x = arr[0];
        var xs = arr.slice(1);

        var cuts = [];
        for (let start = Math.floor(xs.length/2) ; start !== 0 ; start = Math.floor(start/2)) {
            cuts.push(start);
        }
        cuts.push(0);

        return lazyseq.fromArray(cuts.map(v => xs.slice(v)))
            .append(gen.shrink(x).map(xp => [xp].concat(xs)))
            .append(shrinkImpl(xs).map(xsp => [x].concat(xsp)));
    };
    return jsc.bless({
        generator: (size) => {
            var arrsize = jsc.random(0, maxSize);
            var arr = new Array(arrsize);
            for (var i = 0; i < arrsize; i++) {
                arr[i] = gen.generator(size);
            }
            return arr;
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
        show: jsc.array(gen).show
    });
};

var arbCommands = function(...commands) {
    return typeof(commands[0]) === 'number'
        ? jscCommandsArray(jsc.oneof(...commands.slice(1)), commands[0])
        : jscCommandsArray(jsc.oneof(...commands), 100);
};

module.exports = {
    commands: arbCommands
};
