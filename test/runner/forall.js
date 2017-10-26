"use strict";
const assert = require('assert');
const jsc = require('jsverify');

const {assertForall, forall} = require('../../src/runner/forall');

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
        await jsc.assert(forall(jsc.constant([]), wup, tdown, settings));
        assert.deepEqual(settings, {}, "no impact on incoming settings on empty settings");
        assert.ok(hasCalledWarmup, "performed a valid call to warmup");
        assert.ok(hasCalledTeardown, "performed a valid call to teardown");
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
        await jsc.assert(forall(jsc.array(jsc.integer), jsc.constant([]), wup, tdown, settings));
        assert.deepEqual(settings, {}, "no impact on incoming settings on empty settings");
        assert.ok(hasCalledWarmup, "performed a valid call to warmup");
        assert.ok(hasCalledTeardown, "performed a valid call to teardown");
    });
    it('should record metrics if asked to', async function() {
        let settings = {metrics: true};
        await jsc.assert(forall(jsc.constant([]), DEFAULT_WARMUP, DEFAULT_TEARDOWN, settings));
        assert.ok(settings.hasOwnProperty('metrics_output'), "settings contains the key metrics_output");
    });
    it('should not prettyPrint metrics outside of verbose mode', async function() {
        let printed = undefined;
        let settings = {metrics: true, log: data => printed = data};
        await assertForall(jsc.constant([]), DEFAULT_WARMUP, DEFAULT_TEARDOWN, settings);
        assert.ok(settings.hasOwnProperty('metrics_output'), "settings contains the key metrics_output");
        assert.strictEqual(printed, undefined, "log has not been called");
    });
    it('should prettyPrint metrics on success in verbose mode', async function() {
        let printed = "";
        let settings = {metrics: true, verbose: true, log: data => printed = data};
        await assertForall(jsc.constant([]), DEFAULT_WARMUP, DEFAULT_TEARDOWN, settings);
        assert.ok(settings.hasOwnProperty('metrics_output'), "settings contains the key metrics_output");
        assert.ok(printed.length > 0, "log has been called with a non-empty text");
    });
    it('should prettyPrint metrics on failure in verbose mode', async function() {
        let printed = "";
        let settings = {metrics: true, verbose: true, log: data => printed = data};
        try {
            await assertForall(jsc.constant([{
                command: {
                    check: () => true,
                    run: () => false
                }
            }]), DEFAULT_WARMUP, DEFAULT_TEARDOWN, settings);
        }
        catch (err) {
            assert.ok(settings.hasOwnProperty('metrics_output'), "settings contains the key metrics_output");
            assert.ok(printed.length > 0, "log has been called with a non-empty text");
            return;
        }
        assert.fail("assertForall has to fail");
    });
});
