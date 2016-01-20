![logo](https://cloud.githubusercontent.com/assets/606754/12453112/02ca0ee6-bf92-11e5-9269-1a7fe6c96d9f.png)

# Pager

Say you want to email a user for his birthday, or when his visa card expired or maybe if his last post has been shared a lot. Those events are not connected to this user's actions, they rely on the passing of time or someone else behavior. This may result in chunky code out of context. Know what? You've just got a message from Pager.

Pager is a lightweight rule engine which associate a set of rules to immediate or postponed actions.

# Installation

```
npm install pager
```

# Usage

When something happened (_ex. a post is liked_) and you want to check some rules and trigger some actions accordingly, send a `message` to a `Pager` instance (_with the event data, ex. a card expiry date_). Immediate rules (if any) will be evaluated and, if they all match, the `acknowledge` method will be invoked. This do not trigger the actions.

To trigger the actions, call the `process` method with the `task` returned by the `acknowledge` method. Postponed rules (if any) will be evaluated then and, if they all match, the actions will be triggered.

Passing the `acknowledge` tasks to the `process` method is up to you, because you may choose to do so every minute, hour, or immediately, depending on your needs. You may also store those tasks in a cache, a db, or not at all.

![Concept](https://cloud.githubusercontent.com/assets/606754/12453625/51133ada-bf94-11e5-8edd-c774a356c757.png)

Before using a `Pager` instance, it's flow has to be configured:
* `subscribe` to every message it will handle (_ex. a card expiry_)
* each set of `Rule` + `Action` is gathered under a named `channel` (_to be referenced to later_)
* list all `Rule` this subscription has to `comply` and/or `reject`
* list all `Action` to `trigger` if all `Rules` match

```javascript
var Pager = require('pager'),
    pager = new Pager();

pager.subscribe('Card expiry')
    .channel('Invite user to deposit')
    .comply(new Pager.Rule({
        match: function(context) {
            return new Date(context.expiry) < new Date();
        }
    }))
    .trigger(new Pager.Action({
        fire: function(context) {
            console.log('Account need a new visa');
        }
    }));
```

Once configured, a `Pager` can capture a `message` and its context (_ex. a card expiry date_), then, it will `acknowledge` if the context matches the associated rules. Actions are not triggered yet.

```javascript
pager.message('Card expiry', {expiry: '2015-12'});

pager.acknowledge(function(task) {
    // force immediate process
    pager.process(task);
});
```

The `task` returned by `acknowledge` is:
```javascript
var task = {
    channel: 'Invite user to deposit',
    event: 'Card expiry',
    context: {expiry: '2015-12'},
    date: // date object since when this task can be processed
}
```

# Documentation

## Rule

```javascript
var rule = new Pager.Rule({
    match: function(context, helpers) {
        return new Date(context.expiry) < new Date();
    }
});
```

[_Initialization_] A rule can be immediate or postponed (depending on how it's Initialized in a `channel`). Can return a promise. Gets the `context` provided in the `message` call and the `helpers` provided in the `pager` creator.

## Action

```javascript
var action = new Pager.Action({
    fire: function(context, helpers) {
        console.log('Account need a deposit');
    }
});
```

[_Initialization_] An action is a piece of code to execute, when rules match. Can return a promise. Gets the `context` provided in the `message` call and the `helpers` provided in the `pager` creator.

## Middleware

```javascript
var middleware = function(context, helpers) {
        context.vat = helpers.vat(context.country);
    }
});
```

[_Initialization_] A middleware if a function that can update the context. Can return a promise. Gets the `context` provided in the `message` call and the `helpers` provided in the `pager` creator.

## Pager

### Constructor

```javascript
var pager = new Pager(helpers);
```

[_Initialization_] Create a pager with a helpers object that will be given to every rule, action and middleware.

### subscribe

```javascript
pager.subscribe(event)
```

[_Initialization_] Create a subscription to a given event name. Will be invoked though `message` method with the same event name. Can be chained (returns iteself).

### channel

```javascript
var channel = pager.channel(name)
```

[_Initialization_] Create a channel — a group of rules & actions — and returns it. A subscription may contains multiple channels. The channel name will be used in the `acknowledge` callback value.

### message

```javascript
pager.message(event, context)
```

Apply the context to the event subscribed immediate rules. Will eventually trigger the `acknowledge` callback if all rules match.

### acknowledge

```javascript
pager.acknowledge(callback)
```

Declare a callback to invoke when a `message` is invoked and all rules match. The callback argument is a task `{channel, event, context, date}`. The date equals the moment since when this task can be processed.

### ack

See acknowledge

### process

```javascript
pager.process(task)
```

Apply the task.context to the event subscribed postponed rules. Will eventually trigger the actions if all rules match.

## Channel

### comply

```javascript
channel.comply(rule, ...)
```

[_Initialization_] Declare a rule to match (or a list of rules) on this channel for the given context. Immediate rule if `after` or `every` wasn't called, postponed rule otherwise. Can be chained.

### reject

```javascript
channel.reject(rule, ...)
```

[_Initialization_] Declare a rule to not match (or a list of rules) on this channel for the given context. Immediate rule if `after` or `every` wasn't called, postponed rule otherwise. Can be chained.

### trigger

```javascript
channel.trigger(action, ...)
```

[_Initialization_] Declare an action to not trigger (or a list of actions) on this channel for the given context. Can be chained.

### after

```javascript
channel.after(number, unit)
```

[_Initialization_] Change following `comply` and `reject` from immediate rules declaration (default) to postponed rules declaration. The date used in the `acknowledge` callback value will be incremented by the given value. Unit default to `'seconds'`, can also be `'minutes'`, `'hours'`, `'days'`. Can only be called once per channel (and without every). Can be chained.

### every

```javascript
channel.every(number, unit)
```

[_Initialization_] Same as `after` but will `acknowledge` the task after `process`. Basically, it creates a loop. Can only be called once per channel (and without after). Can be chained.

### then

```javascript
channel.then(middleware, ...)
```

[_Initialization_] Declare a function that will be invoked for the given context and can update it (_ex. add a value for further usage_). Can be chained.

### channel

```javascript
channel.channel(name)
```

[_Initialization_] Returns a new channel. See pager.channel for more.
