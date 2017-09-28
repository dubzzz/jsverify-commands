# JSVerify Commands

## Introduction

JSVerify commands is an extension of [JSVerify](https://github.com/jsverify/jsverify) providing the ability to build checks based on commands.

Checking on commands can prove very useful to check user interfaces, state machines, code mechanisms... A good example is given in [https://labs.spotify.com/2015/06/25/rapid-check/](https://labs.spotify.com/2015/06/25/rapid-check/).

Basically one test is defined as a set of commands. Each command has to define two methods:
- `check(model): boolean` which takes a model as entry and return whether or not the command should be executed (based on the current state of this model)
- `run(state, model): Promise(boolean)` which evolves both the `model` and the `state` and check for potential assertions

## Syntax

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
        jsc.assert(jscCommands.forallCommands(commands, warmup, teardown))
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
```

## Example

The repository [scala-2048](https://github.com/dubzzz/scala-2048) defines its end-to-end tests using this module.

It defines the following commands:
- [play move](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/PlayMove.js)
- [undo last move](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/UndoMove.js)
- [redo canceled move](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/RedoMove.js)
- [new game](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/StartNewGame.js)
- [reload previous game](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/JumpBackToPast.js)
- [check convergence of the animation](https://github.com/dubzzz/scala-2048/blob/master/e2e/commands/CheckTiles.js)