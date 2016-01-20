"use strict";

var Flow = require('./lib/flow'),
    Action = require('./lib/action'),
    Rule = require('./lib/rules/rule');

Flow.Rule = Rule;
Flow.Action = Action;

module.exports = exports = Flow;
