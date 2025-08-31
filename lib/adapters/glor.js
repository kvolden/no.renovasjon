'use strict';

const BaseAdapter = require('./baseadapter');

module.exports = class GLORAdapter extends BaseAdapter {
  static MUNICIPALITIES = new Set([
    '3441', // Gausdal
    '3405', // Lillehammer
    '3440' // Øyer
  ]);

  getName() {
    return 'GLØR';
  }

  async coversMunicipality(municipalityCode) {
    return GLORAdapter.MUNICIPALITIES.has(String(municipalityCode));
  }

  async fetchAddressUUID(addressData) {
    let addrString = addressData.adressenavn;
    if (addressData.nummer !== '') {
      addrString += ` ${addressData.nummer}`;
    }
    if (addressData.bokstav) {
      addrString += ` ${addressData.bokstav}`;
    }
    try {
      const response = await fetch(`https://proaktiv.glor.offcenit.no/search?q=${encodeURIComponent(addrString)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      if (respJson.length === 0) {
        throw new Error( `No address found: ${addrString}`);
      }
      const match = respJson.find(entry => entry.adresse.toUpperCase() == addrString.toUpperCase() && entry.kommune.toUpperCase() == addressData.kommunenavn);
      return match.id;
    }
    catch (error) {
      console.error(`Error fetching address UUID from ${this.getName()}:`, error);
      throw error;
    }
  }

  async fetchFractionDates(addressData, addressUUID) {
    const fractionMap = {
      "1322": "glass",
      "1111": "food",
      "1299": "paper",
      "1799": "plastic",
      "9999": "general",
    };

    try {
      const response = await fetch(`https://proaktiv.glor.offcenit.no/details?id=${addressUUID}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      return this.reducedDisposals(respJson, fractionMap, 'fraksjonId', 'dato');
    }
    catch (error) {
      console.error(`Error fetching data from ${this.getName()}:`, error);
      throw error;
    }
  }
}
