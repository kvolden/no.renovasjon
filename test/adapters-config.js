'use strict';

const adapterConfigs = [
  { name: 'remidt', testAll: true },
  { name: 'trv', testAll: true },
  { name: 'glor', testAll: true },
  { name: 'ir', testAll: true },
  { name: 'minrenovasjon', testAll: false }, // Too many municipalities to test them all
  { name: 'fosenrenovasjon', testAll: true },
  { name: 'hra', testAll: true },
  { name: 'oslokommune', testAll: true },
  { name: 'maren', testAll: true },
  { name: 'fredrikstadkommune', testAll: true },
  { name: 'vkr', testAll: true },
  { name: 'sim', testAll: true },
  { name: 'ngir', testAll: true },
  { name: 'bir', testAll: true },
  { name: 'him', testAll: true },
  { name: 'hr', testAll: true },
  { name: 'iris', testAll: true },
  { name: 'ivar', testAll: true },
  { name: 'nomil', testAll: true },
  { name: 'shmil', testAll: true },
  { name: 'utsira', testAll: true },
  { name: 'avfallsor', testAll: true },
];

const adapters = {};
for (const cfg of adapterConfigs) {
  const AdapterClass = require(`../lib/adapters/${cfg.name}`);
  adapters[cfg.name] = {
    adapter: new AdapterClass(),
    testAllMunicipalities: cfg.testAll,
  };
}

module.exports = { adapters };
