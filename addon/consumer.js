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
    this.get('connection').send(data);
  },

  connect() {
    this.get('connection').open();
  },

  disconnect() {
    this.get('connection').close({
      allowReconnect: false
    });
  },

  ensureActiveConnection() {
    this.get('cable').log(`Checking WS connection...`);
    if (!this.get('connection.isActive')) {
      this.get('cable').log(`WS connection is ${this.get('connection.state')}. Attempting to open WS connection...`);
      this.connect();
    }
  }

});
