'use strict';

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const BaseAdapter = require('./baseadapter');

module.exports = class MinRenovasjonAdapter extends BaseAdapter {
  getName() {
    return 'Min Renovasjon';
  }

  async coversMunicipality(municipalityCode) {
    const response = await fetch(`https://www.webatlas.no/wacloud/servicerepository/CatalogueService.svc/json/GetRegisteredAppCustomers?Appid=MobilOS-NorkartRenovasjon`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const respJson = await response.json();
    return respJson.some(m => m.Number === String(municipalityCode));
  }

  async fetchAddressUUID(addressData) {
    // MinRenovasjon does not use address UUIDs. Generate a random one.
    return uuidv4();
  }

  reducedDisposals(disposals) {
    const fractionMap = {
      "1": "general",
      "2": "paper",
      "3": "food",
      "4": "glass",
      "7": "plastic",
      "15": "hazardous",
    };
    const nearest = this.createFractions();
    for (const d of disposals) {
      const date = new Date(d.Tommedatoer[0]);
      const key = fractionMap[d.FraksjonId];
      if (!key) continue;
      nearest[key] = date;
    }
    return nearest;
  }

  async fetchFractionDates(addressData, addressUUID) {
    const proxyUrl = 'https://norkartrenovasjon.azurewebsites.net/proxyserver.ashx?server=';
    const baseUrl = 'https://komteksky.norkart.no/MinRenovasjon.Api/api/tommekalender?';
    const params = `kommunenr=${encodeURIComponent(addressData.kommunenummer)}&` +
                   `gatenavn=${encodeURIComponent(addressData.adressenavn)}&` +
                   `gatekode=${encodeURIComponent(addressData.adressekode)}&` +
                   `husnr=${encodeURIComponent(addressData.nummer)}`;
    const fullUrl = proxyUrl + baseUrl + params;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'RenovasjonAppKey': 'AE13DEEC-804F-4615-A74E-B4FAC11F0A30',
          'Kommunenr': addressData.kommunenummer,
        }
      });
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
