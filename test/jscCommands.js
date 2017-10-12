"use strict";
const assert = require('assert');
const jsc = require('jsverify');

const jscCommands = require('../src/jscCommands');

describe('jscCommands', function() {
    describe('failure', function() {
        it('should shrink to empty array for failing warmup', async function() {
            function FailureCommand() {
                this.check = (model) => true;
                this.run = (state, model) => false;
            }
            const commands = [jscCommands.command(FailureCommand)];
            const result = await jsc.check(jscCommands.forall(
                    jscCommands.commands(...commands),
                    () => {throw "failure";}
                ),
                {quiet: true});
            
            // result.counterexample contains two items:
            // - the generated seed
            // - the faulty array of commands
            assert.notEqual(result, true, 'should fails');
            assert.equal(result.counterexample[1].length, 0, 'no command in counterexample');
        });
        it('should shrink to empty array for failing teardown', async function() {
            function FailureCommand() {
                this.check = (model) => true;
                this.run = (state, model) => false;
            }
            const commands = [jscCommands.command(FailureCommand)];
            const result = await jsc.check(jscCommands.forall(
                    jscCommands.commands(...commands),
                    () => new Object({state: {}, model: {}}),
                    () => {throw "failure";}
                ),
                {quiet: true});
            
            assert.notEqual(result, true, 'should fails');
            assert.equal(result.counterexample[1].length, 0, 'no command in counterexample');
        });
        it('should be able to return an unshrinkable test', async function() {
            function FailureCommand() {
                this.check = (model) => true;
                this.run = (state, model) => false;
            }
            const commands = [jscCommands.command(FailureCommand)];
            const result = await jsc.check(jscCommands.forall(jscCommands.commands(...commands)), {quiet: true});

            assert.notEqual(result, true, 'should fails');
            assert.equal(result.counterexample[1].length, 1, 'only one command in counterexample');
            assert.ok(result.counterexample[1][0].command instanceof FailureCommand, 'failure command in counterexample');
        });
    });
});
