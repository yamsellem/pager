"use strict";

var Action = function(options) {
    var noop = function() {};

    options = options || {};
    this.fire = options.fire || noop;
}

Action.prototype = {
    fire: function(context, helpers) {}
};

module.exports = Action;
