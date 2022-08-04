let fs = require('fs');
let fileOutputPath = './outputFiles/outputData.json'
let fileInputPath = './outputFiles/outputData.json'
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
     * WRITE JSON to file.
     * @param (inputData) inputData - JSON object data that will be used to create JSON file.
     * @param (fileOutputPath)
     */
    writeJsonToFile: async function writeJsonToFile(inputData, fileOutputPath) {      
      /** convert JSON object to string & pretty-print */
      const data = JSON.stringify(inputData, null, 4);
      
      /** write JSON string to a file */
      fs.writeFile(fileOutputPath, data, (err) => {
          if (err) {
              throw err;
          }
          console.log("JSON data is saved.");
      });
    },
    /**
     * READ from JSON file.
     * @param (fileInputPath) - Location of file to be READ and output to console.
     */
    readFromJsonFile: async function readFromJsonFile(fileInputPath){

      /** read JSON object from file */
      fs.readFile('./outputFiles/outputData.json', 'utf-8', (err, data) => {
        if (err) {
            throw err;
        }

        /** parse JSON object */
        const parsedJSONData = JSON.parse(data.toString());

        /** print JSON object */
        console.log(parsedJSONData);
      });
    }
  }
);