'use strict';

const BaseAdapter = require('./baseadapter');

module.exports = class MARENAdapter extends BaseAdapter {
  static MUNICIPALITIES = new Set([
    '4205' // Lindesnes
  ]);

  getName() {
    return 'MAREN';
  }

  async coversMunicipality(municipalityCode) {
    return MARENAdapter.MUNICIPALITIES.has(String(municipalityCode));
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
      const response = await fetch("https://kalender.maren.no/maren/v1/adresser/", {
        "body": `{"searchString":"${addrString}"}`,
        "method": "POST"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      if (respJson.adresser.length === 0) {
        return null;
      }
      const match = respJson.adresser.find(entry =>
        entry.adresse == addrString
      );
      return match?.id;
    }
    catch (error) {
      console.error(`Error fetching address UUID from ${this.getName()}:`, error);
      throw error;
    }
  }

  async fetchFractionDates(addressData, addressUUID) {
    const fractionMap = {
      "food": ["9998"],
      "paper": ["plast_og_papir"],
      "plastic": ["plast_og_papir"],
      "general": ["9999"],
    };

    try {
      const response = await fetch(`https://kalender.maren.no/maren/v1/tomminger/${addressUUID}?future=true&future_months=1`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      const disposals = this.reducedDisposals(respJson.datoer, fractionMap, 'fraksjonId', 'dato');
      return disposals;
    }
    catch (error) {
      console.error(`Error fetching data from ${this.getName()}:`, error);
      throw error;
    }
  }
}
