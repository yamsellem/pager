"use strict";

var Rule = function(options) {
    var noop = function() { return true; };

    options = options || {};
    this.match = options.match || noop;
};

Rule.prototype = {
    match: function(context, helpers) { return true; }
};

module.exports = Rule;
