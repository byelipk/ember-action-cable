import Ember from 'ember';

const { computed } = Ember;

export default Ember.Object.extend({

  mixin:    null,
  params:   {},

  identifier: computed('params', function() {
    return JSON.stringify(this.get('params'));
  }),

  perform(action, data = {}) {
    data.action = action;
    return this.send(data);
  },

  send(data) {
    return this.get('consumer').send({
      command: "message",
      identifier: this.get('identifier'),
      data: JSON.stringify(data)
    });
  },

  unsubscribe() {
    return this.get('subscriptions').remove(this);
  },

  initialized() {
    console.log("HELLO WORLD");
  }
});
