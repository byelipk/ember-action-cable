import Ember from 'ember';

export default Ember.Object.extend({

  consumer: null,
  mixin: null,
  params: null,

  init() {
    this._super(...arguments);

    if (!this.get('params')) {
      this.params = {};
    }

    this.identifier = JSON.stringify(this.get('params'));
  },

  perform(action, data) {
    if (data == null) {
      data = {};
    }
    data.action = action;
    return this.send(data);
  },

  send(data) {
    return this.consumer.send({
      command: "message",
      identifier: this.get('identifier'),
      data: JSON.stringify(data)
    });
  },

  unsubscribe() {
    return this.get('consumer.subscriptions').remove(this);
  }
});
