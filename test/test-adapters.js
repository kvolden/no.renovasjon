'use strict';

const fs = require("fs");
const path = require("path");

// --- Configuration ---
const args = process.argv.slice(2); // alle CLI-argumenter
const updateMode = args.includes("--update-addresses");

let adapterFilter = null;
// ex: "--adapters remidt,trv"
const idx = args.indexOf("--adapters");
if (idx !== -1 && idx + 1 < args.length) {
  adapterFilter = args[idx + 1].split(","); 
}

const addressesFile = path.join(__dirname, "valid-addresses.json");

// --- Create adapter list ---
const { adapters } = require('./adapters-config');

// --- Address storage ---
function loadValidAddresses() {
  if (!fs.existsSync(addressesFile)) return {};
  return JSON.parse(fs.readFileSync(addressesFile, "utf-8"));
}

function saveValidAddresses(data) {
  fs.writeFileSync(addressesFile, JSON.stringify(data, null, 2));
}

const addressStore = {
  data: loadValidAddresses(),
  get(muni) {
    return this.data[muni];
  },
  set(muni, addr) {
    this.data[muni] = addr;
    saveValidAddresses(this.data);
  },
  has(muni) {
    return Boolean(this.data[muni]);
  }
};

// --- Address generation ---
async function getRandomAddress(municipalityNumber, maxRetries = 5) {
  const url = `https://ws.geonorge.no/adresser/v1/sok?kommunenummer=${municipalityNumber}&treffPerSide=1`
  const initialResp = await fetch(url);
  const initialRespJson = await initialResp.json();
  const addrCount = initialRespJson.metadata.totaltAntallTreff;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const randomPage = Math.floor(Math.random() * addrCount);
    const addrResp = await fetch(`${url}&side=${randomPage}`);
    if (!addrResp.ok) continue;
    const addrRespJson = await addrResp.json();
    const addrElement = addrRespJson.adresser[0];
    if (addrElement && addrElement.adressenavn) {
      return {
        adressenavn: addrElement.adressenavn,
        nummer: addrElement.nummer,
        bokstav: addrElement.bokstav,
        adressekode: addrElement.adressekode,
        kommunenavn: addrElement.kommunenavn,
        kommunenummer: addrElement.kommunenummer
      };
    }
  }
  return null;
}

// --- Update and test logic ---
async function updateMunicipality(adapter, muni, maxRetries = 8) {
  console.log(`Updating address for ${adapter.adapter.getName()} kommune ${muni}...`);
  for (let attempt = 0; attempt < maxRetries; attempt ++) {
    const addr = await getRandomAddress(muni);
    if (!addr) {
      console.log(`  Failed to get random address for ${muni}`);
      return false;
    }
    const uuid = await adapter.adapter.fetchAddressUUID(addr).catch(() => null);
    if (!uuid) return false;
    const fetchedDates = await adapter.adapter.fetchFractionDates(addr, uuid).catch(() => null);
    const hasDate = fetchedDates && Object.values(fetchedDates).some(f => f && f instanceof Date);
    if (!hasDate) continue;
    // OK – store
    addressStore.set(muni, addr);
    console.log(`  Saved valid address for ${muni}: ${addr.adressenavn} ${addr.nummer}${addr.bokstav || ''}`);
    return true;
  }
  return false;
}

async function testMunicipality(adapter, muni) {
  const addr = addressStore.get(muni);
  if (!addr) {
    console.log(`  Missing address for ${muni}, test fails.`);
    return false;
  }
  const uuid = await adapter.adapter.fetchAddressUUID(addr).catch(() => null);
  if (!uuid) return false;
  const fetchedDates = await adapter.adapter.fetchFractionDates(addr, uuid).catch(() => null);
  const hasDate = fetchedDates && Object.values(fetchedDates).some(f => f && f instanceof Date);
  return hasDate;
}

// Test the interfacing from the driver
async function testInterfacing(adapter, supportedMunicipalities) {
  const randomSupportedMuni = supportedMunicipalities[Math.floor(Math.random() * supportedMunicipalities.length)];
  const nonSupportedMuni = '5000'; // Not supported because it doesn't exist

  const supportsSupported = adapter.adapter.coversMunicipality(randomSupportedMuni);
  const supportsNonSupported = adapter.adapter.coversMunicipality(nonSupportedMuni);

  return supportsSupported && !supportsNonSupported;
}

async function runTest(adapter) {
  const supportedMunicipalities = await adapter.adapter._getAllMunicipalities();

  if (updateMode) {
    if (adapter.testAllMunicipalities) {
      for (const muni of supportedMunicipalities) {
        // Skip if municipality already has an address in file. If a previously working
        // address stops working, manually remove it from the file.
        if (!addressStore.has(muni)) {
          await updateMunicipality(adapter, muni);
        }
      }
    }
    else {
      // When testAll.. is false, find one of the supported municipalities that is
      // missing from the file (if any).
      const candidates = supportedMunicipalities.filter(m => !addressStore.has(m));
      if (candidates.length > 0) {
        const randomMuni = candidates[Math.floor(Math.random() * candidates.length)];
        await updateMunicipality(adapter, randomMuni);
      }
      else {
        console.log(`All municipalities already covered for ${adapter.adapter.getName()}`);
      }
    }
    return true;
  }
  else {
    const interfaceOk = testInterfacing(adapter, supportedMunicipalities)
    if (!interfaceOk) {
      console.log(`${adapter.adapter.getName()}: Interface check FAILED`);
      return false;
    }
    if (adapter.testAllMunicipalities) {
      let success = true;
      for (const muni of supportedMunicipalities) {
        const ok = await testMunicipality(adapter, muni);
        console.log(`${adapter.adapter.getName()} ${muni}: ${ok ? 'PASSED' : 'FAILED'}`);
        success = success && ok;
      }
      return success;
    }
    else {
      const candidates = [...supportedMunicipalities].filter(m => addressStore.has(m));
      if (candidates.length === 0) {
        console.log(`${adapter.adapter.getName()}: No municipalities in address store!`);
        return false;
      }
      const randomMuni = candidates[Math.floor(Math.random() * candidates.length)];
      const ok = await testMunicipality(adapter, randomMuni);
      console.log(`${adapter.adapter.getName()} ${randomMuni}: ${ok ? 'PASSED' : 'FAILED'}`);
      return ok;
    }
  }
}


async function runAllTests() {
  let passed = 0;
  let failed = 0;
  for (const [name, adapter] of Object.entries(adapters)) {
    if (adapterFilter && !adapterFilter.includes(name)) continue;
    const result = await runTest(adapter);
    if (result) passed++;
    else failed++;
  }
  console.log(`Total adapters tested: ${passed + failed}`);
  console.log(`Passed: ${passed}, Failed: ${failed}`);
}

// Run all test if executed directly
if (require.main == module) {
    runAllTests();
}

module.exports = { runAllTests };