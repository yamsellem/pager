"use strict";

var Rule = require('./rule');

var Negate = function(rule) {
    this.rule = rule;
};

Negate.prototype = {
    match: function(context, helpers) {
        return !this.rule.match(context, helpers);
    }
};

module.exports = Negate;
