/* HTTP CLIENT */ 
const axios = require('axios');

/* Monday Roll-Up Board Credentials */
let DEV_MONDAY_BOARD_HOURS = Number(process.env.DEV_MONDAY_BOARD_HOURS);

/* MONDAY.COM v2 API ENDPOINT */ 
const mondayURL = process.env.MONDAY_APIV2_URL;

module.exports ={
  getProjectPsCodesMonday: async (req, res, next) => {
    // This function makes a GET request to Monday board.
    // Then filters column values, to access "PS-Codes" of all projects

    // Variable to check if a column contains an empty string value
    let getMondayProjectPsCodes = '';

    // GET GraphQl Query for Monday.com's API
    let query = `query {boards (ids: ${DEV_MONDAY_BOARD_HOURS}) {
        items () {
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
    }`

    axios.post(`https://api.monday.com/v2`, {
    'query': query,
    }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization' : `${process.env.MONDAY_APIV2_TOKEN_KURT}`
    },
    })
    .then((response) => {
      // Get columns with Ps-Codes from projects
      getMondayProjectPsCodes = response.data.data.boards[0].items
      // Loop through columns, filter out PS-Code values only
      let mondayPsCodes = getMondayProjectPsCodes.map((singleObjects)=>{
        // TODO: May have to change column value, as I moved the "Project column"
        return singleObjects.column_values[0].text // PS-004621
      })

      console.log(`Grabbing ${mondayPsCodes.length} Projects from Roll-Up Board`);
      // Store Locally
      res.locals.getMondayProjectPsCodes = mondayPsCodes
      next()
    })
    .catch((error)=>{
      console.log('There was an error here: ' + error);
    })

  },
  getProjectNamesMonday: async (req, res, next) => {
    // This function makes a GET request to a Monday board.
    // Then filters column values, to find project names

    // GET GraphQl Query for Monday.com's API
    let query = `query {boards (ids: ${DEV_MONDAY_BOARD_HOURS}) {
      items () {
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
    }`

    axios.post(`https://api.monday.com/v2`, {
    'query': query,
    }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization' : `${process.env.MONDAY_APIV2_TOKEN_KURT}`
    },
    })
    .then((response) => {
      // Filter columns with Project Names as a property
      let getMondayBoardProjects = response.data.data.boards[0].items
      // Loop through and filter on Project Name values
      let mondayBoardProjectNames = getMondayBoardProjects.map((singleObjects)=>{
        // TODO: May have to change column value, as I moved the "Project column"
        return singleObjects.name
      })

      console.log(`Grabbing ${ mondayBoardProjectNames.length} Projects from Roll-Up Board`);
      // Data schema below
      //   },
      //   {
      //     id: 'harvest_id_number',
      //     name: 'ConsejoSano',
      //     column_values: [objects]
      //   }
      // ]

      // Store Locally
      res.locals.getMondayProjectPsNames = mondayBoardProjectNames
      next()
    })
    .catch((error)=>{
      console.log('There was an error here: ' + error);
    })
  },
  getExistingMondayBoardValues: async(req, res, next)=>{
    //This function cycles through Project Objects from Mondday.com
    // Then it stores the entire object as ID and Name will be needed in other functions
    // Note ID here is from Monday.com items, used in GrapqQl request

    let query = `query {boards (ids: ${DEV_MONDAY_BOARD_HOURS}) {
      items () {
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
    }`

    axios.post(`https://api.monday.com/v2`, {
    'query': query,
    }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization' : `${process.env.MONDAY_APIV2_TOKEN_KURT}`
    },
    })
    .then((response) => {
      let getMondayBoardProjects = response.data.data.boards[0].items
      // Loop through and store entire Monday project
      let mondayProjectObjects = getMondayBoardProjects.map((singleObjects)=>{
        // TODO: May have to change column value, as I moved the "Project column"
        return singleObjects
      })
      console.log(`Store Project Objects from Monday. ${mondayProjectObjects.length} Monday.com Objects from Roll-Up Board`);
      res.locals.mondayProjectObjects = mondayProjectObjects
      next()
    })
    .catch((error)=>{
      console.log('There was an error here: ' + error);
    })

  },
  updateMondayHours: async (req, res, next) => {
    // This function accesses locally stored object collections.
    // Then it builds a custom Object
    // Finally the custom object is looped over and updates to Hours column in Monday.com board are made.

    let mondayProjectObjects = res.locals.mondayProjectObjects
    let uniqueProjectBudgets = res.locals.uniqueProjectBudgets
    let holdUniqueProjects = [];

    for (let index = 0; index < uniqueProjectBudgets.length - 1; index++) {

      // TODO: Add inline comment for these values
      mondayProjectObjects.map((singleMondayProject)=> {
        // custom object, to be looped over when sending PATCH requests to Monday.com
        let myCustomObject = {
          id: 'string',
          name: 'string',
          hours: 'string',
        }

        // Match based on Names in Monday, when compared to ProjectBudget Object Names of clients.
        if(singleMondayProject.name === uniqueProjectBudgets[index].client_name){
          myCustomObject.id = singleMondayProject.id
          myCustomObject.name = uniqueProjectBudgets[index].client_name
          myCustomObject.hours = uniqueProjectBudgets[index].budget_spent
          // After modifying values, send object to array
          holdUniqueProjects.push(myCustomObject)
        }
      
      })

    }

    console.log(`======= There is a total of ${holdUniqueProjects.length} unique project budgets =======`);

    // GraphQl PATCH request for Monday.com
    let query = `mutation ($item_id: Int!, $boardId: Int!, $column_id: String!, $value: JSON!){
      change_column_value (
        board_id: $boardId,
        item_id: $item_id,
        column_id: $column_id,
        value: $value
      )
      {id}
    }`
    
    // Store array of Monday objects to use in PATCH request
    let hoursToUpdate = holdUniqueProjects.map((singleHarvestObject)=>{
      console.log(singleHarvestObject, '====================================< Single Harvest Object before monday');
      
      // Create Object which maps to Query defined above, for every unique PropjectBudget that we will create
      let variablesForCreatingContent = JSON.stringify({
        "boardId": DEV_MONDAY_BOARD_HOURS,
        "item_id": Number(singleHarvestObject.id),
        "column_id": "numbers1",
        "value": JSON.stringify(
          `${singleHarvestObject.hours.toString()}`,
        )
      })

      return variablesForCreatingContent
    })
  
    console.log('=========================== HARVEST MAPPED TO MONDAY GRAPHQL ===========================');
    // Start of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<
  
    // Returns a Promise that resolves after Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
  
    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
      // Loop through array constructed above, after mapping values to build our objects
      for (var i = 0; i <= hoursToUpdate.length - 1; hoursToUpdate[i++]) {
        // Log Successfuly PATCH requests sent to Monday.com
        // And display count of current / total requests
        console.log(`========== Sending Monday TimeEntries, on number: ${i + 1} of ${ hoursToUpdate.length} ==========` );

        axios.post(mondayURL, {
          'query': query,
          'variables': hoursToUpdate[i]
        }, {
            headers: {
              'Content-Type': `application/json`,
              'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
            },
        })
        .then((response)=>{
          // Log 200 Response from Monday.com
          console.log(response.data, '<--- Requests ok');
        })
        .catch((error)=> 'There was an error here: ' + error)
      
        // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
        await timer(1000); // Then the created Promise can be awaited
        // Finally the timeout completes & execution continues at this point. 
      }
    }
  
    loadAPIRequestsWithDelayTimer()
    // End of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<
  
    console.log('=============== Update to Hours on Project-Rollup Board Complete! ================');
  }
}