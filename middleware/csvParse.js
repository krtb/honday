// Quirks with using module.exports, when modules circularly depend on each other.
// It is recommended against replacing the object.
// For multiple exports at once, using object literal definition, implement the below
// The exports object is created for your module before your module runs, 
// and if there are circular dependencies, other modules may have access to that default object before your module can fill it in. 
// If you replace it, they may have the old, original object, and not (eventually) see your exports. 
// If you add to it, then even though the object didn't have your exports initially, eventually it will have it, even if the other module got access to the object before those exports existed.
// https://nodejs.org/api/modules.html#modules_cycles

Object.assign(module.exports, {
  // Express expects a Middleware function in order to run without failing.
  parseCSV: async (req, res, next) =>{

    const fs = require('fs');
    const { parse } = require('csv-parse');

    // Below not used, may remove
    const assert = require('assert');
    const os = require('os')
    const path = require('path');
    const debug = require('debug')('app:csv:service');
    const chalk = await import('chalk');
  

    // Note, the `stream/promises` module is only available
    // starting with Node.js version 16
    const { finished } = require('stream/promises');
    
    // CSV file that is being uploaded
    const csvFile = './csvFiles/2022_05_04_project-roll-up-board.csv'

    const records = await [];
    const stream = fs.createReadStream(csvFile);
    const parser = stream.pipe(parse({ delimiter: ',', columns: true,}));

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    await finished(parser);

    // Create a copy of Records
    let allMyRecords = records

    allMyRecords.map((aSingleRecord)=>{

      for (const property in aSingleRecord) {

        // String types
        const myKey = property
        const myValue = aSingleRecord[property]
  
        console.log(`${myKey}: ${myValue}`);
  
      }

    })

    // TODO: Uncomment once a push to Monday.com is ready
    // return records;
    next()
  }

})
