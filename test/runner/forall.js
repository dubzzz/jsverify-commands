"use strict";
const assert = require('assert');
const jsc = require('jsverify');

const {forall} = require('../../src/runner/forall');

const DEFAULT_WARMUP = async (seed) => new Object({state: {}, model: {}});
const DEFAULT_TEARDOWN = async (state, model) => {};

describe('forall', function() {
    it('should be able to be called without any seed', async function() {
        let settings = {};
        let hasCalledWarmup = false;
        let hasCalledTeardown = false;
        const wup = (seed) => {
            hasCalledWarmup = seed === undefined;
            return {state: {}, model: {}};
        };
        const tdown = (state, model) => {
            hasCalledTeardown = state !== undefined && model !== undefined;
        };
        const out = await jsc.assert(forall(jsc.constant([]), wup, tdown, settings));
        assert.deepEqual(settings, {}, "no impact on incoming settings on empty settings");
        return out && hasCalledWarmup && hasCalledTeardown;
    });
    it('should be able to be called with a seed generator', async function() {
        let settings = {};
        let hasCalledWarmup = false;
        let hasCalledTeardown = false;
        const wup = (seed) => {
            hasCalledWarmup = Array.isArray(seed) && seed.every(i => typeof(i) === 'number');
            return {state: {}, model: {}};
        };
        const tdown = (state, model) => {
            hasCalledTeardown = state !== undefined && model !== undefined;
        };
        const out = await jsc.assert(forall(jsc.array(jsc.integer), jsc.constant([]), wup, tdown, settings));
        assert.deepEqual(settings, {}, "no impact on incoming settings on empty settings");
        return out && hasCalledWarmup && hasCalledTeardown;
    });
    it('should record metrics if asked to', async function() {
        let settings = {metrics: true};
        const out = await jsc.assert(forall(jsc.constant([]), DEFAULT_WARMUP, DEFAULT_TEARDOWN, settings));
        return out && settings.metrics_output !== undefined;
    });
});
