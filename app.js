'use strict';

const Homey = require('homey');

module.exports = class RenovasjonApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('RenovasjonApp has been initialized');
  }

};
