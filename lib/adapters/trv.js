'use strict';

const BaseAdapter = require('./baseadapter');

module.exports = class TRVAdapter extends BaseAdapter {
  static MUNICIPALITIES = new Set([
    '5001' // Trondheim
  ]);

  getName() {
    return 'Trondheim Renholdsverk (TRV)';
  }

  async coversMunicipality(municipalityCode) {
    return TRVAdapter.MUNICIPALITIES.has(String(municipalityCode));
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
      const response = await fetch(`https://trv.no/wp-json/wasteplan/v2/adress/?s=${encodeURIComponent(addrString)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      if (respJson.length === 0) {
        return null;
      }
      return respJson[0].id;
    }
    catch (error) {
      console.error(`Error fetching address UUID from ${this.getName()}:`, error);
      throw error;
    }
  }

  async fetchFractionDates(addressData, addressUUID) {
    const fractionMap = {
      "glass": ["2612"],
      "food": ["3000"],
      "paper": ["2400"],
      "plastic": ["3200"],
      "general": ["9999"],
    };

    try {
      const response = await fetch(`https://trv.no/wp-json/wasteplan/v2/calendar/${addressUUID}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      return this.reducedDisposals(respJson.calendar, fractionMap, 'fraksjonId', 'dato');
    }
    catch (error) {
      console.error(`Error fetching data from ${this.getName()}:`, error);
      throw error;
    }
  }
}
