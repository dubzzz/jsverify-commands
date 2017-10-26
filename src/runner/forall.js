"use strict";
const jsc = require('jsverify');
const {runner} = require('./runner');
const Metrics = require('../decorator/metrics');

const isEnabled = function(setting) {
    return setting === true || setting === 1 || setting === 'on';
};

const alterArbCommands = function(arb, settings) {
    if (isEnabled(settings.metrics)) {
        settings.metrics_output = {};        
        return Metrics.decorate(arb, settings.metrics_output);
    }
    return arb;
};

const forallImpl = function(arbSeed, arbCommands, warmup, teardown, settings) {
    return jsc.forall(arbSeed, alterArbCommands(arbCommands, settings), runner(warmup, teardown));
};

const DEFAULT_SEED_GEN = jsc.constant(undefined);
const DEFAULT_WARMUP = seed => new Object({state: {}, model: {}});
const DEFAULT_TEARDOWN = () => {};
const DEFAULT_SETTINGS = () => new Object({});

const isGenerator = function(obj) {
    return obj !== undefined && obj.generator !== undefined;
};
const forall = function(...params) {
    if (params.length === 0 || ! isGenerator(params[0])) {
        throw "forall requires at least a commands generator as first argument";
    }
    if (! isGenerator(params[1])) {
        return forallImpl(DEFAULT_SEED_GEN,
                params[0],
                params[1] || DEFAULT_WARMUP,
                params[2] || DEFAULT_TEARDOWN,
                params[3] || DEFAULT_SETTINGS);
    }
    return forallImpl(params[0],
            params[1],
            params[2] || DEFAULT_WARMUP,
            params[3] || DEFAULT_TEARDOWN,
            params[4] || DEFAULT_SETTINGS);
};
const assertForall = async function(...params) {
    const settings = (!isGenerator(params[1]) ? params[3] : params[4]) || DEFAULT_SETTINGS;
    const genericTreatment = () => {
        if (isEnabled(settings.verbose) && isEnabled(settings.metrics)) {
            (settings.log || console.log)(Metrics.prettyPrint(settings.metrics_output));
        }
    };
    try {
        const out = await jsc.assert(forall(...params));
        genericTreatment();
        return out;
    }
    catch (err) {
        genericTreatment();
        throw err;
    }
};

module.exports = {
    assertForall: assertForall,
    forall: forall
};
