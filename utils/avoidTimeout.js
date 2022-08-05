const axios = require('axios');
const axiosURL = "https://api.monday.com/v2";

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
      * @param {object} listOfItems - defaults to global queryTemplate variable, which Axius consumes.
      * @param {object} defaultHeaders - defaults to global headersTemplate variable, which Axios consumes
      */
    avoidTimeout: async function avoidTimeout(listOfItems) {

      const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

      async function loadAPIRequestsWithDelayTimer() {
        for (var i = 0; i < listOfItems.length; i++) {

          console.log(`item ${i + 1} of ${listOfItems.length}...`,  listOfItems[i] )

          axios.post(axiosURL,
            {query: listOfItems[i] },
            { 
              headers: {
              'Content-Type': `application/json`,
              'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
              },
            }
          )
          .then(res =>{ 

            if(!res.data.errors){
              console.log(res.data.data, `<---- Item ${i + 1} Deleted...`, res.data)
              console.log(listOfItems[i], '<--- Current default query being sent')
            } else {
              console.log(res.data.errors, res.data.errors[0].locations, '<--- Errors returned from Monday.com... ',)
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