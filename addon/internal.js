import Ember from 'ember';

let Internal = Ember.Object.extend({
  messageTypes: {
    welcome: 'welcome',
    ping: 'ping',
    confirmation: 'confirm_subscription',
    rejection: 'reject_subscription'
  },

  default_mount_path: '/cable',

  supportedProtocols: [
    "actioncable-v1-json"
  ],

  unsupportedProtocols: [
    "actioncable-unsupported"
  ],

  protocols: Ember.computed('supportedProtocols.[]', 'unsupportedProtocols.[]', function() {
    return this.get('supportedProtocols').concat(this.get('unsupportedProtocols'));
  })
});

export default Internal.create();
