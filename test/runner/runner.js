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

const OneOfStatuses = jsc.oneof(...[SUCCESS, NOT_APPLICABLE, FAILURE].map(jsc.constant));

var callId = 0;
const buildAction = function(status, checkValue, runValue) {
    return new (function() {
        this.status = status;
        this.idCheck = undefined;
        this.idRun = undefined;
        this.callCheck = 0;
        this.callRun = 0;
        this.check = function(model) {
            ++this.callCheck;
            this.checkCheckId = ++callId;
            return checkValue;
        };
        this.run = async function(state, model) {
            ++this.callRun;
            this.idRun = ++callId;
            return runValue;
        };
    })();
};

const buildCommand = function(status) {
    switch (status) {
        case SUCCESS: return { command: buildAction(status, true, true) };
        case NOT_APPLICABLE: return { command: buildAction(status, false, true) };
        case FAILURE: return { command: buildAction(status, true, false) };
    }
};

describe('runner', function() {
    it('should be true on success, false otherwise', function(done) {
        jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            const out = await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            return out == (commands.find(c => c.command.status === FAILURE) === undefined)
        }))
            .then(val => val ? done(val) : done())
            .catch(error => done(error));
    });
    it('should call check or run zero or one time', function(done) {
        jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            return commands.every(c => c.command.callCheck === 0 || c.command.callCheck === 1)
                && commands.every(c => c.command.callRun === 0 || c.command.callRun === 1);
        }))
            .then(val => val ? done(val) : done())
            .catch(error => done(error));
    });
    it('should call check then run if suitable then next command', function(done) {
        jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
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
        }))
            .then(val => val ? done(val) : done())
            .catch(error => done(error));
    });
    it('should never call run on not applicable', function(done) {
        jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            return commands
                .filter(c => c.command.status === NOT_APPLICABLE)
                .every(c => c.command.callRun === 0);
        }))
            .then(val => val ? done(val) : done())
            .catch(error => done(error));
    });
    it('should call checks before first failure (included)', function(done) {
        jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            const failurePosition = statuses.indexOf(FAILURE);
            return commands
                    .slice(0, failurePosition +1) //take
                    .every(c => c.command.callCheck === 1);
        }))
            .then(val => val ? done(val) : done())
            .catch(error => done(error));
    });
    it('should stop checks and runs after first failure', function(done) {
        jsc.assert(jsc.forall(jsc.array(OneOfStatuses), async function(statuses) {
            const commands = statuses.map(buildCommand);
            await (runner(DEFAULT_WARMUP, DEFAULT_TEARDOWN))(DEFAULT_SEED, commands);
            const failurePosition = statuses.indexOf(FAILURE);
            return failurePosition === -1
                || commands
                        .slice(failurePosition +1) //drop
                        .every(c => c.command.callCheck === 0 && c.command.callRun === 0);
        }))
            .then(val => val ? done(val) : done())
            .catch(error => done(error));
    });
});
