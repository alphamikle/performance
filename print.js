const fs = require('fs');
const path = require('path');
const jsonExport = require('jsonexport');

const outputs = path.resolve(__dirname, 'outputs');
const files = fs.readdirSync(outputs);
async function main() {
  for await (const file of files) {
    const fileData = fs.readFileSync(path.resolve(outputs, file)).toString();
    const json = JSON.parse(fileData);
    const csv = await jsonExport(json, { rowDelimiter: ';' });
    const csvFileName = file.replace('.json', '.csv');
    fs.writeFileSync(path.resolve('csv', csvFileName), csv);
  }
  console.log('End of tests');
}
main().then(() => process.exit(0));