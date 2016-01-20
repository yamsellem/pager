"use strict";

var _       = require('lodash'),
    Promise = require('bluebird'),
    Task    = require('./task'),
    Action  = require('./action'),
    Rule    = require('./rules/rule'),
    Negate  = require('./rules/negate');

var Channel = function(options) {
    this.channel = options.channel;

    this.name = options.name;
    this.event = options.event;
    this.delay = options.delay || 0;
    this.flag = options.flag || null;

    this.actions = [];
    this.middlewares = [];
    this.rules = { immediate: [], postponed: [] };
}

Channel.prototype = {
    comply: function(rule) {
        var rules = [].slice.call(arguments);
        for (var rule of rules)
            if (!this.delay)
                this.rules.immediate.push(rule);
            else
                this.rules.postponed.push(rule);
        return this;
    },
    reject: function(rule) {
        var rules = [].slice.call(arguments);
        for (var rule of rules)
            this.comply(new Negate(rule));
        return this;
    },
    after: function(delay, unit) {
        var multiplier = 1;
        if (unit === 'minutes' || unit === 'm')
            multiplier = 60;
        else if (unit === 'hours' || unit === 'h')
            multiplier = 60 * 60;
        else if (unit === 'days' || unit === 'd')
            multiplier = 24 * 60 * 60;

        this.delay = delay * multiplier;
        return this;
    },
    every: function(delay, unit) {
        this.after(delay, unit);
        this.flag = 'available';
        return this;
    },
    trigger: function(action) {
        var actions = [].slice.call(arguments);
        for (var action of actions)
            this.actions.push(action);
        return this;
    },
    then: function(middleware) {
        var middlewares = [].slice.call(arguments);
        for (var middleware of middlewares)
            this.middlewares.push(middleware);
        return this;
    },
    shouldRepeat: function() {
        return this.flag === 'available' || this.flag === 'triggered';
    },
    shouldTrigger: function() {
        return this.flag !== 'triggered';
    },
    matchImmediate: function(context, helpers) {
        return this._run(this.rules.immediate, context, helpers);
    },
    matchPostponed: function(context, helpers) {
        return this._run(this.rules.postponed, context, helpers);
    },
    _run: function(rules, context, helpers) {
        var promises = [];

        for (var middleware of this.middlewares)
            promises.push(middleware(context, helpers));

        return Promise.all(promises).then(function() {
            promises = [];

            var match = true;
            for (var rule of rules)
                promises.push(rule.match(context, helpers));

            return new Promise(function(resolve, reject) {
                Promise.all(promises).then(function(matches) {
                    var all = matches.reduce(function(memo, match) {
                        return memo && match;
                    }, true);

                    all ? resolve() : reject();
                });
            });
        });
    },
    _toTask: function(context, helpers) {
        var args = [].slice.call(arguments);
        return new Task(this.name, this.event, this.delay, this.flag, context, helpers);
    },
    _fromTask: function(task) {
        this.flag = task.flag;
    }
};

module.exports = Channel;
