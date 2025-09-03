'use strict';

const Homey = require('homey');
// Node.js v12 (Homey 2019) does not have fetch built-in
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

module.exports = class RenovasjonApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('RenovasjonApp has been initialized');
  }

};
