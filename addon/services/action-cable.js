import Ember from 'ember';
import Consumer from 'ember-action-cable/consumer';
import Internal from 'ember-action-cable/internal';

export default Ember.Service.extend({

  createConsumer(url) {
    if (!url) {
      url = this.endpoint();
    }

    return Consumer.create({
      url: this.createWebSocketURL(url),
      cable: this
    });
  },

  endpoint() {
    let ref = this.getConfig("url");
    url = (ref !== null) ? ref : Internal.default_mount_path;
  },

  getConfig(name) {
    let tagName = `meta[name='action-cable-${name}']`;
    let element = document.head.querySelector(tagName);

    if (element) {
      return element.getAttribute("content");
    }
  },

  createWebSocketURL(url) {
    if (url && !/^wss?:/i.test(url)) {
      let a = document.createElement("a");
      a.href = url;
      // Fix populating Location properties in IE.
      // Otherwise, protocol will be blank.
      a.href = a.href;
      a.protocol = a.protocol.replace("http", "ws");
      return a.href;
    } else {
      return url;
    }
  },

  startDebugging() {
    return this.set('debugging', true);
  },

  stopDebugging() {
    return this.set('debugging', null);
  },

  log(...messages) {
    if (this.get('debugging')) {
      messages.push(Date.now());
      return console.log("[ActionCable]", messages);
    }
  }

});
