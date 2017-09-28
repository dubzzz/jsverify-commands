"use strict";
const {command} = require('./arbitrary/command.js');
const {commands, numCommands, filter} = require('./arbitrary/commands.js');
const {forall, forallCommandsSeeded} = require('./runner/forall.js');

module.exports = {
    command: command,
    commands: commands,
    numCommands: numCommands, //depreciated
    filter: filter,
    forall: forall,
    forallCommandsSeeded: forallCommandsSeeded //depreciated
};
