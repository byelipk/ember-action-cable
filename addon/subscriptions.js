import Ember from 'ember';
import ActionCable  from 'ember-action-cable/services/action-cable';
import Subscription from 'ember-action-cable/subscription';

export default Ember.Object.extend({

  cable: null,

  init() {
    this._super(...arguments);

    this.subscriptions = [];
  },

  create(channelName, mixin) {
    let channel = channelName;

    let params  = typeof channel === "object" ? channel : {
      channel: channel
    };

    let subscription = Subscription.create({
      consumer: this,
      params: params,
      mixin: mixin
    });

    return this.add(subscription);
  },

  add(subscription) {
    this.get('subscriptions').pushObject(subscription);
    this.consumer.ensureActiveConnection();
    this.notify(subscription, 'initialized');
    this.sendCommand(subscription, 'subscribe');

    return subscription;
  },

  remove(subscription) {
    this.forget(subscription);

    if (!this.findAll(subscription.identifier).length) {
      this.sendCommand(subscription, "unsubscribe");
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
    let filtered = subscriptions.filter((s) => {
      return s.identifier === identifier;
    });

    return filtered;
  },

  reload() {
    this.get('subscriptions').forEach((subscription) => {
      this.sendCommand(subscription, "subscribe");
    });
  },

  notifyAll(callback) {
    this.get('subscriptions').forEach((subscription) => {
      this.get('cable').log(...arguments);
      this.notify(subscription, callback, ...arguments);
    });
  },

  notify(subscription, callback) {
    let subscriptions;

    if (typeof subscription === "string") {
      subscriptions = this.findAll(subscription);
    } else {
      subscriptions = [subscription];
    }

    this.get('subscriptions').forEach(() => {
      if (typeof subscription[callback] === "function") {
        subscription[callback].apply(subscription, ...arguments);
      }
    });
  },

  sendCommand(subscription, command) {
    let identifier = subscription.identifier;

    this.consumer.send({
      command: command,
      identifier: identifier
    });
  }
});
