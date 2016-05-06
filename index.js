/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-action-cable',

  included(app, parentAddon) {
    let target = (parentAddon || app);
    // Now you can modify the app / parentAddon. For example, if you wanted
    // to include a custom preprocessor, you could add it to the target's
    // registry:
    //
    //     target.registry.add('js', myPreprocessor);

    this.ui.writeLine(`Included into ${app}`);
  },

  isDevelopingAddon: function() {
    return true;
  }
};
