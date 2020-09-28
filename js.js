const { performance } = require('perf_hooks');
const { resolve } = require('path');
const fs = require('fs');

const earthRadius = 6371;

const labels = new Map();
const ps = (label) => labels.set(label, performance.now());
const pe = (label) => {
  const diff = performance.now() - labels.get(label);
  labels.delete(label);
  return diff * 1000; // ? To been microseconds
};

const FOR_OF = 'for of';
const FOR_I = 'for i';
const FOR_I_OUT = 'for without i in body';
const EMPTY_FOR_I = 'for i with only iterations';
const DE_OPTIMIZED_FOR_I = 'for i with de-optimisations';

// ? Rules of tests
let TEST_SET = 0;
const ITEMS_IN_CYCLE = 3000;
const MAX_CYCLES = 100;

let cycles = 1;
const coords = [];
const stringedCoords = [];
let initPoint;
const times = {
  [FOR_OF]: 0,
  [FOR_I]: 0,
  [FOR_I_OUT]: 0,
  // [EMPTY_FOR_I]: 0,
  [DE_OPTIMIZED_FOR_I]: 0,
};
const timesPerIterations = [];

const randBool = () => Math.random() > 0.5;
const getCoords = () => {
  const lat = Math.random() * 90;
  const lon = Math.random() * 180;
  return {
    lat: randBool() ? lat : -lat,
    lon: randBool() ? lon : -lon,
  };
}
const getDistance = ({ lat, lon }, { lat2, lon2 }) => Math.sin(lat) * Math.sin(lat2) + Math.cos(lat) * Math.cos(lat2) * Math.cos(lon - lon2) * earthRadius;
const initData = () => {
  coords.length = 0;
  stringedCoords.length = 0;
  for (let i = 0; i < ITEMS_IN_CYCLE; i++) {
    const point = getCoords();
    coords.push(point);
    stringedCoords.push({
      lat: point.lat.toString(),
      lon: point.lon.toString(),
    });
  }
  initPoint = getCoords();
};

// ? Test functions
const getDistanceWithInit = (index, useStrings = false) => {
  const point = index % 100 === 0 && useStrings ? stringedCoords[index] : coords[index];
  return getDistance(point, { lat2: initPoint.lat, lon2: initPoint.lon });
};
const sumOf = (index, useStrings = false) => {
  const point = index % 100 === 0 && useStrings ? stringedCoords[index] : coords[index];
  if (typeof point.lat == "string") {
    return point.lat + initPoint.lat;
  }
  if (typeof point.lat == "number") {
    return point.lat + initPoint.lat;
  }
};
const sumOrFuncSum = (index, trigger = false) => {
  if (trigger) {
    const f = () => {
      return sumOf(index);
    };
    return f();
  }
  return sumOf(index);
};

const testSets = [
  getDistanceWithInit,
  sumOf,
  sumOrFuncSum,
];

const saveResults = () => {
  const timesPerIteration = {
    cycles: cycles,
  };
  let average = 0;
  for (const key in times) {
    timesPerIteration[key] = times[key] / cycles;
    average += timesPerIteration[key];
    times[key] = 0;
  }
  average = average / Object.keys(times).length;
  timesPerIteration['average'] = average;
  timesPerIterations.push(timesPerIteration);
};

const printResult = () => {
  const outputs = resolve(__dirname, 'outputs', `js.items_${ITEMS_IN_CYCLE}_test_set_${testSets[TEST_SET].name}.json`);
  fs.writeFileSync(outputs, JSON.stringify(timesPerIterations));
  timesPerIterations.length = 0;
};

const runIterations = () => {
  for (let i = 0; i < cycles; i++) {
    initData();

    // ps(EMPTY_FOR_I);
    // for (let i = 0; i < coords.length; i++) {
    // }
    // times[EMPTY_FOR_I] += pe(EMPTY_FOR_I);

    ps(FOR_I);
    for (let i = 0; i < coords.length; i++) {
      testSets[TEST_SET](i);
    }
    times[FOR_I] += pe(FOR_I);

    ps(DE_OPTIMIZED_FOR_I);
    for (let i = 0; i < coords.length; i++) {
      testSets[TEST_SET](i, true);
    }
    times[DE_OPTIMIZED_FOR_I] += pe(DE_OPTIMIZED_FOR_I);

    ps(FOR_I_OUT);
    const l = coords.length;
    for (let i = 0; i < l; i++) {
      testSets[TEST_SET](i);
    }
    times[FOR_I_OUT] += pe(FOR_I_OUT);

    ps(FOR_OF);
    let i = 0;
    for (const point of coords) {
      testSets[TEST_SET](i);
      i++;
    }
    times[FOR_OF] += pe(FOR_OF);
  }
};

const multiBenchmark = async (i = cycles) => {
  cycles = i;
  runIterations();
  saveResults();
};

((async () => {
  const args = process.argv;
  if (args.length > 2) {
    TEST_SET = Number(args[2]);
  }
  for (let i = 1; i < MAX_CYCLES; i+=5) {
    await multiBenchmark(i);
  }
  printResult();
})());