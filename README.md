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

It can be seen as a QA trying to find breaches in your code.

## Try it online

- Array: https://runkit.com/dubzzz/jsverify-commands-array
- Music Player: https://runkit.com/dubzzz/jsverify-commands-musicplayer

## Table of contents

1. [Introduction](#introduction)
    1. [The need for commands](#the-need-for-commands)
    2. [A quick draft](#a-quick-draft)
2. [Syntax](#syntax)
    1. [Defining a single command](#defining-a-single-command)
    2. [Gathering commands for your test](#gathering-commands-for-your-test)
    3. [Running the test](#running-the-test)
    4. [Advanced settings](#advanced-settings)
3. [Basic example for Selenium](#basic-example-for-selenium)
4. [Application on end-to-end tests](#application-on-end-to-end-tests)

## Introduction

### The need for commands

`jsverify` is a great tool to do property based testing on my algorithms, so why would I bother with so called commands?

Commands provide an additional layer in order to be able to test UI or a whole program logic using the power of property based testing. Basically it consists in providing the framework the tools it needs to be able to run through your program as a whole.

Taking the example of [RapidCheck](https://labs.spotify.com/2015/06/25/rapid-check/) on a music player, commands would be something like:
- play: _expect the player to play something, can only be used if there is at least one track_
- pause: _expect the player not to play anything_
- next: _expect the player to switch to another song, except if the playlist is limited to one track_
- add track: _expect the player to add the track to playlist impacting current status (aka is playing A for instance)_

### A quick draft

#### Generate commands

`jsverify` is able to generate arrays using `jsc.array`. It can also generate arrays of elements taken from an `enum` using `jsc.oneof(jsc.constant(ValueA), jsc.constant(ValueB)...)`.

Lets suppose we have a command class associated with all the commands described in previous part: `PlayCommand`, `PauseCommand`... Using `jsverify` we would be able to build a random array of those constructors and get to something like:

```js
describe('draft', function() {
    it('basic command implementation', function() {
        const commandsGen = jsc.array(
                jsc.oneof(
                    jsc.constant(PlayCommand),
                    jsc.constant(PauseCommand),
                    jsc.constant(NextCommand),
                    jsc.constant(AddTrackCommand),
                ));
        return jsc.assert(jsc.forall(commandsGen, (cons) => run(cons)));
    });
});
```

#### Run them

Now that we have a random array of constructors for our commands, we want to run them.

You can see that some of our commands have constraints. For instance `play` is not supposed to be run if the playlist is empty. Such constraints impose us to provide a way to diagnose if the command can be run.

So here come the introduction of the methods: `check` and `run`.

As checking the current state on the instance under test itself can raise problems, the idea is to provide our test with a `model`. The `model` is a simplified view of our instance under tests.

Basic implementation of run could be:

```js
function run(cons) {
    var model = {};
    for (let idx = 0 ; idx != cons.length ; ++idx) {
        const cmd = new cons[idx]();
        if (cmd.check(model)) {
            if (!cmd.run(model)) {
                return false;
            }
        }
    }
    return true;
}
```

## Syntax

### Defining a single command

Basically one test is defined as a set of commands. Each command has to define two methods:
- `check(model): boolean` which takes a model as entry and return whether or not the command should be executed (based on the current state of this model)
- `run(state, model): Promise(boolean) or boolean` which evolves both the `model` and the `state` and check for potential assertions
- `toString: string` is an optional but useful method to provide human readable stacktraces on failure
- `name: string attribute of the instance` optional and same as toString, it has an higher priority

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

In order to run the test you just have to call `jscCommands.forall` to create the associated property.

With `warmup` an async function returning an object having the fields `state` and `model`. Called before each run.

With `teardown` an async function used to clean after one run.

With `settings` an object specifying settings that should be used to run the test. Those settings are specific to jsverify-commands, they are described in the next part. By default, or if not set, it will be set to `{}`.

Here is an example to use the following syntax:

```js
it('example of commands', function() {
    // ... code ...
    return jsc.assert(jscCommands.forall(commands, warmup, teardown, settings));
});
```

Or if you want to handle the promise yourself:

```js
it('example of commands', function(done) {
    // ... code ...
    jsc.assert(jscCommands.forall(commands, warmup, teardown, settings))
        .then(val => val ? done(val) : done())
        .catch(error => done(error));
});
```

### Advanced settings

Settings can be enabled by setting their value to `true`, `1` or `"on"`. Currently available settings are:
- `log`: register another logger (by default it uses `console.log` in verbose mode). Logger as to be: `log(s: string): unit`.
- `metrics`: enable the recording of metrics concerning the number of instances generated, calls to shrink, calls to check and status and calls to run and status. Output is available in settings object itself under the key `metrics_output`.
- `verbose`: switch assert to verbose mode. Display the metrics recorded by metrics at the end of the test. In order to be able to use this setting you have to replace `jsc.assert(jscCommands.forall(...))` by its equivalent `jscCommands.assertForall()`.

These settings can also be defined in an environnement variable dubbed `COMMANDS_DEFAULT`. They will be used in all tests except if they are overriden by a test. In this case, test's settings are prioritized. If the settings at test level do not override the key then the environnement variable will be taken into account.

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
