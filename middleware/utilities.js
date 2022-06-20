const axios = require('axios')

Object.assign(module.exports, {
  paginateAPIRequestsWithDelay: async (req, res, next) => {
    // Returns a Promise that resolves after Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work

      for (var i = 0; i <= mondayContainer.length - 1; mondayContainer[i++]) {
        console.log(`Sending Harvest TimeEntries, on number: ${i} of ${mondayContainer.length}` );

        axios.post(mondayURL, {
          'query': query,
          'variables': mondayObjects
        }, {
            headers: {
              'Content-Type': `application/json`,
              'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
            },
        })
        .then((response)=>{
          console.log(response.data.errors, '<--- Requests ok');
          return response
        })
        .catch((error)=> 'There was an error here: ' + error)

        // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
        await timer(1000); // Then the created Promise can be awaited
        // Finally the timeout completes & execution continues at this point. 
      }

      console.log('=============== Creating Items Complete! ================');
      next()
    }
    loadAPIRequestsWithDelayTimer()


    // End of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<

    next()
  }
})