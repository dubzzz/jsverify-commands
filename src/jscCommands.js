"use strict";

import "babel-polyfill";
const {command} = require('./arbitrary/command.js');
const {commands} = require('./arbitrary/commands.js');
const {assertForall, forall} = require('./runner/forall.js');

module.exports = {
    command: command,
    commands: commands,
    assertForall: assertForall,
    forall: forall
};
