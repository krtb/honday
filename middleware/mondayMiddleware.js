/* HTTP CLIENT */ 
const axios = require('axios');

/* MONDAY.COM CREDENTIALS */
let devMondayBoardID = Number(process.env.MONDAY_BOARD_KURT_ID);

/* MONDAY.COM v2 API ENDPOINT */ 
const mondayURL = process.env.MONDAY_APIV2_URL;

module.exports = {
  getBoardColumnValues: async (req, res, next) => {
    let query = `query {boards (ids: 2168123540) {
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
        allMondayUsersContainer.push(singleMondayUser)
      })
      res.locals.allMondayUsersContainer = allMondayUsersContainer
      next()
      // console.log(allMondayUsersContainer, 'allMondayUsersContainer');
    }).catch((error)=>{
      console.log('Here is my error:' + error, 'error');
    })
  },
  compareExisitingAndNewProjectUserAssignments: (req, res, next) => {

    console.log( 'compareExisitingAndNewProjectUserAssignments started');

    // Container of all current project codes in Monday.com
    let myExistingTimeEntries = [];

    // List of timeEntry codes that exist in Monday.com
    let arrayOfExistingMondayTimeEntries = [];

    // List of filtered Harvest TimeEntries to be Created in Monday.com
    let arrayOfHarvestTimeEntriesToCreate = [];

    // Construct GraqphQl Quuery, to be consumed by Axios request to Monday.com
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

    // TODO: Rewrite this api request
    
    // Request all Column Values from Monday.com board
    axios.post(mondayURL, {
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

      console.log(column_values, 'column_values <--------------');

      column_values.map( (singleItem) => {

        // Map over Column Values
        singleItem.column_values.map((oneItem)=>{

          // If the title of an Item, is equal to Time Entry ID
          if(oneItem.title === 'Time Entry ID'){

            // Collect each Time Entry ID that exists in Monday.com
            let eachTimeEntryOnBoard = oneItem.value

            // TODO: Change the below as it is only replacing double quotes with single quotes
            // .replace(/['"]+/g, '')

            // Convert strings to number primitive & push to array declared above
            // To then have an array of TimeEntryIds which currently exist in Monday.com

            myExistingTimeEntries.push( eachTimeEntryOnBoard )
          }

        })

      })

      // Map over each time entry code, which currently exists in Monday.com
      myExistingTimeEntries.map((mondayTimeEntry)=>{

        // Access an Array[] which contains TimeEntries with Email and MondayID Added.
        let harvestTimeEntriesContainer = res.locals.filteredTimeEntryObjectsForMondayWithUserEmail
       
        // Map over a single harvesTimeEntry
        harvestTimeEntriesContainer.map((harvesTimeEntry) =>{

          // If a new harvestTimeEntryId is equal to an existing mondayTimeEntry ID 
          // (Note: which was pulled from Harvest)
          // Then push this harvestTimeEntryId we identified to our duplicated item list, arrayOfExistingMondayTimeEntries

          if(harvesTimeEntry.timeEntryId === mondayTimeEntry){

            arrayOfExistingMondayTimeEntries.push(harvesTimeEntry)

          } else {

            // Else, push the harvestTimeEntryId to our creation list, arrayOfHarvestTimeEntriesToCreate
            arrayOfHarvestTimeEntriesToCreate.push(harvesTimeEntry)
          }
        })

        res.locals.arrayOfHarvestTimeEntriesToCreate = arrayOfHarvestTimeEntriesToCreate;
        res.locals.arrayOfExistingMondayTimeEntries = arrayOfExistingMondayTimeEntries;
        return next()
      })

    }).catch((error)=>{
      console.error(`The following ERRORS occurred:` + error)
    })

  },
  sendNewHarvestDataToMondayApp: async (req, res, next) => {
    // let dateOfToday = new Date().toJSON().slice(0,10).replace(/-/g,'-');
    // Array[] of new TimeEntries to create, after being filtered in above function
    let harvestObjectForMonday = res.locals.arrayOfHarvestTimeEntriesToCreate;
    console.log(harvestObjectForMonday, 'harvestObjectForMonday - 1');
    
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
      console.log(singleHarvestObject, 'singleHarvestObject - 2 ');

      let variablesForCreatingContent = JSON.stringify({
        "myItemName": singleHarvestObject.submitter,
        "boardId": devMondayBoardID,
        "column_values": JSON.stringify({
          "numbers": singleHarvestObject.timeEntryId,
          "date4": singleHarvestObject.dateSubmitted,
          "person": {"personsAndTeams":[{"id":`${singleHarvestObject.submitterId}`,"kind":"person"}]},
          "numbers": singleHarvestObject.submitterId,
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

    console.log('mondayObjects ------------- 3');
    // Start of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<

    // Returns a Promise that resolves after "ms" Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

    // TODO: Replace harvestUserIdCollection variable with new var 
    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
      console.log('Your Harvest copllection of User IDs is this long: ' + mondayObjects.length );

      for (var i = 0; i <= mondayObjects.length - 1; mondayObjects[i++]) {

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