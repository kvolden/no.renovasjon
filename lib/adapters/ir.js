'use strict';

const BaseAdapter = require('./baseadapter');

module.exports = class IRAdapter extends BaseAdapter {

  getName() {
    return 'Innherred Renovasjon';
  }

  async coversMunicipality(municipalityCode) {
    try {
      const response = await fetch(`https://innherredrenovasjon.no/wp-json/ir/v1/municipalities`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      return respJson.some(m => m.municipality_number === String(municipalityCode));
    }
    catch (error) {
      console.error('Error fetching municipalities from Innherred Renovasjon:', error);
      throw error;
    }
  }

  createAddrString(addressData) {
    let addrString = addressData.adressenavn;
    if (addressData.nummer !== '') {
      addrString += ` ${addressData.nummer}`;
    }
    if (addressData.bokstav) {
      addrString += ` ${addressData.bokstav}`;
    }
    return addrString;
  }

  async fetchAddressUUID(addressData) {
    let addrString = this.createAddrString(addressData);
    try {
      const response = await fetch(`https://innherredrenovasjon.no/wp-json/ir/v1/addresses/${encodeURIComponent(addrString)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      if (respJson.data.results.length === 0) {
        throw new Error( `No address found: ${addrString}`);
      }
      const match = respJson.data.results.find(entry => entry.address.toUpperCase() == addrString.toUpperCase() && entry.municipality.toUpperCase() == addressData.kommunenavn);
      return match.id;
    }
    catch (error) {
      console.error(`Error fetching address UUID from ${this.getName()}:`, error);
      throw error;
    }
  }

  reducedDisposals(disposals) {
    // NOTE: Reversed fractionMap for convenience
    const fractionMap = {
      "5": "glass",
      "1111": "food",
      "1222": "paper",
      "4": "plastic",
      "9991": "general",
    };
    const nearest = this.createFractions();
    for (const id in disposals) {
      const date = new Date(disposals[id].dates[0]);
      const key = fractionMap[id];
      if (!key) continue;
      nearest[key] = date;
    }
    return nearest;
  }

  async fetchFractionDates(addressData, addressUUID) {
    let addrString = this.createAddrString(addressData);
    try {
      const response = await fetch(`https://innherredrenovasjon.no/wp-json/ir/v1/garbage-disposal-dates-by-address?address=${addrString}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const respJson = await response.json();
      return this.reducedDisposals(respJson);
    }
    catch (error) {
      console.error(`Error fetching data from ${this.getName()}:`, error);
      throw error;
    }
  }
}
