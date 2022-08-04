let fs = require('fs');

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
     * Write input JSON formatted input data to local file.
     * @param {objects} inputData - JSON input data to be output to file.
     */
    writeJsonToFile: async function writeJsonToFile(inputData) {      
      /** convert JSON object to string & pretty-print */
      const data = JSON.stringify(inputData, null, 4);
      
      /** write JSON string to a file */
      fs.writeFile('outputData.json', data, (err) => {
          if (err) {
              throw err;
          }
          console.log("JSON data is saved.");
      });
    }
  }
);