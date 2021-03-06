"use strict";
const assert = require('assert');
const jsc = require('jsverify');

const {runner} = require('../../src/runner/runner');

const DEFAULT_SEED = undefined;
const DEFAULT_WARMUP = async (seed) => new Object({state: {}, model: {}});
const DEFAULT_TEARDOWN = async (state, model) => {};

const SUCCESS = "success";
const NOT_APPLICABLE = "not applicable";
const FAILURE = "failure";
const FAILURE_REJECTED_PROMISE = "failure rejected promise";
const FAILURE_THROW = "failure throw";

const OneOfStatuses = jsc.oneof(...[SUCCESS, NOT_APPLICABLE, FAILURE].map(jsc.constant));
const OneOfAllStatuses = jsc.oneof(...[SUCCESS, NOT_APPLICABLE, FAILURE, FAILURE_REJECTED_PROMISE, FAILURE_THROW].map(jsc.constant));

var callId = 0;
var WatchAction = function(status, check, run) {
    this.status = status;
    this.idCheck = undefined;
    this.idRun = undefined;
    this.callCheck = 0;
    this.callRun = 0;
    this.check = function(model) {
        ++this.callCheck;
        this.checkCheckId = ++callId;
        return check(model);
    };
    this.run = function(state, model) {
        ++this.callRun;
        this.idRun = ++callId;
        return run(state, model);
    };
};
const buildAction = function(status, checkValue, runValue) {
    return new WatchAction(status, model => checkValue, async (state, model) => runValue);
};

const buildCommand = function(status) {
    switch (status) {
        case SUCCESS: return { command: buildAction(status, true, true) };
        case NOT_APPLICABLE: return { command: buildAction(status, false, true) };
        case FAILURE: return { command: buildAction(status, true, false) };
        case FAILURE_REJECTED_PROMISE: return { command: new WatchAction(status, async () => true, () => Promise.reject()) };
        case FAILURE_THROW: return { command: new WatchAction(status, async () => true, () => {throw "";}) };
    }
};

describe('runner', function() {
    it('should be true on success, false otherwise', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            const out = await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            return out == (commands.find(c => c.command.status === FAILURE) === undefined)
        }));
    });
    it('should call check or run zero or one time', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            return commands.every(c => c.command.callCheck === 0 || c.command.callCheck === 1)
                && commands.every(c => c.command.callRun === 0 || c.command.callRun === 1);
        }));
    });
    it('should call check then run if suitable then next command', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            var lastId = -1;
            for (var idx = 0 ; idx != commands.length ; ++idx) {
                var c = commands[idx];
                if (! c.command.callCheck) break;
                if (c.command.idCheck < lastId) return false; //check called before some parts of previous command
                if (c.command.callRun && c.command.idRun < c.command.idCheck) return false; // run called before check
                lastId = c.command.callRun ? c.command.idRun : c.command.idCheck;
            }
            return true;
        }));
    });
    it('should never call run on not applicable', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            return commands
                .filter(c => c.command.status === NOT_APPLICABLE)
                .every(c => c.command.callRun === 0);
        }));
    });
    it('should call checks before first failure (included)', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            const failurePosition = statuses.indexOf(FAILURE);
            return commands
                    .slice(0, failurePosition +1) //take
                    .every(c => c.command.callCheck === 1);
        }));
    });
    it('should stop checks and runs after first failure', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            const failurePosition = statuses.indexOf(FAILURE);
            return failurePosition === -1
                || commands
                        .slice(failurePosition +1) //drop
                        .every(c => c.command.callCheck === 0 && c.command.callRun === 0);
        }));
    });
    it('should mark started commands for shrinker', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfAllStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            return commands.filter(c => c.command.callRun > 0).every(c => c.hasStarted === true);
        }));
    });
    it('should handle rejected promises and exceptions as failures', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfAllStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            const simpleCommands = statuses.map(n => n === FAILURE_REJECTED_PROMISE || n === FAILURE_THROW ? FAILURE : n).map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, simpleCommands);
            return commands.every((c, idx) => c.command.callCheck === simpleCommands[idx].command.callCheck
                    && c.command.callRun === simpleCommands[idx].command.callRun);
        }));
    });
    it('should always call warmup once', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfAllStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            let hasBeenCalled = 0;
            const warmup = () => {
                ++hasBeenCalled;
                return DEFAULT_WARMUP();
            };
            await (runner(warmup, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            return hasBeenCalled === 1;
        }));
    });
    it('should always call teardown once', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfAllStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            let hasBeenCalled = 0;
            const teardown = () => {
                ++hasBeenCalled;
                return DEFAULT_TEARDOWN();
            };
            await (runner(DEFAULT_WARMUP, teardown))(DEFAULT_SEED, commands);
            return hasBeenCalled === 1;
        }));
    });
    it('should always call teardown once even on warmup failure', function() {
        return jsc.assert(jsc.forall(jsc.array(OneOfAllStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            let hasBeenCalled = 0;
            const warmup = () => {
                throw "warmup";
            };
            const teardown = () => {
                ++hasBeenCalled;
                return DEFAULT_TEARDOWN();
            };
            await (runner(DEFAULT_WARMUP, teardown))(DEFAULT_SEED, commands);
            return hasBeenCalled === 1;
        }));
    });
});
