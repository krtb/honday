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
  parseCSV: (req, res, next) =>{
    const assert = require('assert');
    const fs = require('fs');
    const os = require('os')
    const { parse } = require('csv-parse');
    // Note, the `stream/promises` module is only available
    // starting with Node.js version 16
    const { finished } = require('stream/promises');

    next()
  }

})
