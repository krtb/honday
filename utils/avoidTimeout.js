const axios = require('axios');

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
      * Avoid server throttling requests due to exceeding timeout limit from API.
      * @param {array} arrayOfItemsToSend - File location of your CSV file.
      * @param {object} defaultQuery - defaults to global queryTemplate variable, which Axius consumes.
      * @param {object} defaultHeaders - defaults to global headersTemplate variable, which Axios consumes
      */
    avoidTimeout: async function avoidTimeout(myArrayOfItems, axiosURL, deletionSwitch = false, defaultQuery) {
      const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

      let onlyArray = myArrayOfItems[0]

      async function loadAPIRequestsWithDelayTimer() {
        for (var i = 0; i < onlyArray.length; i++) {
          console.log(`On item ${i + 1} of ${onlyArray.length}...` );

          /** If deleting items, use deletion object. */
          if (deletionSwitch === true) {
            defaultQuery = `mutation { delete_item (item_id: ${onlyArray[i]}) { id }}`;
          } else {
            console.log('Delete Switch OFF...')
          }

          axios.post(axiosURL, 
            {query: defaultQuery}
            , 
            {headers: {
              'Content-Type': `application/json`,
              'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
            },
          })
          .then(res =>{ 
            console.log(res.data.data, `<---- Item ${i + 1} Deleted...`)
            if(res.data.errors){
              console.log(res.data.errors, '<--- Errors returned from Monday.com... ')
            }
          })
          .catch((error)=>{ 
            console.log('There was an error here: ' + error)
          })
          await timer(1000);

        }
        console.log('=============== Deletion Complete! ================');
      }
      loadAPIRequestsWithDelayTimer()
      
    }
  }
);