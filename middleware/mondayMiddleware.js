/* HTTP CLIENT */ 
const axios = require('axios');

/* MONDAY.COM CREDENTIALS */
let devMondayBoardID = Number(process.env.MONDAY_BOARD_KURT_ID);

/* MONDAY.COM v2 API ENDPOINT */ 
const mondayURL = process.env.MONDAY_APIV2_URL;

module.exports = {
  getBoardColumnValues: async (req, res, next) => {
    let query = `query {boards (ids: 2166109852) {
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
    } }`;

    axios.post(`https://api.monday.com/v2`, {
      'query': query,
      }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization' : `${process.env.MONDAY_APIV2_TOKEN_KURT}`
      },
      })
   .then((response) => {
     let findColumnValues = response.data.data.boards[0].items
     
      let onlyColumnValues = findColumnValues.map((singleObject) => singleObject.column_values)

      console.log(onlyColumnValues, 'onlyColumnValues');
   })
   .catch((error)=>{
     console.log('There was an error here: ' + error);
   })

  },
  getAllUsersToFilterIDs: async (req, res, next) => {
    let allMondayUsersContainer = [];
    let query = "query { users { email id } }"

    await axios.post("https://api.monday.com/v2",  {
      'query': query,
    }, {
        headers: {
          'Content-Type': `application/json`,
          'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
        },
    }
    ).then((response)=>{
      let allUsersWithEmailAndId = response.data.data.users

      allUsersWithEmailAndId.map((singleMondayUser)=>{
        // console.log(singleMondayUser, 'singleMondayUser <---------------------------------');
        allMondayUsersContainer.push(singleMondayUser)
      })

      res.locals.allMondayUsersContainer = allMondayUsersContainer
      next()
      // console.log(allMondayUsersContainer, 'allMondayUsersContainer');
    }).catch((error)=>{
      console.log('Here is my error:' + error, 'error');
    })
  },
  compareExisitingAndNewProjectUserAssignments: async (req, res, next) => {

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

    let harvestTimeEntriesContainer = res.locals.filteredTimeEntryObjectsForMondayWithUserEmail
    console.log('Your Harvest collection of User IDs is this long: ' + harvestTimeEntriesContainer.length );
    // Note: Purposely not implementing try/catch outside of callbacks
    // https://nodejs.org/en/knowledge/errors/what-is-try-catch/

    // Request all Column Values from Monday.com board
    await axios.post(mondayURL, {
      'query':queryToViewAllItemsOnBoard,
    }, {
        headers: {
          'Content-Type': `application/json`,
          'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
        },
    })
    .then((response) => {
      // Find Each Time Entry ID which exists on Monday.com
      let column_values = response.data.data.boards[0].items
      if (column_values.length > 0) {

        console.log('time entries exist!', column_values);

        let existingTimeEntryIdStrings = column_values.map( (singleItem) => {
            // remove double quites from strings, which are numbers
            return singleItem.column_values[0].value.replace(/["']/g, "")
        })

        let onlyUniqueEntries = harvestTimeEntriesContainer.filter(o1 => existingTimeEntryIdStrings.some(o2 => o1.timeEntryId !== o2? o1 : null));
        console.log(onlyUniqueEntries, `Here is a count of my time entries to update: ${onlyUniqueEntries.length}`);

        res.locals.arrayOfHarvestTimeEntriesToCreate = onlyUniqueEntries;
        next()
      } else {
        console.log('empty! -------> Sending harvest entries to be created');
        res.locals.arrayOfHarvestTimeEntriesToCreate = harvestTimeEntriesContainer
        next()
      }

    }).catch((error)=>{
      console.error(`The following ERRORS occurred:` + error)
    })

  },
  sendNewHarvestDataToMondayApp: async (req, res, next) => {
    // let dateOfToday = new Date().toJSON().slice(0,10).replace(/-/g,'-');
    // Array[] of new TimeEntries to create, after being filtered in above function
    let harvestObjectForMonday = res.locals.arrayOfHarvestTimeEntriesToCreate;

    console.log(harvestObjectForMonday.length, 'harvestObjectForMonday - 1');
    
    // Construct GraphQl query, for Monday.com to consume when Creating New TimeEntry Items
    // First part of Axios request
    let query = `mutation ( $myItemName: String!, $boardId: Int!, $column_values: JSON!) {
      create_item(
          board_id: $boardId,
          item_name: $myItemName,
          create_labels_if_missing: true,
          column_values: $column_values
      )
      {id}
    }`;

    // Array[] of harvestTimeEntry objects
    // Loop through to createing objects fith columne fields for Monday.com
    // Second part of Axios Request
    // https://api.developer.monday.com/docs/guide-to-changing-column-data
          
    let mondayObjects = harvestObjectForMonday.map((singleHarvestObject)=>{

      console.log(singleHarvestObject, '====================================< Single Harvest Object before monday');
      
      let variablesForCreatingContent = JSON.stringify({
        "myItemName": singleHarvestObject.submitter,
        "boardId": devMondayBoardID,
        "column_values": JSON.stringify({
          "text07": `${singleHarvestObject.timeEntryId.toString()}`,
          "date4": singleHarvestObject.dateSubmitted,
          "person": {"personsAndTeams":[{"id": singleHarvestObject.mondayId ,"kind":"person"}]},
          "text1": `${singleHarvestObject.submitterId.toString()}`,
          "text": `${singleHarvestObject.billableBoolean.toString()}`,
          "text2": singleHarvestObject.client,
          "text6": singleHarvestObject.projectName,
          "text20": singleHarvestObject.projectCode,
          "text8": singleHarvestObject.projectNotes,
          "numbers7": singleHarvestObject.hoursSubmitted,
          "text0": singleHarvestObject.task,
        })
      })

      return variablesForCreatingContent
    })

    console.log('=========================== HARVEST MAPPED TO MONDAY GRAPHQL ===========================');
    // Start of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<

    // Returns a Promise that resolves after "ms" Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work

      for (var i = 0; i <= mondayObjects.length - 1; mondayObjects[i++]) {
        console.log(`Sending Monday TimeEntries, on number: ${i + 1} of ${ mondayObjects.length}` );

        axios.post(mondayURL, {
          'query': query,
          'variables': mondayObjects[i]
        }, {
            headers: {
              'Content-Type': `application/json`,
              'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
            },
        })
        .then((response)=>{
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

    console.log('=============== Creating Items Complete! ================');

  },
  deleteAllDataFromAProject: async (req, res, next) => {
    let query = "mutation { delete_item (item_id: 12345678) { id }}";

    axios.get(mondayURL, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization' : `${process.env.MONDAY_APIV2_TOKEN_KURT}`
      },
      body: JSON.stringify({
        query : query
      })
    })
    .then(res => res.json())
    .then(res => console.log(JSON.stringify(res, null, 2)));
  }
}