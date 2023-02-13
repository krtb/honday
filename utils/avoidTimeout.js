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
  avoidTimeout: async function avoidTimeout(listOfItems, targetUrl) {

    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

    async function loadAPIRequestsWithDelayTimer() {
      for (var i = 0; i < listOfItems.length; i++) {

        console.log(`item ${i + 1} of ${listOfItems.length}...`,  listOfItems[i] )

        axios.post(targetUrl,
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
            console.log(res.data.data, `<---- ${i + 1} Item has been handled.`, res.data)
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
    
  },
  sendWithTimeout: async function avoidTimeout(targetUrl, board_id) {
    capturedData = [];
    let apiPageNumber = 1;
    let loopShouldContinue = true;
    let batchOfItems = [];
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

    async function loadAPIRequestsWithDelayTimer() {
      for (var i = 0; loopShouldContinue === true ; i++) {
        console.log(`Page: ${apiPageNumber}, batchOfItemsTotal: ${batchOfItems.length}`)
        let query = `{
          boards (ids: ${board_id}) {
            items (limit: 50, page: ${apiPageNumber}) {
              id
              name
              column_values {
                id
                title
                value
                text
              }
            }
          }
        }`;
        // Continue through API pagination
        apiPageNumber++
        axios.post(targetUrl,
          {query},
          { 
            headers: {
            'Content-Type': `application/json`,
            'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
            },
          }
        )
        .then(res => {
          let responseHasItems = res.data.data.boards[0].items.length > 0? true : false;
          console.log(`responseHasItems: ${responseHasItems}`)
          let responseHasNoErrors = res.data.errors === undefined ? true : false;
          console.log(`responseHasNoErrors: ${responseHasNoErrors}`)

          if(responseHasNoErrors && responseHasItems){
            checkIfArrayLoaded = res.data.data.boards[0].items
            batchOfItems = res.data.data.boards[0].items
            console.log(`${capturedData.length} have been collected.`)
            batchOfItems.map((aItemObj)=>{
              capturedData.push(aItemObj)
            })
          } else if(responseHasNoErrors && !responseHasItems) {
            console.log(`"loopShouldContinue:${loopShouldContinue}" has been set to false.`)
            console.log(`${capturedData.length} is the final collection count.`)
            loopShouldContinue = false;
          } else {
            console.log(`Error Found Here => ${res.data.errors}`)
          }
        })
        .catch((res)=>{ 
          res
          console.log(res, "<----- Error Caught.")
        })
        await timer(1500);
      }
      console.log(`Returning a total of ${capturedData.length} items.`)
      //TODO: Start from here.
      return capturedData;
    }
    return loadAPIRequestsWithDelayTimer()
  },
});