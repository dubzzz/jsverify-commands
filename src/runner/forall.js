"use strict";
const jsc = require('jsverify');
const {runner} = require('./runner');

const forallImpl = function(arbSeed, arbCommands, warmup, teardown) {
    return jsc.forall(arbSeed, arbCommands, runner(warmup, teardown));
};

const DEFAULT_SEED_GEN = jsc.constant(undefined);
const DEFAULT_WARMUP = seed => new Object({state: {}, model: {}});
const DEFAULT_TEARDOWN = () => {};

const isGenerator = function(obj) {
    return obj !== undefined && obj.generator !== undefined;
};
const forall = function(...params) {
    if (params.length === 0 || ! isGenerator(params[0])) {
        throw "forall requires at least a commands generator as first argument";
    }
    if (! isGenerator(params[1])) {
        return forallImpl(DEFAULT_SEED_GEN, params[0], params[1] || DEFAULT_WARMUP, params[2] || DEFAULT_TEARDOWN);
    }
    return forallImpl(params[0], params[1], params[2] || DEFAULT_WARMUP, params[3] || DEFAULT_TEARDOWN);
};

module.exports = {
    forall: forall
};
