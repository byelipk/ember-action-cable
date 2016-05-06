import Ember         from 'ember';
import Connection    from 'ember-action-cable/connection';
import Subscriptions from 'ember-action-cable/subscriptions';

export default Ember.Object.extend({

  cable: null,

  init() {
    this._super(...arguments);

    this.subscriptions = Subscriptions.create({
      consumer: this,
      cable: this.get('cable')
    });

    this.connection = Connection.create({
      consumer: this,
      url: this.get('url'),
      cable: this.get('cable')
    });
  },

  send(data) {
    return this.get('connection').send(data);
  },

  connect() {
    return this.get('connection').open();
  },

  disconnect() {
    return this.get('connection').close({
      allowReconnect: false
    });
  },

  ensureActiveConnection() {
    if (!this.get('connection.isActive')) {
      return this.get('connection').open();
    }
  }

});
