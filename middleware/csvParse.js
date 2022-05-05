const axios = require('axios')
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
    const os = require('os');
    const path = require('path');
    const debug = require('debug')('app:csv:service');
    const chalk = await import('chalk');
  

    // Note, the `stream/promises` module is only available
    // starting with Node.js version 16
    const { finished } = require('stream/promises');
    
    // CSV file that is being uploaded
    const csvFile = './csvFiles/2022_05_04_project-roll-up-board.csv';

    const records = await [];
    const stream = fs.createReadStream(csvFile);
    const parser = stream.pipe(parse({ delimiter: ',', columns: true,}));

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      };
    });

    await finished(parser);

    // Create a copy of Records
    let allMyRecords = records;

    allMyRecords.map((aSingleRecord)=>{

      for (const property in aSingleRecord) {

        // String types
        const myKey = property;
        const myValue = aSingleRecord[property];
  
        console.log(`${myKey}: ${myValue}`);
  
      };

    });

    // TODO: Uncomment once a push to Monday.com is ready
    // return records;
    next();
  },
  viewMondayBoardValues: async (req, res, next ) =>{
    
    //Id from Monday Board to be uploaded to 
    const devMondayBoardID = process.env.TIME_TRACKING_MONDAY_BOARD_ID_DUPE;
    // Query to view Monday Board Title and Types, in order to push to
    const query = `query { boards (ids: ${devMondayBoardID}) { owner { id }  columns {   title   type }}}`;

    let queryToViewAllItemsOnBoard = `{
      boards (ids: ${devMondayBoardID}) {
        items {
          id
          name
          column_values {
            id
            title
            value
          }
        }
      }
    }`;

    axios.post("https://api.monday.com/v2",  {
      'query': query,
    },
    {
      headers: {
        'Content-Type': `application/json`,
        'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
      },
    })
    .then((response)=>{

      const MondayBoardColumnValues = response.data.boards[0]
      console.log(MondayBoardColumnValues, '<--- Monday Response')

      // Always return a promise, required by Heroku
      return response;
    })
    .catch((error)=>{
      console.log('Here is my error:' + error, 'error');
    })

    // Express expected a middleware function to be called
    next()
  }

})
