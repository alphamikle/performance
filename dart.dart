import 'dart:convert';
import 'dart:io';
import 'dart:math';

typedef TestFunc = double Function(int index, [bool trigger]);

const earthRadius = 6371;
final Map<String, int> labels = Map();
void ps(String label) => labels[label] = DateTime.now().microsecondsSinceEpoch;
int pe(String label) {
  final num diff = DateTime.now().microsecondsSinceEpoch - labels[label];
  labels.remove(label);
  return diff;
}

const FOR_OF = 'for of';
const FOR_I = 'for i';
const FOR_I_OUT = 'for without i in body';
const EMPTY_FOR_I = 'for i with only iterations';
const DE_OPTIMIZED_FOR_I = 'for i with de-optimisations';

// ? Rules of tests
int TEST_SET = 0;
const ITEMS_IN_CYCLE = 3000;
const MAX_CYCLES = 100;

int cycles = 1;
final List<Map<String, double>> coords = [];
final List<Map<String, String>> stringedCoords = [];
Map<String, double> initPoint;
final Map<String, int> times = {
  FOR_OF: 0,
  FOR_I: 0,
  FOR_I_OUT: 0,
  EMPTY_FOR_I: 0,
  DE_OPTIMIZED_FOR_I: 0,
};
final List<Map<String, num>> timesPerIterations = [];

bool randBool() => Random().nextBool();
Map<String, double> getCoords() {
  final lat = Random().nextDouble() * 90;
  final lon = Random().nextDouble() * 180;
  return {
    'lat': randBool() ? lat : -lat,
    'lon': randBool() ? lon : -lon,
  };
}

double getDistance({double lat, double lon, double lat2, double lon2}) => sin(lat) * sin(lat2) + cos(lat) * cos(lat2) * cos(lon - lon2) * earthRadius;
void initData() {
  coords.clear();
  stringedCoords.clear();
  for (int i = 0; i < ITEMS_IN_CYCLE; i++) {
    final Map<String, double> point = getCoords();
    coords.add(point);
    stringedCoords.add({
      'lat': point['lat'].toString(),
      'lon': point['lon'].toString(),
    });
  }
  initPoint = getCoords();
}

double getDistanceWithInit(index, [useStrings = false]) {
  final condition = index % 100 == 0 && useStrings;
  final Map<String, Object> point = condition ? stringedCoords[index] : coords[index];
  return getDistance(
    lat: initPoint['lat'],
    lon: initPoint['lon'],
    lat2: condition ? double.parse(point['lat']) : point['lat'] as double,
    lon2: condition ? double.parse(point['lon']) : point['lon'] as double,
  );
}

double sumOf(index, [useStrings = false]) {
  final condition = index % 100 == 0 && useStrings;
  final point = condition ? stringedCoords[index] : coords[index];
  if (point['lat'] is String) {
    return double.parse(point['lat']) + initPoint['lat'];
  }
  if (point['lat'] is num) {
    return (point['lat'] as double) + initPoint['lat'];
  }
  return 0.0; // ! Will not executed
}

double sumOrFuncSum(index, [trigger = false]) {
  if (trigger) {
    double f() {
      return sumOf(index);
    }

    return f();
  }
  return sumOf(index);
}

final List<TestFunc> testSets = [
  getDistanceWithInit,
  sumOf,
  sumOrFuncSum,
];
void saveResults() {
  final Map<String, num> timesPerIteration = {
    'cycles': cycles,
  };
  for (String key in times.keys) {
    timesPerIteration[key] = times[key] / cycles;
    times[key] = 0;
  }
  timesPerIterations.add(timesPerIteration);
}

Future<void> printResult() async {
  final testSetFuncName = RegExp(r"\'[a-zA-Z0-9]+\'").firstMatch(testSets[TEST_SET].toString()).group(0).replaceAll('\'', '');
  final bool isVm = Platform.script.toString().contains('.dart');
  final file = File('outputs/dart${isVm ? '.vm' : '.compiled'}.items_${ITEMS_IN_CYCLE}_test_set_${testSetFuncName}.json');
  file.writeAsStringSync(jsonEncode(timesPerIterations));
  timesPerIterations.clear();
}

void runIterations() {
  for (int i = 0; i < cycles; i++) {
    initData();

    ps(EMPTY_FOR_I);
    for (int i = 0; i < coords.length; i++) {}
    times[EMPTY_FOR_I] += pe(EMPTY_FOR_I);

    ps(FOR_I);
    for (int i = 0; i < coords.length; i++) {
      testSets[TEST_SET](i);
    }
    times[FOR_I] += pe(FOR_I);

    ps(DE_OPTIMIZED_FOR_I);
    for (int i = 0; i < coords.length; i++) {
      testSets[TEST_SET](i, true);
    }
    times[DE_OPTIMIZED_FOR_I] += pe(DE_OPTIMIZED_FOR_I);

    ps(FOR_I_OUT);
    final l = coords.length;
    for (int i = 0; i < l; i++) {
      testSets[TEST_SET](i);
    }
    times[FOR_I_OUT] += pe(FOR_I_OUT);

    ps(FOR_OF);
    int i = 0;
    for (final point in coords) {
      testSets[TEST_SET](i);
      i++;
    }
    times[FOR_OF] += pe(FOR_OF);
  }
}

Future<void> multiBenchmark([int i]) async {
  if (i == null) {
    i = cycles;
  }
  cycles = i;
  runIterations();
  saveResults();
}

Future<void> main(List<String> args) async {
  if (args.isNotEmpty) {
    TEST_SET = int.parse(args[0]);
  }
  for (int i = 1; i < MAX_CYCLES; i += 5) {
    await multiBenchmark(i);
  }
  await printResult();
}
