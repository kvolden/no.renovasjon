'use strict';

const fetch = require('node-fetch');

const BaseAdapter = require('./baseadapter');

module.exports = class FosenRenovasjonAdapter extends BaseAdapter {
  static MUNICIPALITIES = new Set([
    '5054', // Indre Fosen
    '5057', // Ørland
    '5058' // Åfjord
  ]);

  getName() {
    return 'Fosen Renovasjon';
  }

  async coversMunicipality(municipalityCode) {
    return FosenRenovasjonAdapter.MUNICIPALITIES.has(String(municipalityCode));
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
      const response = await fetch(`https://fosen.renovasjonsportal.no/api/address/${encodeURIComponent(addrString)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      if (respJson.length === 0) {
        throw new Error( `No address found: ${addrString}`);
      }
      const match = respJson.searchResults.find(entry => entry.title.toUpperCase() == addrString.toUpperCase() && entry.subTitle.toUpperCase() == addressData.kommunenavn);
      return match.id;
    }
    catch (error) {
      console.error(`Error fetching address UUID from ${this.getName()}:`, error);
      throw error;
    }
  }

  async fetchFractionDates(addressData, addressUUID) {
    const fractionMap = {
      "Matavfall": "food",
      "Papir og plastemballasje": "paper", // Date copied to plast as they are collected together
      "Restavfall til forbrenning": "general",
    };

    try {
      const response = await fetch(`https://fosen.renovasjonsportal.no/api/address/${addressUUID}/details`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      const pickups = this.reducedDisposals(respJson.disposals, fractionMap, 'fraction', 'date');
      pickups.plastic = pickups.paper; // Map plast to papir as they are collected together
      return pickups;
    }
    catch (error) {
      console.error(`Error fetching data from ${this.getName()}:`, error);
      throw error;
    }
  }
}
