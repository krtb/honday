/* HTTP CLIENT */ 
const axios = require('axios');

/* MONADY.COM ROUTES */ 
const mondayURL = process.env.MONDAY_APIV2_URL;
let devMondayBoardID = Number(process.env.MONDAY_BOARD_KURT_ID);

module.exports = {
  updateExistingProjectsOrCreate: (req, res, next) => {
    // TODO: call Monday Board to find existing projects in rows.
    console.log( 'updateExistingProjectsOrCreate started');
    // container of all current project codes in Monday.com
    let myCurrentProjectCodes = [];
    // List of project codes that exist in Monday.com
    let arrayOfExistingMondayProjects = [];
    // List of filtered Harvest projects
    let arrayOfHarvestProjectsToUpdate = [];

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

    axios.post(mondayURL, {
      'query':queryToViewAllItemsOnBoard,
    }, {
        headers: {
          'Content-Type': `application/json`,
          'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
        },
    })
    .then((response) => {

      // Map into object items, pull out laste updated date, and project code
      let column_values = response.data.data.boards[0].items

      column_values.map( (singleItem) => {

        singleItem.column_values.map((oneItem)=>{

          if(oneItem.title === 'PS Object ID'){
            // TODO: Change the below as it is only replacing double quotes with single quotes
            let eachProjectCode = oneItem.value.replace(/['"]+/g, '')
            // convert strings to number primitive & push to array declared above
            myCurrentProjectCodes.push( eachProjectCode )
          }

        })

      })

      // Map over each projet code obtaibed from existing line items with the function above.
      myCurrentProjectCodes.map((mondayProjectCode)=>{
        // Pull out data stored locally, a list of specific projects and users = [{},{}]
        let harvestProjectCodes = res.locals.filteredUserProjectArrays
       
        // Below function checks if the new project codes from harvest already exist
        harvestProjectCodes.map((singleHarvestProject) =>{
          
          if(singleHarvestProject.projectCode === mondayProjectCode){
            arrayOfExistingMondayProjects.push(singleHarvestProject)
          } else {
            arrayOfHarvestProjectsToUpdate.push(singleHarvestProject)
          }
        })

      })

      // TODO: set 2 lists of Update and Existing in res.locals,
      // THEN: Create new project rows
      // THEN: PATCH/PUT Existing project information, examples would be TimeSheet object for hours changing
      // console.log(arrayOfHarvestProjectsToUpdate, arrayOfExistingMondayProjects, '<------ arrayOfExistingMondayProjects/arrayOfHarvestProjectsToUpdate');

    }).catch((error)=>{
      console.error(`The following ERRORS occurred:` + error)
    })

  },
  sendHarvestDataToMondayApp: function (req, res, next) {
    let harvestObjectForMonday = res.locals.harvestObjectForMonday;
    let dateOfToday = new Date().toJSON().slice(0,10).replace(/-/g,'-');

    //TODO: update to send multiple entries at once,
    // will need to update all boards, with all projects,
    // that have a new updated_at value in their object.

    // below uses graphql variables
    let queryToCreateContent = `
      mutation (
      $myItemName: String!,
      $boardId: Int!,
      $column_values: JSON!)
      {
      create_item(
          board_id: $boardId,
          item_name: $myItemName,
          create_labels_if_missing: true,
          column_values: $column_values
      )
      {id}
      }
    `;

    let isBillableBoolean = harvestObjectForMonday.projectIsBillableBoolean;
    let isBillableString = isBillableBoolean.toString()
    let variablesForCreatingContent = {
      // https://api.developer.monday.com/docs/guide-to-changing-column-data
      "myItemName": "action item test copy",
      "boardId": Number(process.env.MONDAY_BOARD_KURT_ID),
      "column_values": JSON.stringify({
        "text": harvestObjectForMonday.projectPSNumber,
        "person": {"personsAndTeams":[{"id":25526553,"kind":"person"}]},
        "date4": dateOfToday,
        "status9": "Sessions",
        "numbers": 40,
        "long_text": harvestObjectForMonday.projectNotes,

        "check": {"checked" : isBillableString}
      })
    }

      axios.post(mondayURL, {
          'query':queryToCreateContent,
          'variables': JSON.stringify(variablesForCreatingContent)
      }, {
          headers: {
            'Content-Type': `application/json`,
            'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
          },
      })
      .then((response) => {
          return next(response)
      })
      .catch((error) => {
        console.error(`The following ERRORS occurred:` + error);
      });
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