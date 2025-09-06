'use strict';

const Homey = require('homey');

const RemidtAdapter = require('../../lib/adapters/remidt');
const TRVAdapter = require('../../lib/adapters/trv');
const GLORAdapter = require('../../lib/adapters/glor');
const IRAdapter = require('../../lib/adapters/ir');
const MinRenovasjonAdapter = require('../../lib/adapters/minrenovasjon');
const FosenRenovasjonAdapter = require('../../lib/adapters/fosenrenovasjon');
const HRAAdapter = require('../../lib/adapters/hra');
const OsloKommuneAdapter = require('../../lib/adapters/oslokommune');
const MarenAdapter = require('../../lib/adapters/maren');
const FredrikstadKommuneAdapter = require('../../lib/adapters/fredrikstadkommune');
const VKRAdapter = require('../../lib/adapters/vkr');
const SIMAdapter = require('../../lib/adapters/sim');
const NGIRAdapter = require('../../lib/adapters/ngir');
const BIRAdapter = require('../../lib/adapters/bir');
const HIMAdapter = require('../../lib/adapters/him');
const HRAdapter = require('../../lib/adapters/hr');
const IRISAdapter = require('../../lib/adapters/iris');
const IVARAdapter = require('../../lib/adapters/ivar');
const NOMILAdapter = require('../../lib/adapters/nomil');
const SHMILAdapter = require('../../lib/adapters/shmil');
const UtsiraAdapter = require('../../lib/adapters/utsira');
const AvfallSorAdapter = require('../../lib/adapters/avfallsor');

module.exports = class RenovasjonDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('RenovasjonDriver has been initialized');

    this.adapters = {
      "remidt": new RemidtAdapter(),
      "trv": new TRVAdapter(),
      "glor": new GLORAdapter(),
      "ir": new IRAdapter(),
      "minrenovasjon": new MinRenovasjonAdapter(),
      "fosenrenovasjon": new FosenRenovasjonAdapter(),
      "hra": new HRAAdapter(),
      "oslokommune": new OsloKommuneAdapter(),
      "maren": new MarenAdapter(),
      "fredrikstadkommune": new FredrikstadKommuneAdapter(),
      "vkr": new VKRAdapter(),
      "sim": new SIMAdapter(),
      "ngir": new NGIRAdapter(),
      "bir": new BIRAdapter(),
      "him": new HIMAdapter(),
      "hr": new HRAdapter(),
      "iris": new IRISAdapter(),
      "ivar": new IVARAdapter(),
      "nomil": new NOMILAdapter(),
      "shmil": new SHMILAdapter(),
      "utsira": new UtsiraAdapter(),
      "avfallsor": new AvfallSorAdapter(),
    };

    this.scheduleMidnightUpdate();

    // Flow card registrations
    const cardConditionGarbageIsCollected = this.homey.flow.getConditionCard('garbage-is-collected');
    cardConditionGarbageIsCollected.registerRunListener(async (args, state) => {
      const fractions = await args.device.fractionDates;
      let nearestDate = null;
      for (const [, fractionDate] of Object.entries(fractions)) {
        if (!fractionDate) {
          continue;
        }
        if (!nearestDate || fractionDate < nearestDate) {
          nearestDate = fractionDate;
        }
      }
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffDays = parseInt((nearestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays == args.days;
    });

    const cardConditionGarbageTypeIsCollected = this.homey.flow.getConditionCard('fraction-is-collected');
    cardConditionGarbageTypeIsCollected.registerRunListener(async (args, state) => {
      const fractions = await args.device.fractionDates;
      const fractionDate = fractions[args.fraction];
      if (!fractionDate) {
        return false;
      }
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffDays = parseInt((fractionDate - today) / (1000 * 60 * 60 * 24));
      return diffDays == args.days;
    });
  }

  async onPair(session){
    let addressData = null;
    session.setHandler('save_details', async (data) => {
      addressData = data;
    });

    session.setHandler('list_devices', async () => {
      const provider = await this.getProviderForMunicipality(addressData.kommunenummer);
      if (!provider) {
        return [];
      }

      let addrString = addressData.adressenavn;
      if (addressData.nummer !== '') {
        addrString += ` ${addressData.nummer}`;
      }
      if (addressData.bokstav) {
        addrString += ` ${addressData.bokstav}`;
      }

      const addressUUID = await this.getAdapter(provider).fetchAddressUUID(addressData);
      const baseName = this.manifest.name[this.homey.i18n.getLanguage()] || this.manifest.name.en;

      return [
        {
          name: `${baseName} ${addrString}`,
          data: {
            id: addressUUID,
          },
          settings: {
            streetAddress: addrString,
            municipality: addressData.kommunenavn,
            provider: this.getAdapter(provider).getName()
          },
          store: {
            provider,
            addressData,
            addressUUID,
          },
        },
      ];
    });
  }

  async onUninit() {
    if (this._midnightTimer) {
      clearTimeout(this._midnightTimer);
    }
    this.log('RenovasjonDriver has been uninitialized');
  }

  scheduleMidnightUpdate() {
    const now = new Date();
    // Set to five minutes past midnight
    const millisTillMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 5, 0, 0) - now;
    this._midnightTimer = setTimeout(async () => {
      this.log('Midnight update triggered');
      this.getDevices().forEach(async (device) => {
        await device.update();
      });
      this.scheduleMidnightUpdate();
    }, millisTillMidnight);
  }

  // Return a list of available adapters with id and label for pairing UI
  getAdaptersList() {
    console.log('Fetching adapters list');
    return Object.entries(this.adapters).map(([id, adapter]) => ({
      id,
      label: adapter.getName() || id,
    }));
  }

  getAdapter(provider) {
    return this.adapters[provider];
  }

 async getProviderForMunicipality(municipalityCode) {
    for (const [id, adapter] of Object.entries(this.adapters)) {
      if (await adapter.coversMunicipality(municipalityCode)) {
        return id;
      }
    }
    return null;
  }

};
