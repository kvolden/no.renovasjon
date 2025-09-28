'use strict';

const NorconsultBase = require('./norconsultbase');

module.exports = class SteinkjerKommuneAdapter extends NorconsultBase {
   static MUNICIPALITIES = new Set([
    '5006' // Steinkjer
  ]);

  constructor() {
    const domain = 'https://service-steinkjer.isy.no:9005';
    const applikasjonsId = '6d54309c-f17b-4610-82de-a7767a61110b';
    const oppdragsgiverId = '100';
    const fractionMap = {
      "general": ["9999"],
      "paper": ["2400"],
      "plastic": ["3200"],
      "food": ["2110"]
    };
    super(domain, applikasjonsId, oppdragsgiverId, fractionMap);
  }

  async _getAllMunicipalities() {
    return SteinkjerKommuneAdapter.MUNICIPALITIES;
  }

  getName() {
    return 'Steinkjer Kommune';
  }

  async coversMunicipality(municipalityCode) {
    return SteinkjerKommuneAdapter.MUNICIPALITIES.has(String(municipalityCode));
  }
}
