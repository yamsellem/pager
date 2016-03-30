"use strict";

var chai   = require('chai').use(require('chai-datetime')),
    sinon  = require('sinon'),
    moment = require('moment'),
    Flow   = require('../lib/flow'),
    Action = require('../lib/action'),
    Rule   = require('../lib/rules/rule'),
    assert = chai.assert;

describe('flow', function() {

    beforeEach(function() {
        this.clock = sinon.useFakeTimers();
    });

    it('should refuse two channels named as such', function() {
        var flow = new Flow({options: 'set'}),
            emit = sinon.spy(flow, 'emit');

        flow.subscribe('yellow:submarine')
            .channel('emerge');

        assert.throw(flow.channel.bind(flow, 'emerge'), Error, 'Channel already exists');
    });

    it('should queue task if no rule', function(done) {
        var flow = new Flow({options: 'set'}),
            emit = sinon.spy(flow, 'emit');

        flow.subscribe('yellow:submarine')
            .channel('emerge');

        flow.message('yellow:submarine', {id: 1}).then(function() {
            sinon.assert.calledOnce(emit);
            sinon.assert.calledWith(emit, 'acknowledge', {
                channel: 'emerge',
                event: 'yellow:submarine',
                context: {id: 1},
                date: new Date(),
                dedup: null,
                flag: null
            });

            done();
        }).catch(done);
    });

    it('should queue task if immediate rule matches', function(done) {
        var flow = new Flow({options: 'set'}),
            emit = sinon.spy(flow, 'emit'),
            rule = new Rule(),
            match = sinon.spy(rule, 'match');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .comply(rule);

        flow.message('yellow:submarine', {id: 1}).then(function() {
            sinon.assert.calledOnce(emit);
            sinon.assert.calledOnce(match);
            sinon.assert.calledWith(match, {id: 1}, {options: 'set'});

            done();
        }).catch(done);
    });

    it('should not queue task if immediate rule does not match', function(done) {
        var flow = new Flow({options: 'set'}),
            emit = sinon.spy(flow, 'emit'),
            rule = new Rule({match: function() { return false; }}),
            match = sinon.spy(rule, 'match');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .comply(rule);

        flow.message('yellow:submarine', {id: 1}).then(function() {
            sinon.assert.notCalled(emit);
            sinon.assert.calledOnce(match);
            sinon.assert.calledWith(match, {id: 1}, {options: 'set'});

            done();
        }).catch(done);
    });

    it('should queue task without matching postponed rule', function(done) {
        var flow = new Flow({options: 'set'}),
            emit = sinon.spy(flow, 'emit'),
            rule = new Rule({match: function() { return false; }}),
            match = sinon.spy(rule, 'match');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .after(5)
            .comply(rule);

        flow.message('yellow:submarine', {id: 1}).then(function() {
            sinon.assert.calledOnce(emit);
            sinon.assert.notCalled(match);

            done();
        }).catch(done);
    });

    it('should process task without matching immediate rule', function(done) {
        var flow = new Flow({options: 'set'}),
            emit = sinon.spy(flow, 'emit'),
            rule = new Rule(),
            match = sinon.spy(rule, 'match'),
            action = new Action(),
            fire = sinon.spy(action, 'fire');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .comply(rule)
            .trigger(action);

        var task = {
            event: 'yellow:submarine',
            channel: 'emerge',
            context: {id: 1},
            date: moment().subtract(1, 'seconds').toDate()
        };
        flow.process(task).then(function() {
            sinon.assert.notCalled(emit);
            sinon.assert.notCalled(match);
            sinon.assert.called(fire);

            done();
        }).catch(done);
    });

    it('should not process task if postponed rule timer not reached', function(done) {
        var flow = new Flow({options: 'set'}),
            rule = new Rule(),
            match = sinon.spy(rule, 'match'),
            action = new Action(),
            fire = sinon.spy(action, 'fire');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .after(5)
            .comply(rule)
            .trigger(action);

        var task = {
            event: 'yellow:submarine',
            channel: 'emerge',
            context: {id: 1},
            date: moment().add(5, 'seconds').toDate()
        };
        flow.process(task).then(function() {
            sinon.assert.notCalled(match);
            sinon.assert.notCalled(fire);

            done();
        }).catch(done);
    });

    it('should process task if postponed rule timer reached', function(done) {
        var flow = new Flow({options: 'set'}),
            rule = new Rule(),
            match = sinon.spy(rule, 'match'),
            action = new Action(),
            fire = sinon.spy(action, 'fire');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .after(5)
            .comply(rule)
            .trigger(action);

        var task = {
            event: 'yellow:submarine',
            channel: 'emerge',
            context: {id: 1},
            date: moment().add(5, 'seconds').toDate()
        };

        this.clock.tick(5001);
        flow.process(task).then(function() {
            sinon.assert.called(match);
            sinon.assert.calledWith(match, task.context, {options: 'set'});
            sinon.assert.called(fire);

            done();
        }).catch(done);
    });

    it('should process task without action if postponed rule not match', function(done) {
        var flow = new Flow({options: 'set'}),
            rule = new Rule({match: function() { return false; }}),
            action = new Action(),
            fire = sinon.spy(action, 'fire')

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .after(5)
            .comply(rule)
            .trigger(action);

        var task = {
            event: 'yellow:submarine',
            channel: 'emerge',
            context: {id: 1},
            date: moment().add(5, 'seconds').toDate()
        };

        this.clock.tick(5001);
        flow.process(task).then(function() {
            sinon.assert.notCalled(fire);

            done();
        }).catch(done);
    });

    it('should process task action if postponed rule matches', function(done) {
        var flow = new Flow({options: 'set'}),
            rule = new Rule(),
            action = new Action(),
            fire = sinon.spy(action, 'fire');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .after(5)
            .comply(rule)
            .trigger(action);

        var task = {
            event: 'yellow:submarine',
            channel: 'emerge',
            context: {id: 1},
            date: moment().add(5, 'seconds').toDate()
        };

        this.clock.tick(5001);
        flow.process(task).then(function() {
            sinon.assert.called(fire);
            sinon.assert.calledWith(fire, task.context, {options: 'set'});

            done();
        }).catch(done);
    });

    it('should process task action repeat channel', function(done) {
        var flow = new Flow({options: 'set'}),
            emit = sinon.spy(flow, 'emit'),
            rule = new Rule(),
            action = new Action(),
            fire = sinon.spy(action, 'fire');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .every(5)
            .comply(rule)
            .trigger(action);

        var task = {
            event: 'yellow:submarine',
            channel: 'emerge',
            context: {id: 1},
            date: moment().add(5, 'seconds').toDate(),
            flag: 'available'
        };
        var processMoment = moment().add(5001, 'millisecond'),
            nextProcessMoment = processMoment.add(4999, 'millisecond');

        this.clock.tick(5001);
        flow.process(task).then(function() {
            sinon.assert.called(fire);
            sinon.assert.calledWith(fire, task.context, {options: 'set'});
            assert.equalDate(task.date, nextProcessMoment.toDate());

            done();
        }).catch(done);
    });

    it('should process all task action', function(done) {
        var flow = new Flow({options: 'set'}),
            firstAction = new Action(),
            secondAction = new Action(),
            firstFire = sinon.spy(firstAction, 'fire'),
            secondFire = sinon.spy(secondAction, 'fire');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .every(5)
            .trigger(firstAction, secondAction);

        var task = {
            event: 'yellow:submarine',
            channel: 'emerge',
            context: {id: 1},
            date: moment().add(5, 'seconds').toDate(),
            flag: 'available'
        };

        this.clock.tick(5001);
        flow.process(task).then(function() {
            sinon.assert.called(firstFire);
            sinon.assert.called(secondFire);
            sinon.assert.calledWith(firstFire, task.context, {options: 'set'});
            sinon.assert.calledWith(secondFire, task.context, {options: 'set'});

            done();
        }).catch(done);
    });

    it('should dedup task', function(done) {
        var flow = new Flow({options: 'set'}),
            emit = sinon.spy(flow, 'emit'),
            rule = new Rule({match: function() { return false; }}),
            match = sinon.spy(rule, 'match');

        flow.subscribe('yellow:submarine')
            .channel('emerge')
            .dedup(function(context) {
                return context.id;
            })
            .after(5)
            .comply(rule);

        flow.message('yellow:submarine', {id: 1}).then(function() {
            sinon.assert.calledOnce(emit);
            sinon.assert.calledWith(emit, 'acknowledge', {
                channel: 'emerge',
                event: 'yellow:submarine',
                context: {id: 1},
                dedup: 1,
                date: moment().add(5, 'seconds').toDate(),
                flag: null
            });

            done();
        }).catch(done);
    });
});
