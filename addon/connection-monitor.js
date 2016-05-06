import Ember from 'ember';
import ActionCable from 'ember-action-cable/services/action-cable';

const { computed } = Ember;

export default Ember.Object.extend({

  init() {
    this._super(...arguments);

    this.connection        = null;
    this.pollInterval      = { min: 3, max: 30 };
    this.staleThreshold    = 6;
    this.reconnectAttempts = 0;
    this.startedAt         = null;
    this.stoppedAt         = null;
    this.pingedAt          = null;
    this.pollTimeout       = null;
  },

  start() {
    if (!this.get('isRunning')) {
      this.set('startedAt', this.now());
      this.set('stoppedAt', null);
      this.startPolling();

      // TODO
      // Use actions instead of event listeners!
      // document.addEventListener(
      //   "visibilitychange", this.get('visibilityDidChange'));

      this.get('cable').log(`ConnectionMonitor started. pollInterval = ${this.get('getPollInterval')} ms`);
    }
  },

  stop() {
    if (this.get('isRunning')) {
      this.set('stoppedAt', this.now());
      this.stopPolling();

      // TODO
      // Use actions instead of event listeners!
      // document.removeEventListener(
      //   "visibilitychange", this.visibilityDidChange);

      this.get('cable').log("ConnectionMonitor stopped");
    }
  },

  isRunning: computed('startedAt', 'stoppedAt', function() {
    return (this.get('startedAt') !== null) &&
           (this.get('stoppedAt') === null);
  }),

  recordPing() {
    this.set('pingedAt', this.now());
  },

  recordConnect() {
    this.set('reconnectAttempts', 0);
    this.recordPing();
    this.set('disconnectAt', null);
    this.get('cable').log("ConnectionMonitor recorded connect");
  },

  recordDisconnect() {
    this.set('disconnectAt', this.now());
    this.get('cable').log("ConnectionMonitor recorded disconnect");
  },

  startPolling() {
    this.stopPolling();
    this.poll();
  },

  stopPolling() {
    Ember.run.cancel(this.get('pollTimeout'));
  },

  poll() {
    let runLater = Ember.run.later(this, () => {
      this.reconnectIfStale();
      this.poll();
    }, this.get('getPollInterval'));

    this.set('pollTimeout', runLater);
  },

  getPollInterval: computed('reconnectAttempts', function() {
    return Math.max(3, Math.min(30, 5 * Math.log(this.get('reconnectAttempts') + 1) )) * 1000;
  }),

  reconnectIfStale() {
    if(this.connectionIsStale()) {
      this.get('cable').log(`ConnectionMonitor detected stale connection.
      reconnectAttempts = ${this.get('reconnectAttempts')},
      pollInterval      = ${this.get('getPollInterval')} ms,
      time disconnected = ${this.secondsSince(this.get('disconnectedAt'))} s,
      stale threshold   = ${this.get('staleThreshold')} s`);

      this.incrementProperty('reconnectAttempts');

      if (this.disconnectedRecently()) {
        this.get('cable').log("ConnectionMonitor skipping reopening recent disconnect");
      } else {
        this.get('cable').log("ConnectionMonitor reopening");
        this.get('consumer.connection').reopen();
      }
    }
  },

  connectionIsStale() {
    return this.secondsSince(this.get('pingedAt') ||
           this.get('startedAt')) > this.get('staleThreshold');
  },

  disconnectedRecently() {
    return this.get('disconnectedAt') &&
           this.secondsSince(this.get('disconnectedAt') ) < this.get('staleThreshold');
  },

  visibilityDidChange() {
    if (document.visibilityState === "visible") {
      Ember.run.later(this, () => {
        if (this.connectionIsStale() || !this.get('connection').isOpen()) {
          this.get('cable').log(`ConnectionMonitor reopening stale connection on visibilitychange. visbilityState = ${document.visibilityState}`);
          this.get('connection').reopen();
        }
      }, 200);
    }
  },

  now() {
    return new Date().getTime();
  },

  secondsSince(time) {
    return (Date.now() - time) / 1000;
  },

  clamp(number, min, max) {
    return Math.max(min, Math.min(max, number));
  }

});
