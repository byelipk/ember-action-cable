import Ember from 'ember';
import Subscription from 'ember-action-cable/subscription';

const {
  tryInvoke,
  typeOf,
  isEqual
} =  Ember;

export default Ember.Object.extend({

  cable: null,
  consumer: null,
  subscriptions: [],

  create(channelName, mixin) {
    let params       = isEqual(Ember.typeOf(channelName), 'object') ? channelName : { channel: channelName };
    let callbacks    = Ember.Mixin.create(mixin);
    let subscription = Subscription.extend(callbacks, {
      subscriptions: this,
      consumer: this.get('consumer'),
      params: params
    }).create();

    this.add(subscription);
  },

  /**
   Given a subscription instance, do the following:

   1. Push the subscription into the underlaying
      subscriptions array.

   2. Check that there is an open websocket connecting.

   3. Invoke the `initialized` callback on the subscription.

   4. Send the `subscribe` command to the server.

   @private
   @method add
   @param {Subsciption} subscription
   @class Subscriptions
   */
  add(subscription) {
    this.get('subscriptions').pushObject(subscription);
    this.get('consumer').ensureActiveConnection();
    this.notify(subscription, 'initialized');
    this.sendCommand(subscription, 'subscribe');
  },

  remove(subscription) {
    this.forget(subscription);

    if (!this.findAll(subscription.get('identifier')).length) {
      this.sendCommand(subscription, 'unsubscribe');
    }

    return subscription;
  },

  reject(identifier) {
    let results = [];

    this.findAll(identifier).forEach((subscription) => {
      this.forget(subscription);
      this.notify(subscription, "rejected");
      results.pushObject(subscription);
    });

    return results;
  },

  forget(subscription) {
    let subscriptions = this.get('subscriptions');
    let filtered = subscriptions.filter((s) => {
      return s !== subscription;
    });

    this.set('subscriptions', filtered);

    return subscription;
  },

  findAll(identifier) {
    let subscriptions = this.get('subscriptions');
    return subscriptions.filter(function(item) {
      return item.get('identifier').toLowerCase().match(identifier.toLowerCase());
    });
  },

  reload() {
    this.get('subscriptions').forEach((subscription) => {
      this.sendCommand(subscription, "subscribe");
    });
  },

  notifyAll(callback, ...args) {
    this.get('subscriptions').forEach((subscription) => {
      this.get('cable').log(args);
      this.notify(subscription, callback, args);
    });
  },

  /**
   Given a subscription instance, a name of a callback,
   and any arguments to be passed to the callback, invoke
   the callback on the subscription.

   ActionCable exposes 4 hooks a consumer can tie into
   when a new subscription to a channel is created:

   ```javascript
    consumer.subscriptions.create("RoomChannel", {

      initialized() {
        // Subscription is initialized.
      },

      connected() {
        // Websocket is connected.
      },

      received(data) {
        // Websocket received data from server.
      },

      disconnected() {
        // Websocket is disconnected.
      }
    });
   ```

   @private
   @method notify
   @param {Subsciption} subscription
   @param {String} callbackName
   @param {any} Any arguments to the callback
   @class Subscriptions
   */
  notify(subscription, callbackName, ...args) {
    let subscriptions;
    if (typeOf(subscription)  === 'string') {
      subscriptions = this.findAll(subscription);
    } else {
      subscriptions = [subscription];
    }

    subscriptions.forEach((subscription) => {
      this.get('cable').log(`Invoking ${callbackName}`, subscription.toString());
      tryInvoke(subscription, callbackName, args);
    });
  },

  /**
   Given a subscription instance and a command,
   send the command on to the consumer to be sent
   into the WebSocket connection.

   @private
   @method sendCommand
   @param {Subsciption} subscription
   @param {String} command
   @class Subscriptions
   */
  sendCommand(subscription, command) {
    this.get('cable').log(`Subscriptions#sendCommand: ${command}`)
    this.get('consumer').send({
      command: command,
      identifier: subscription.get('identifier')
    });
  }
});
