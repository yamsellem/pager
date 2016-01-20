"use strict";

var moment  = require('moment'),
    _       = require('lodash'),
    util    = require('util'),
    events  = require('events'),
    Promise = require('bluebird'),
    Channel = require('./channel'),
    Action  = require('./action'),
    Task    = require('./task'),
    Rule    = require('./rules/rule'),
    Negate  = require('./rules/negate');

// hide bluebird unhandled log
// rejected rules do not have to always be catched
Promise.onPossiblyUnhandledRejection(function() {});

var Flow = function(helpers) {
    this.helpers = helpers;
    this.channels = [];
};

Flow.prototype = {
    subscribe: function(event) {
        this.event = event;
        return this;
    },
    channel: function(name) {
        this.name = name;

        if (!this.name)
            throw new Error('Channel name is compulsory')
        if (!this.event)
            throw new Error('Channel event is compulsory')

        var channel = this._find(this.event, this.name);
        if (channel)
            throw new Error('Channel already exists')

        this._channel = new Channel({name: this.name, event: this.event, channel: this.channel.bind(this)});
        this.channels.push(this._channel);
        return this._channel;
    },
    _find: function(event, name) {
        return _.find(this.channels, function(channel) {
            return channel.event === event && channel.name === name;
        });
    },
    message: function(event, context) {
        var channels = this.channels.filter(function(channel) {
            return channel.event === event;
        });

        var promises = [];
        for (var channel of channels) {
            var promise = channel.matchImmediate(context, this.helpers)
                .then(this._emit.bind(this, channel, context));

            promises.push(promise);
        }

        return Promise.all(promises);
    },
    ack: function(fn) {
        this.acknowledge(fn);
    },
    acknowledge: function(fn) {
        this.on('acknowledge', fn);
    },
    process: function(task) {
        var event = task.event,
            name = task.name,
            channel = this._find(event, name),
            now = moment();

        var promise;

        if (channel && now.isAfter(task.date)) {
            channel._fromTask(task);

            promise = channel.matchPostponed(task.context, this.helpers)
                .finally(this._repeat.bind(this, channel, task.context))
                .then(this._fire.bind(this, channel, task.context));
        }

        return promise || Promise.reject();
    },
    _emit: function(channel, context) {
        var task = channel._toTask(context, this.helpers);
        this.emit('acknowledge', task.serialize());
    },
    _fire: function(channel, context) {
        if (channel.shouldTrigger())
            for (var action of channel.actions)
                action.fire(context, this.helpers);
    },
    _repeat: function(channel, context) {
        if (channel.shouldRepeat())
            this._emit(channel, context);
    }
}

util._extend(Flow.prototype, events.EventEmitter.prototype);

module.exports = Flow;
