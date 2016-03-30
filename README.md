![logo](https://cloud.githubusercontent.com/assets/606754/12453112/02ca0ee6-bf92-11e5-9269-1a7fe6c96d9f.png)

# Pager

Say you want to email a user for his birthday, or when his visa card expires or maybe if his last post has been shared a 100 times. Those events are not connected to this user's actions, they rely on the passing of time or someone else behavior. This may result in chunky code out of context. Know what? You've just got a message from Pager.

Pager is a lightweight rule engine which associate a set of immediate or postponed rules to actions.

# Installation

```
npm install pager
```

# Usage

When something happened (_ex. a post is liked_) and you want to check some rules and trigger some actions accordingly, send a `message` to a `Pager` instance with the event data (_ex. a card expiry date_). Immediate rules (if any) will be evaluated and, if they all match, pager's `acknowledge` method will be invoked. This do not trigger any actions yet.

To trigger the actions, call pager's `process` method with the `task` returned by `acknowledge`. Postponed rules (if any) will be evaluated then, and, if they all match, the actions will be triggered.

As you may have guessed, each `task` has a date attribute and the `process` method will only evaluate postponed rules if this date is in the past.

Passing the `acknowledge` tasks to the `process` method is up to you, because you may choose to do so every minute, hour, or immediately, depending on your needs. You may also store those tasks in a cache, a db, or not at all.

![Concept](https://cloud.githubusercontent.com/assets/606754/12476994/2a97bf18-c02d-11e5-9529-7cc2e91c5c21.png)

### Initializing

Before using a `Pager` instance, it's flow has to be configured:
* `subscribe` to every message it will handle (_ex. a card expiry_)
* gather each set of multiple `Rule` + `Action` under a group named `channel` (_to be referenced to later_)
* list all `Rule` this subscription should `comply` and/or `reject` to `trigger` its `Action`
* list all `Action` to `trigger` if every `Rule` match

```javascript
var Pager = require('pager'),
    pager = new Pager();

pager.subscribe('Card expiry')
    .channel('Invite user to renew visa')
    .comply(new Pager.Rule({
        match: function(context) {
            return new Date(context.expiry) < new Date();
        }
    }))
    .trigger(new Pager.Action({
        fire: function(context) {
            console.log('Please, add a new visa');
        }
    }));
```

### Action triggering

Once configured, a `pager` can capture a `message` and its context (_ex. a card expiry date_), then, it will `acknowledge` if the context matches the associated rules. Actions are not triggered yet.

```javascript
pager.message('Card expiry', {expiry: '2015-12'});

pager.acknowledge(function(task) {
    // trigger the actions, can be stored in a cache to be processed later
    pager.process(task);
});
```

### Initializing immediate and postponed rules

Rules can be verified immediately on a `message` (_and `acknowledge` if match_) or postponed to it (_and `trigger` if match_). On initializing, calling `after` or `every` with a period defers rules chained after this call.

```javascript
pager.subscribe('Card expiry')
    .channel('Invite user to deposit')
    .comply(immediateRule)
    .after(5, 'minutes')
    .comply(postponedRule)
    .trigger(action);
```

A `message` to this `pager` will be `acknowledge` if the immediateRule immediately matches, and, if so, will return a `task` with a date 5 minutes in the future. Then, when you process this `task` once its date is in the past, the postponedRule will be matched, and, if so, the actions will be triggered.

The `every` method follows the same pattern, but additionally updates the `task` date with the configured period, ready to be processed again later. It also offers a mechanism to avoid repetitive triggers of the same action (_ex. “please, change your visa”_). A `flag` is set on the `task` — null in other cases — here sets as `'available'` until its actions has been triggered. Then, the flag is toggle to `'triggered'`. A `flag` set to `'triggered'` prevent any action. This `flag` is turned back to `'available'` only when one (or more) postponed rules do not match, ready to be triggered on the next `process` if they match again.

# Documentation

### Rule

```javascript
var rule = new Pager.Rule({
    match: function(context, helpers) {
        return new Date(context.expiry) < new Date();
    }
});
```

[_Initializing_] A rule can be immediate or postponed (_depending on how it's initialized in a `channel`_). Immediate rule are evaluated on a `message`, and create a `task` if match. Postponed rules will be evaluated on a `process`, and trigger actions if match.

* Should return a boolean or a promise of a boolean
* Gets the `context` provided in the `message` call and the `helpers` provided in the `pager` creator

### Action

```javascript
var action = new Pager.Action({
    fire: function(context, helpers) {
        console.log('Account need a deposit');
    }
});
```

[_Initializing_] An action is a piece of code to execute, when rules match.

* May return a value or the promise of a value (_if `process` return is used_)
* Gets the `context` provided in the `message` call and the `helpers` provided in the `pager` creator.

### Task

```javascript
var task = {
    channel: 'Invite user to deposit',
    event: 'Card expiry',
    context: {expiry: '2015-12'}, // data provided to the message method
    date: ..., // date object since when this task can be processed
    flag: ... // flag [null, 'available', 'triggered'], used for forever task
}
```

A task is returned by the `acknowledge` method and awaited by the `process` method. Its date represents the moment since when this task can be processed (_maybe in the future_). Its flag is used for forever task (_using `every` method set it to `'available'`_), default to `null`. It may be changed manually (_with care_) if this logic is not desired.

### Middleware

```javascript
var middleware = function(context, helpers) {
        context.vat = helpers.vat(context.country);
    }
});
```

[_Initializing_] A middleware if a function that can update the context.

* May return a promise
* Gets the `context` provided in the `message` call and the `helpers` provided in the `pager` creator.

### Pager

##### Constructor

```javascript
var pager = new Pager(helpers);
```

[_Initializing_] Create a `pager` with a `helpers` object that will be given to every rule, action and middleware.

##### subscribe

```javascript
pager.subscribe(event)
```

[_Initializing_] Create a subscription to a given event name. Will be invoked though `message` method with the same event name. Can be chained (returns itself).

##### channel

```javascript
var channel = pager.channel(name)
```

[_Initializing_] Create a channel — a group of rules & actions — and returns it. A subscription may contains multiple channels. The channel name will be used in the `acknowledge` callback `task` value.

##### message

```javascript
pager.message(event, context)
```

Apply the context to the event subscribed immediate rules. Will eventually trigger the `acknowledge` callback if all immediate rules match. Return a promise (_mostly for test purpose_).

##### acknowledge

```javascript
pager.acknowledge(callback)
```

Declare a callback to invoke when a `message` is invoked and all rules match. The callback argument is a `task` with attributes `{channel, event, context, date, flag}`. The date equals the moment since when this task can be processed. The flag helps the `every` to not trigger action every time.

##### ack

See acknowledge

##### process

```javascript
pager.process(task)
```

Evaluate postponed rules and trigger the actions if they match. The `task` attributes should includes `{channel, event, context, date, flag}`, the object can be a db wrapper or anything, only `flag` and `date` attributes may be updated here. Return a promise (_mostly for test purpose_).

### Channel

##### comply

```javascript
channel.comply(rule, ...)
```

[_Initializing_] Declare a rule (_or a list of rules_) to match on this channel for the given context. Immediate rule if `after` or `every` wasn't called, postponed rule otherwise. Can be chained.

##### reject

```javascript
channel.reject(rule, ...)
```

[_Initializing_] Declare a rule (_or a list of rules_) to not match on this channel for the given context. Immediate rule if `after` or `every` wasn't called, postponed rule otherwise. Can be chained.

##### trigger

```javascript
channel.trigger(action, ...)
```

[_Initializing_] Declare an action (_or a list of rules_) to trigger on this channel for the given context. Can be chained.

##### after

```javascript
channel.after(number, unit)
```

[_Initializing_] Change following `comply` and `reject` from immediate rules declaration (_default_) to postponed rules declaration. The date of the `acknowledge` callback value will be incremented by this. Unit default to `'seconds'`, can also be `'minutes'`, `'hours'`, `'days'`. Can only be called once per channel (_and without every_). Can be chained.

##### every

```javascript
channel.every(number, unit)
```

[_Initializing_] Same as `after` but will `acknowledge` the task after `process`. Basically, it creates a loop. Can only be called once per channel (_and without after_). Can be chained.

##### then

```javascript
channel.then(middleware, ...)
```

[_Initializing_] Declare a function that will be invoked for the given context and can update it (_ex. add a value for further usage_). Can be chained.

##### dedup

```javascript
channel.dedup(function(context) { return ...})
```

[_Initializing_] Declare a function that will be invoked for the given context and will add a `dedup` attribute to each returned task. This help to spot different tasks that should be considered similar — and avoid doing twice an action that don't need to. Can be chained.

##### channel

```javascript
channel.channel(name)
```

[_Initializing_] Returns a new channel. See pager.channel for more.
