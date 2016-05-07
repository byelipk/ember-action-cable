import Ember from 'ember';
import Internal          from 'ember-action-cable/internal';
import ConnectionMonitor from 'ember-action-cable/connection-monitor';

const { computed } = Ember;

export default Ember.Object.extend({

  // WebSocket ready states:
  //   'CONNECTING'
  //   'OPEN'
  //   'CLOSING'
  //   'CLOSED'

  state:     null,
  consumer:  null,
  websocket: null,
  cable:     null,

  init() {
    this._super(...arguments);

    this.reopenDelay   = 500;
    this.disconnected  = true;

    this.monitor = ConnectionMonitor.create({
      connection: this,
      cable: this.get('cable')
    });

    this.supportedProtocols   = Internal.get('supportedProtocols');
    this.unsupportedProtocols = Internal.get('unsupportedProtocols');
  },

  subscriptions: computed('consumer.subscriptions.[]', function() {
    return this.get('consumer.subscriptions');
  }),

  send(data) {
    if (this.isOpen()) {
      this.get('cable').log(`WS connection is ${this.get('state')}. Sending data...`);
      console.log(data);
      this.get('websocket').send(JSON.stringify(data));
    } else {
      this.get('cable').log(`WS connection is ${this.get('state')}. Cannot send data.`);
    }
  },

  open() {
    if (this.get('isActive')) {
      this.get('cable').log(`Attempted to open WebSocket, but existing socket is ${this.get('state')}`);

      throw new Ember.Error("Existing connection must be closed before opening");

    } else {
      this.get('cable').log(`Opening WebSocket, current state is ${this.get('state')}}, subprotocols: ${Internal.get('protocols')}`);

      if (this.get('websocket')) {
        this.uninstallEventHandlers();
      }

      this.set('websocket',
        new WebSocket(this.get('consumer.url'),
        Internal.get('protocols')));

      this.installEventHandlers();

      this.get('monitor').start();


      this.get('cable').log(`WS current state is ${this.get('state')}}`);

      return true;

    }
  },

  close(reconnect) {
    let allowReconnect = reconnect !== null ? reconnect : true;

    if (!allowReconnect) {
      this.get('monitor').stop();
    }

    if (this.get('isActive') && this.get('websocket')) {
      this.get('websocket').close();
    }

  },

  reopen() {
    this.get('cable').log(`Reopening WebSocket, current state is ${this.get('state')}`);

    if (this.get('isActive')) {
      try {
        this.close();
      } catch (e) {
        this.get('cable').log(`Failed to reopen WebSocket`, e);
      } finally {
        this.get('cable').log(`Reopening WebSocket in ${this.get('reopenDelay')} ms`);
        Ember.run.later(this, this.open, this.get('reopenDelay'));
      }
    } else {
      this.open();
    }
  },

  isOpen() {
    return this.isState("OPEN");
  },

  isActive: computed('state', function() {
    return this.isState("OPEN", "CONNECTING");
  }),

  protocol: computed('websocket', function() {
    if (this.get('websocket')) {
      return this.get('websocket.protocol');
    }
  }),

  isProtocolSupported: computed('protocol', function() {
    return this.get('supportedProtocols').contains(this.get('protocol'));
  }),

  isState(...states) {
    let result = false;
    let ws     = this.get('websocket');

    if (!ws) {
      this.set('state', null);
      return result;
    }

    states.forEach((state) => {
      if (ws.readyState === WebSocket[state]) {
        this.set('state', state);
        result = true;
      }
    });

    return result;
  },

  installEventHandlers() {
    this.get('cable').log(`Installing event handlers on WS`);

    const events = this.get('events');
    const keys   = Object.keys(events);

    keys.forEach((event) => {
      let handler = events[event].bind(this);
      this.get('websocket')[`on${event}`] = handler;
    });
  },

  uninstallEventHandlers() {
    const events = this.get('events');
    const keys   = Object.keys(events);

    keys.forEach((event) => {
      this.get('websocket')[`on${event}`] = null;
    });

    this.get('cable').log(`Event handlers uninstalled from ws:`);
  },

  // NOTE
  // A WebSocket has for events we need to handle:
  // => onmessage
  // => onopen
  // => onclose
  // => onerror
  events: {

    open() {
      this.get('cable').log(`WebSocket onopen event, using '${this.get('protocol')}' subprotocol`);

      this.set('disconnected', false);

      if (!this.get('isProtocolSupported')) {
        this.get('cable').log("Protocol is unsupported. Stopping monitor and disconnecting.");
        this.close({allowReconnect: false});
      }
    },

    message(event) {
      if (!this.get('isProtocolSupported')) {
        return;
      }

      const {
        identifier,
        message,
        type  } = JSON.parse(event.data);

      let subscriptions = this.get('subscriptions');
      let monitor       = this.get('monitor');

      // TODO
      // Let's refactor our the switch statement
      // at some point.
      switch(type) {

        case Internal.get('messageTypes.welcome'):
          this.get('cable').log(`Welcome message`);
          monitor.recordConnect();
          subscriptions.reload();
          break;

        case Internal.get('messageTypes.ping'):
          this.get('cable').log(`Ping message`);
          monitor.recordPing();
          break;

        case Internal.get('messageTypes.confirmation'):
          this.get('cable').log(`Confirmation message: ${identifier}`);
          subscriptions.notify(identifier, "connected");
          break;

        case Internal.get('messageTypes.rejection'):
          this.get('cable').log(`Rejection message: ${identifier}`);
          subscriptions.reject(identifier);
          break;

        default:
          this.get('cable').log(`Data message: ${identifier}`);
          subscriptions.notify(identifier, "received", message);
      }
    },

    close(/*event*/) {
      this.get('cable').log("WebSocket onclose event");

      if (this.get('disconnected')) {
        return;
      }

      this.set('disconnected', true);
      this.get('monitor').recordDisconnect();
      this.get('subscriptions').notifyAll("disconnected", {
        willAttemptReconnect: this.get('monitor').isRunning()
      });
    },

    error() {
      this.get('cable').log("WebSocket onerror event");
    }

  }
});
