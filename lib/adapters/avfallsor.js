'use strict';

const BaseAdapter = require('./baseadapter');

module.exports = class AvfallSorAdapter extends BaseAdapter {
  static MUNICIPALITIES = new Set([
    '4204', // Kristiansand
    '4223' // Vennesla
  ]);

  async _getAllMunicipalities() {
    return AvfallSorAdapter.MUNICIPALITIES;
  }

  getName() {
    return 'Avfall Sør';
  }

  async coversMunicipality(municipalityCode) {
    return AvfallSorAdapter.MUNICIPALITIES.has(String(municipalityCode));
  }

  async fetchAddressUUID(addressData) {
    let addrString = addressData.adressenavn;
    if (addressData.nummer !== '') {
      addrString += ` ${addressData.nummer}`;
    }
    if (addressData.bokstav) {
      addrString += ` ${addressData.bokstav}`;
    }
    const response = await fetch(`https://avfallsor.no/wp-json/addresses/v1/address?lookup_term=${encodeURIComponent(addrString)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const respJson = await response.json();
    // Empty response is an array, non-empty an object. Mormalize to array for easier processing.
    const respArray = Array.isArray(respJson) ? respJson : Object.values(respJson);
    if (respArray.length === 0) {
      return null;
    }
    const match = respArray.find(entry =>
      entry.value.toUpperCase() == addrString.toUpperCase() &&
      entry.label.split(', ').pop().toUpperCase() == `${addressData.kommunenavn}`);
    return match?.href.split('/').pop();
  }

  async fetchFractionDates(addressData, addressUUID) {
    const fractionMap = {
      "glass": ["1322"],
      "food": ["1111"],
      "paper": ["2499"],
      "plastic": ["2499"],
      "general": ["9011"],
    };

    const response = await fetch(`https://avfallsor.no/wp-json/pickup-calendar/v1/collections?property_id=${addressUUID}/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const pickups = this.createFractions();
    const respJson = await response.json();
    const pickupArr = respJson?.collections?.large || [];
    for (const element of pickupArr) {
      for (const item of element.items) {
        const date = new Date(item.dato);
        for (const [our_frac, api_fracs] of Object.entries(fractionMap)) {
          if (api_fracs.includes(item.fraksjonId)) {
            if (!pickups[our_frac] || date < pickups[our_frac]) {
              pickups[our_frac] = date;
            }
          }
        }
      }
    }
    return pickups;
  }
}
