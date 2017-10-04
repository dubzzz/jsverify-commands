"use strict";
const jsc = require('jsverify');

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
    return jsc.bless({
        generator: (size) => {
            var arrsize = jsc.random(0, maxSize);
            var arr = new Array(arrsize);
            for (var i = 0; i < arrsize; i++) {
                arr[i] = gen.generator(size);
            }
            return arr;
        },
        shrink: (arr) => jsc.array(gen).shrink(arr.filter(c => c.hasStarted === true))
                .map(narr => narr.map(cloneObject)),
        show: jsc.array(gen).show
    });
};

var arbCommands = function(...commands) {
    return typeof(commands[0]) === 'number'
        ? jscCommandsArray(jsc.oneof.apply(this, commands.slice(1)), commands[0])
        : jscCommandsArray(jsc.oneof.apply(this, commands), 100);
};

module.exports = {
    commands: arbCommands
};
