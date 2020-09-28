const fs = require('fs');
const path = require('path');
const jsonExport = require('jsonexport');

const outputs = path.resolve(__dirname, 'outputs');
const files = fs.readdirSync(outputs);
async function main() {
  let comparing = [];
  for await (const file of files) {
    const fileData = fs.readFileSync(path.resolve(outputs, file)).toString();
    const json = JSON.parse(fileData);
    for (let i = 0; i < json.length; i++) {
      const operation = json[i];
      if (!comparing[i]) {
        comparing[i] = {};
      }
      comparing[i]['cycles'] = operation['cycles'];
      comparing[i][file] = operation['average'];
    }
    await saveCSVFile(json, file);
    await saveCSVFile(comparing, 'average.json');
    fs.writeFileSync(path.resolve(outputs, 'average.json'), JSON.stringify(comparing));
  }
  console.log('End of tests');
}
async function saveCSVFile(json, name) {
  const csv = await jsonExport(json, { rowDelimiter: ';' });
  const csvFileName = name.replace('.json', '.csv');
  fs.writeFileSync(path.resolve('csv', csvFileName), csv);
}
main().then(() => process.exit(0));