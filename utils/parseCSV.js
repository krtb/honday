let fs = require('fs');
let { parse } = require('csv-parse');
/** `stream/promises` Node version must be 16^ */
let { finished } = require('stream/promises'); 

/**
 * Quirks with using module.exports, when modules circularly depend on each other.
 * It is recommended against replacing the object.
 * For multiple exports at once, using object literal definition, implement the below
 * The exports object is created for your module before your module runs, 
 * and if there are circular dependencies, other modules may have access to that default object before your module can fill it in. 
 * If you replace it, they may have the old, original object, and not (eventually) see your exports. 
 * If you add to it, then even though the object didn't have your exports initially, 
 * eventually it will have it, even if the other module got access to the object before those exports existed.
 * https://nodejs.org/api/modules.html#modules_cycles
 * @method Object.assign - method copies all enumerable own properties from one or more source objects to a target object;
 * it assigns properties, versus copying or defining new properties. 
 * @param {object} module.exports - Target Object property, the Node Module object.
 * What to apply the sources' properties to, which is returned after it is modified.
 * @param {objects} {} - Source objects containing properties that should be applied to our Target object.
 */
Object.assign(module.exports, 
  { 
    /**
      * Delay requests made to an API Endpoint in order avoid throttling by server.
      * @param {string} csvFileLocation - File location of your CSV file.
      * @returns {(array|objects)} records - Returns array of objects, with properties and values from CSV file.
      */
    parseCsvFileToData: async function parseCsvFileToData(csvFileLocation) {
      
      let myFilePathCopy = typeof csvFileLocation === 'string'? csvFileLocation : 'Missing Your CSV File.'

      const csvFilePath = myFilePathCopy
      const stream = fs.createReadStream(csvFilePath);
      const parser = stream.pipe(parse({ delimiter: ',', columns: true,}));

      let records = [];

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record);
        };
      });

      await finished(parser);
      return records

    }
  }
);