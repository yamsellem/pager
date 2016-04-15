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
    message: function(event, context) {
        var channels = this.channels.filter(function(channel) {
            return channel.event === event;
        });

        var promises = [];
        for (var channel of channels) {
            var promise = channel.matchImmediate(context, this.helpers)
                .then(function(channel) {
                    var task = channel._toTask(context, this.helpers);
                    this.emit('acknowledge', task.serialize());
                }.bind(this, channel));

            promises.push(promise);
        }

        return Promise.all(promises).catch(function(e){
            if (e) throw e; // only propagate match errors not rules rejects
        });
    },
    ack: function(fn) {
        this.acknowledge(fn);
    },
    acknowledge: function(fn) {
        this.on('acknowledge', fn);
    },
    process: function(task) {
        var channel = this._find(task.event, task.channel),
            now = moment();

        var promise;

        if (channel && now.isAfter(task.date)) {
            channel._fromTask(task);

            promise = channel.matchPostponed(task.context, this.helpers)
                .bind(this)
                .then(function() {
                    var p = [];
                    if (channel.shouldTrigger())
                        for (var action of channel.actions)
                            p.push(action.fire(task.context, this.helpers));

                    return Promise.all(p);
                }).then(function() {
					if (task.flag === 'available')
						task.flag = 'triggered';
				}).catch(function(e) {
                    if (e) throw e; // only propagate match errors not rules rejects

					if (task.flag === 'triggered')
						task.flag = 'available';
                }).then(function() {
                    if (channel.shouldRepeat())
                        channel._delayTask(task);

                    return task;
                });
        }

        return promise || (channel ? Promise.resolve() : Promise.reject('Channel not found'));
    },
    _find: function(event, name) {
        return _.find(this.channels, function(channel) {
            return channel.event === event && channel.name === name;
        });
    }
};

util._extend(Flow.prototype, events.EventEmitter.prototype);

module.exports = Flow;
