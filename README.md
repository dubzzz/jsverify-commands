# JSVerify Commands

[![Build Status](https://travis-ci.org/dubzzz/jsverify-commands.svg?branch=master)](https://travis-ci.org/dubzzz/jsverify-commands)
[![npm version](https://badge.fury.io/js/jsverify-commands.svg)](https://badge.fury.io/js/jsverify-commands)
[![dependencies Status](https://david-dm.org/dubzzz/jsverify-commands/status.svg)](https://david-dm.org/dubzzz/jsverify-commands)
[![devDependencies Status](https://david-dm.org/dubzzz/jsverify-commands/dev-status.svg)](https://david-dm.org/dubzzz/jsverify-commands?type=dev)

[![Coverage Status](https://coveralls.io/repos/github/dubzzz/jsverify-commands/badge.svg?branch=master)](https://coveralls.io/github/dubzzz/jsverify-commands?branch=master)
[![Test Coverage](https://api.codeclimate.com/v1/badges/d0dd594e6f2dd8e8619a/test_coverage)](https://codeclimate.com/github/dubzzz/jsverify-commands/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/d0dd594e6f2dd8e8619a/maintainability)](https://codeclimate.com/github/dubzzz/jsverify-commands/maintainability)

## Introduction

JSVerify commands is an extension of [JSVerify](https://github.com/jsverify/jsverify) providing the ability to build checks based on commands.

Checking on commands can prove very useful to check user interfaces, state machines, code mechanisms... A good example is given in [https://labs.spotify.com/2015/06/25/rapid-check/](https://labs.spotify.com/2015/06/25/rapid-check/).

## Try it online

https://runkit.com/embed/bypl968ikbpw

## Table of contents

1. [Syntax](#syntax)
    1. [Defining a single command](#defining-a-single-command)
    2. [Gathering commands for your test](#gathering-commands-for-your-test)
    3. [Running the test](#running-the-test)
2. [Basic example for Selenium](#basic-example-for-selenium)
3. [Application on end-to-end tests](#application-on-end-to-end-tests)

## Syntax

### Defining a single command

Basically one test is defined as a set of commands. Each command has to define two methods:
- `check(model): boolean` which takes a model as entry and return whether or not the command should be executed (based on the current state of this model)
- `run(state, model): Promise(boolean) or boolean` which evolves both the `model` and the `state` and check for potential assertions
- `toString: string` is an optional but useful method to provide human readable stacktraces on failure

Once commands have been defined as classes, they have to be registered as commands.

Declaring a JSVerify command follow this syntax:

```js
jscCommands.command(ClassName, ...jsc.arbitrary)
```

`ClassName` is the class you want to register, `...jsc.arbitrary` is the set of arbitraries to use to define an instance of `ClassName`. Basically registering `jscCommands.command(MyExample, jsc.nat, jsc.array(jsc.boolean))` mean that MyExample commands take as construction parameters a natural number and an array of booleans.

### Gathering commands for your test

As previously defined commands can be part of multiple tests suites, they have to be packed all together using the `jscCommands.commands` wrapper:

```js
// based on default number of commands by run (at most 100 commands used in a run)
jscCommands.commands(...previously-defined-commands)

// custom number of commands by run
jscCommands.commands(maxNumberOfCommandsByRun, ...previously-defined-commands)
```

Here is an example using the first syntax, building a commands generator creating commands of types `MyExample1`, `MyExample2` and `MyExample3`.

```js
jscCommands.commands(
    jscCommands.command(MyExample1),                    // new MyExample1()
    jscCommands.command(MyExample2, jsc.constant(42)),  // new MyExample2(42)
    jscCommands.command(MyExample3, jsc.nat),           // new MyExample3(:random(nat):)
)
```

### Running the test

In order to run the test you just have to call `jscCommands.forall`.


With `warmup` an async function returning an object having the fields `state` and `model`. Called before each run.

With `teardown` an async function used to clean after one run.

Here is an example to use the following syntax:

```js
it('example of commands', function(done) {
    // ... code ...
    return await jsc.assert(jscCommands.forall(commands, warmup, teardown));
});
```

Or for non async/await versions of node (following is compatible with mocha and jasmine):

```js
it('example of commands', function(done) {
    // ... code ...
    jsc.assert(jscCommands.forall(commands, warmup, teardown))
        .then(val => val ? done(val) : done())
        .catch(error => done(error));
});
```

## Basic example for Selenium

Following example show how to use it with Selenium.

```js
"use strict";
const assert = require('assert');
const {Builder} = require('selenium-webdriver');
const test = require('selenium-webdriver/testing');

const jsc = require('jsverify');
const jscCommands = require('jsverify-commands');

// loading user defined commands
const CommandNoArgs = require('./commands/CommandNoArgs');
const CommandRandomNat = require('./commands/CommandRandomNat');

test.describe('Basic Example', function() {
    test.beforeEach(async function() {
        driver = await new Builder()
                .forBrowser("firefox")
                .build();
    });

    test.afterEach(async function() {
        await driver.quit();
    });

    test.it('random actions', done => {
        var commands = jscCommands.commands(
            jscCommands.command(CommandNoArgs),
            jscCommands.command(CommandRandomNat, jsc.nat));
        var warmup = async function () { // called at the beginning of each run
            await driver.get("about:blank");
            return {
                state: driver,
                model: {/*whatever needed to define current state*/}
            };
        };
        var teardown = async function() { // called at the end of each run (failed or not)
            await driver.get("about:blank");
        };
        jsc.assert(jscCommands.forall(commands, warmup, teardown))
           .then(val => val ? done(val) : done())
           .catch(error => done(error));
    });
});
```

With `commands/CommandNoArgs.js` defined as follow:

```js
function CommandNoArgs() {
    this.check = function(model) {
        // @return boolean stating whether or not run can be called
        //         knowing the current state of the model
        return true; //can run
    };
    this.run = function(driver, model) {
        // impact model and state (alias driver in the case of Selenium)
        // @return a Promise[boolean] stating whether or not the run failed
        //         true  = we should continue with next commands
        //         false = the command just failed
        return Promise.resolve(true); //success
    };
}

module.exports = CommandNoArgs;
```

## Application on end-to-end tests

The repository [scala-2048](https://github.com/dubzzz/scala-2048) defines its end-to-end tests using this module.

It defines the following commands:
- [play move](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/PlayMove.js)
- [undo last move](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/UndoMove.js)
- [redo canceled move](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/RedoMove.js)
- [new game](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/StartNewGame.js)
- [reload previous game](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/JumpBackToPast.js)
- [check convergence of the animation](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/CheckTiles.js)
