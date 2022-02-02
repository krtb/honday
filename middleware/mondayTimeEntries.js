/* HTTP CLIENT */ 
const axios = require('axios');

/* MONDAY.COM CREDENTIALS */
let devMondayBoardID = Number(process.env.DEV_MONDAY_TIME_ENTRIES);

/* MONDAY.COM v2 API ENDPOINT */ 
const mondayURL = process.env.MONDAY_APIV2_URL;

module.exports = {
  getAllUsersToFilterIDs: async (req, res, next) => {
    //TODO: Get total page count
    let query = "query { users { email id } }"
    let totalMondayUserCount = 0

    axios.post("https://api.monday.com/v2",  {
            'query': query,
          }, {
              headers: {
                'Content-Type': `application/json`,
                'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
              },
          }
          ).then((response)=>{
            totalMondayUserCount = response.data.data.users.length

            console.log(totalMondayUserCount, '<-------------- getUsersTotalPages, return response');
            // Always return a promise, required by Heroku
            return response
          }).catch((error)=>{
            console.log('Here is my error:' + error, 'error');
          })

    // Start of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<

    // Returns a Promise that resolves after Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
      let allMondayUsersContainer = [];

      for (var i = 0; i <= totalMondayUserCount; totalMondayUserCount[i++]) {
        console.log(`Pulling Users from Monday, on: ${i + 1} of ${ totalMondayUserCount}` );
        //TODO: rethink this variable
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
          // Store in outer level variable
          allUsersWithEmailAndId.map((singleMondayUser)=>{
            allMondayUsersContainer.push(singleMondayUser)
          })
          return response
          // console.log(allMondayUsersContainer, 'allMondayUsersContainer');
        }).catch((error)=>{
          console.log('Here is my error:' + error, 'error');
        })
        // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
        //under 500ms best, Monday and Harvest require 1 Second timeout
        await timer(10000); // Then the created Promise can be awaited
        // Finally the timeout completes & execution continues at this point. 
      }
      res.locals.allMondayUsersContainer = allMondayUsersContainer
      next()
      console.log(allMondayUsersContainer, '<-------- allMondayUsersContainer COMPLETED');
    }

    loadAPIRequestsWithDelayTimer()
    // End of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<
  },
  compareExisitingAndNewProjectUserAssignments: async (req, res, next) => {
    let harvestTimeEntriesContainer = res.locals.filteredTimeEntryObjectsForMondayWithUserEmail
    // console.log('Your Harvest collection of User IDs is this long: ' + harvestTimeEntriesContainer.length );
    let myExistingTimeEntryIds = []
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
      // Array[] of Objects{}
      let column_values = response.data.data.boards[0].items

      // TODO: Finish replacing function that checks if timeEntry exists in monday.com
      // ---------------- To Replace Below check of Monday.com values ----------------
      // let mondayRows = response.data.data.boards[0].items

      // myExistingTimeEntryIds = mondayRows.map((aRow)=>{
      //   // console.log(aRow.column_values[0].title, '<-------------- A ROW HERE');
      //   if(aRow.column_values[0].title === 'Time Entry ID'){
      //     // Remove double quotes, leave string wrapped in single quotes
      //     return aRow.column_values[0].value.replace(/["']/g, "")
      //   }
      // })
      
      // console.log(myExistingTimeEntryIds, myExistingTimeEntryIds.length, '<-----------------');
      // let exisitingEntriesToPATCH = []
      // let newEntriesToCreate = []

      // harvestTimeEntriesContainer.map((singleNewTimeEntry)=>{
      //   myExistingTimeEntryIds.map((existingTimeEntry)=>{
      //     if(existingTimeEntry === singleNewTimeEntry.timeEntryId){
      //       exisitingEntriesToPATCH.push(singleNewTimeEntry)
      //     } else {
      //       newEntriesToCreate.push(singleNewTimeEntry)
      //     }
      //   })
      // })
      // console.log(exisitingEntriesToPATCH.length, newEntriesToCreate.length, '<------------ check here');
      // harvestTimeEntriesContainer.filter((singleValue)=>{
      //   // console.log(singleValue, 'singleValue');
      //   return singleValue.timeEntryId === myExistingTimeEntryIds
      // })
      // ---------------- To Replace Below check of Monday.com values ----------------

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

    // Returns a Promise that resolves after Milliseconds
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
          return response
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
}