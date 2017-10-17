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
        it('should shrink to a single command when everything fails', async function() {
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
        it('should remove extra commands surrounding failing sequence', async function() {
            // all failing sequences will have the shape: [ABC]*ABCC[ABC]*
            // shrinker have to return ABCC, not more
            function CommandA() {
                this.check = (model) => true;
                this.run = (state, model) => {
                    state.data = state.data.substr(-3) + "A";
                    return true;
                };
            }
            function CommandB() {
                this.check = (model) => true;
                this.run = (state, model) => {
                    state.data = state.data.substr(-3) + "B";
                    return true;
                };
            }
            function CommandC() {
                this.check = (model) => true;
                this.run = (state, model) => {
                    state.data = state.data.substr(-3) + "C";
                    return state.data != "ABCC";
                };
            }
            const commands = [[CommandA, CommandB, CommandC].map(c => jscCommands.command(c))];
            const result = await jsc.check(jscCommands.forall(
                    jscCommands.commands(...commands),
                    () => new Object({state: {data: ""}, model: {}}),
                ),
                {quiet: true});

            assert.notEqual(result, true, 'should fails');
            assert.equal(result.counterexample[1].length, 4, 'failing sequence contains 4 commands');
            assert.ok(result.counterexample[1][0].command instanceof CommandA, '1st is CommandA');
            assert.ok(result.counterexample[1][1].command instanceof CommandB, '2nd is CommandB');
            assert.ok(result.counterexample[1][2].command instanceof CommandC, '3rd is CommandC');
            assert.ok(result.counterexample[1][3].command instanceof CommandC, '4th is CommandC');
        });
        it('should remove extra commands inside failing sequence', async function() {
            // all failing sequences will have the shape: [ABC]*A[ABC]*C[ABC]*C[ABC]*
            // shrinker have to return ACC, not more
            function CommandA() {
                this.check = (model) => true;
                this.run = (state, model) => {
                    if (state.data === "") state.data += "A";
                    return true;
                };
            }
            function CommandB() {
                this.check = (model) => true;
                this.run = (state, model) => {
                    return true;
                };
            }
            function CommandC() {
                this.check = (model) => true;
                this.run = (state, model) => {
                    if (state.data === "A" || state.data === "AC") state.data += "C";
                    return state.data != "ACC";
                };
            }
            const commands = [[CommandA, CommandB, CommandC].map(c => jscCommands.command(c))];
            const result = await jsc.check(jscCommands.forall(
                    jscCommands.commands(...commands),
                    () => new Object({state: {data: ""}, model: {}}),
                ),
                {quiet: true});

            assert.notEqual(result, true, 'should fails');
            assert.equal(result.counterexample[1].length, 3, 'failing sequence contains 3 commands');
            assert.ok(result.counterexample[1][0].command instanceof CommandA, '1st is CommandA');
            assert.ok(result.counterexample[1][1].command instanceof CommandC, '2nd is CommandC');
            assert.ok(result.counterexample[1][2].command instanceof CommandC, '3rd is CommandC');
        });
        it('should shrink on command\'s parameters', async function() {
            function CommandA(arr1, arr2) {
                this.check = (model) => model.data[model.data.length -1] === 'B';
                this.run = (state, model) => {
                    model.data += "A";
                    return arr1.length < 3 || arr2.length >= 3;
                };
            }
            function CommandB() {
                this.check = (model) => true;
                this.run = (state, model) => {
                    model.data += "B";
                    return true;
                };
            }
            const commands = [
                jscCommands.command(CommandA, jsc.array(jsc.nat), jsc.array(jsc.nat)),
                jscCommands.command(CommandB)];
            const result = await jsc.check(jscCommands.forall(
                    jscCommands.commands(...commands),
                    () => new Object({state: {}, model: {data: ""}}),
                ),
                {quiet: true});
            
            assert.notEqual(result, true, 'should fails');
            assert.equal(result.counterexample[1].length, 2, 'failing sequence contains 2 commands');
            assert.ok(result.counterexample[1][0].command instanceof CommandB, '1st is CommandB');
            assert.ok(result.counterexample[1][1].command instanceof CommandA, '2nd is CommandA');
            assert.ok(Array.isArray(result.counterexample[1][1].parameters[0]), '1st parameter of CommandA is an array');
            assert.equal(result.counterexample[1][1].parameters[0].length, 3, '1st parameter of CommandA is an array of size 3');
            assert.deepEqual(result.counterexample[1][1].parameters[0], [0,0,0], '1st parameter of CommandA is an array of zeros');
            assert.ok(Array.isArray(result.counterexample[1][1].parameters[1]), '2nd parameter of CommandA is an array');
            assert.equal(result.counterexample[1][1].parameters[1].length, 0, '2nd parameter of CommandA is an empty array');
        });
    });
});
