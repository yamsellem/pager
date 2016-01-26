"use strict";

var moment = require('moment'),
    Rule = require('./rules/rule');

var Task = function(channel, event, delay, flag, context) {
    this.channel = channel;
    this.event = event;
    this.delay = delay;
    this.flag = flag;
    this.context = context;
};

Task.prototype = {
    serialize: function() {
        return {
            channel: this.channel,
            event: this.event,
            date: moment().add(this.delay, 'seconds').toDate(),
            flag: this.flag,
            context: this.context
        };
    }
};

Task.delay = function(serialized, delay) {
    serialized.date = moment(serialized.date).add(delay, 'seconds').toDate();
};

module.exports = Task;
