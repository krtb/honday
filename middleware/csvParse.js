const axios = require('axios')
const _ = require('lodash');
const fs = require('fs');
const { JobList } = require('twilio/lib/rest/bulkexports/v1/export/job');
const { json } = require('express/lib/response');
const { clear } = require('console');
let arrayOfProjectTrsBoardObjects;
let formattedLineItem;
let arrayOfProjectTrsPSCodes = [];
let trashPsCodes = [];
let harvestObjectsToSendToMonday = [];
// Quirks with using module.exports, when modules circularly depend on each other.
// It is recommended against replacing the object.
// For multiple exports at once, using object literal definition, implement the below
// The exports object is created for your module before your module runs, 
// and if there are circular dependencies, other modules may have access to that default object before your module can fill it in. 
// If you replace it, they may have the old, original object, and not (eventually) see your exports. 
// If you add to it, then even though the object didn't have your exports initially, eventually it will have it, even if the other module got access to the object before those exports existed.
// https://nodejs.org/api/modules.html#modules_cycles

// Express expects a Middleware function in order to run without failing.
Object.assign(module.exports, {
  parseCSV: async (req, res, next) =>{
    const fs = require('fs');
    const { parse } = require('csv-parse');
    // Note, the `stream/promises` module only on Node.js => version 16^
    const { finished } = require('stream/promises');
    // CSV file that is being uploaded
    const allHarvestItemsCsv = './csvFiles/2022-05-08-harvest_time_report.csv';
    const onlyCurrentHarvestProjects = './csvFiles/2022-06-08_harvest_codes_for_monday.csv';
    const records = await [];
    const stream = fs.createReadStream(onlyCurrentHarvestProjects);
    const parser = stream.pipe(parse({ delimiter: ',', columns: true,}));
    // Below not used, may remove
    // const assert = require('assert');
    // const os = require('os');
    // const path = require('path');
    // const debug = require('debug')('app:csv:service');
    // const chalk = await import('chalk');

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      };
    });

    await finished(parser);

    {
      // Create a copy of Records
      const allMyRecords = records;

      const arrayOfaHarvestObjects = await allMyRecords.map((aSingleRecord)=>{
          const singleaHarvestObject = {
            'Date': aSingleRecord.Date,
            'Client': aSingleRecord.Client,
            'Project': aSingleRecord.Project,
            'ProjectCode': aSingleRecord['Project Code'],
            'Task': aSingleRecord.Task,
            'Notes': aSingleRecord.Notes,
            'Hours': aSingleRecord.Hours,
            'HoursRounded': aSingleRecord['Hours Rounded'],
            'Billable': aSingleRecord['Billable?'],
            'Invoiced': aSingleRecord['Invoiced?'],
            'Approved': aSingleRecord['Approved?'],
            'FirstName': aSingleRecord['First Name'],
            'LastName': aSingleRecord['Last Name'],
            'Roles': aSingleRecord.Roles,
            'Employee': aSingleRecord['Employee?'],
            'BillableRate': aSingleRecord['Billable Rate'],
            'BillableAmount': aSingleRecord['Billable Amount'],
            'CostRate': aSingleRecord['Cost Rate'],
            'CostAmount': aSingleRecord['Cost Amount'],
            'Currency': aSingleRecord.Currency,
            'ExternalReferenceURL': aSingleRecord['External Reference URL'],
          }
          return singleaHarvestObject;
      });

      res.locals.arrayOfaHarvestObjects = arrayOfaHarvestObjects;
      console.log(`Collected ${arrayOfaHarvestObjects.length} line items from CSV file.`);
    }

    next();
  },
  viewMondayBoardValues: async (req, res, next ) =>{
    //Id from Monday Board to be uploaded to 
    const projectTrsBoard = 2495489300;
    const mainTimeTrackBoardProd = 2495489055;
    const duplicateOfTimeTrackingBoard = 2635507777;

    const viewBoardColumns = `query { boards (ids: ${duplicateOfTimeTrackingBoard}) { owner { id }  columns {   title   type }}}`;

    let query = `{
      boards (ids: ${duplicateOfTimeTrackingBoard}) {
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

    await axios.post("https://api.monday.com/v2",  {
      'query': query,
    },
    {
      headers: {
        'Content-Type': `application/json`,
        'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
      },
    },
    )
    .then((response)=>{
      console.log(response)
      debugger
    })
    .catch((error)=>{
      console.log('Here is my error:' + error, 'error');
    });

    next();
  },
  getUserFromMonday: async (req, res, next) => {
    //TODO: Get total page count
    console.log('Starting to filter on id');
    // let query = "query { users { email id } }"
    // let totalMondayUserCount = 0

    // axios.post("https://api.monday.com/v2",  {
    //   'query': query,
    //   }, 
    //   {
    //     headers: {
    //       'Content-Type': `application/json`,
    //       'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
    //     },
    //   }).then((response)=>{
    //     totalMondayUserCount = response.data.data.users.length
    //     return response
    //   }).catch((error)=>{
    //     console.log('Here is my error:' + error, 'error');
    // })

    // Start of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<

    // Returns a Promise that resolves after Milliseconds
    
    // async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
      let allMondayUsersContainer = [];
      let query = "query { users { email id name} }"
    
      await axios.post("https://api.monday.com/v2",  {
        'query': query,
      }, {
          headers: {
            'Content-Type': `application/json`,
            'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
          },
      }
      ).then((response)=>{
        allMondayUsersContainer = response.data.data.users
        return response
      }).catch((error)=>{
        console.log('Here is my error:' + error, 'error');
      })

      res.locals.allMondayUsersContainer = allMondayUsersContainer

      console.log(`${allMondayUsersContainer.length} Monday Users collected.`)
      next()
    // }

    // loadAPIRequestsWithDelayTimer()
    // End of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<
  },
  getProjectTRSBoardProjectData: async (req, res, next)=>{
    const projectTrsBoard = 2495489300;
    const projectTRSBoardObjectsCollection = []

    let query = `{
      boards (ids: ${projectTrsBoard}) {
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

    await axios.post("https://api.monday.com/v2",  {
      'query': query,
    },
    {
      headers: {
        'Content-Type': `application/json`,
        'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
      },
    })
    .then((response)=>{

      const projectTrsItemsNameIdColumnObjects = response.data.data.boards[0].items

      projectTrsItemsNameIdColumnObjects.map((anItem)=>{
        projectTRSBoardObjectsCollection.push(anItem)
      })
      arrayOfProjectTrsBoardObjects = projectTRSBoardObjectsCollection

      next()
    })
    .catch((error)=>{
      console.log('Here is my error:' + error, 'error');
    })

    console.log(`Total ProjectTRS Board Items Collected: ` + arrayOfProjectTrsBoardObjects.length)

    next()
  },
  compareHarvestCSVAndProjectTRSBoard: async (req, res, next)=> {
    var arrayOfaHarvestObjects = res.locals.arrayOfaHarvestObjects;
    const arrayOfHarvestPsCodes = [];

    // Utility Functions
    function removeQuotedString(item) {
      return item.replace(/['"]+/g, '');
    }

    function matchTrsItem(oneHarvestItem) {
      let harvestPsCode = oneHarvestItem.ProjectCode;
      // let arrayOfProjectTrsPSCodes = [];
      // let trashPsCodes = []

      let foundID = _.find(arrayOfProjectTrsBoardObjects, (mondayTrsItem) => {

        let psCodeColumnObject = mondayTrsItem.column_values[9].value;

          if (psCodeColumnObject === null || psCodeColumnObject === undefined) {
            // return mondayTrsItem.id
            // console.log(mondayTrsItem.id, `<--- logging my test case here: mondayTrsItem.id ---`);
            trashPsCodes.push(mondayTrsItem.id)

          } else if(removeQuotedString(psCodeColumnObject) === harvestPsCode) {
            // return mondayTrsItem
            let myMondayHarvest = {
              oneHarvestItem,
              mondayTrsItem
            }
            // let foundMondayObject = parseFloat(mondayTrsItem);
            // arrayOfProjectTrsPSCodes.push(myMondayHarvest);
            return myMondayHarvest
          } else {
            trashPsCodes.push(mondayTrsItem.id)
          }
      })

      return foundID
    }

    function getTodaysDate () {
      let dateOfToday = new Date();
      // Transform into ISO format, like this => 2022-01-04
      let todaysDateIsoUtcTimezone = function ISODateString(datOfToday) {
        function pad(n) {return n<10 ? '0'+n : n}
        return datOfToday.getUTCFullYear()+'-'
            + pad(datOfToday.getUTCMonth()+1)+'-'
            + pad(datOfToday.getUTCDate())
      }(dateOfToday)
      return todaysDateIsoUtcTimezone
    }

    function findHarvestUserMondayId(allMondayUsersContainer, harvestUser) {
      //TODO: Find out why 2 user emails are not filtered through
      // console.log(harvestUser, '<----------------- MONDAY USER');

      const matchedUser = _.find(allMondayUsersContainer, (aSingleMondayUser)=>{

        let lowerCasedMondayUserName = aSingleMondayUser.name.toLowerCase();
        let lowerCasedHarvestUserName = harvestUser.toLowerCase();

        let validateMondayUser = lowerCasedMondayUserName !== null || undefined? lowerCasedMondayUserName : null;

        if((validateMondayUser === lowerCasedHarvestUserName)){
          //TODO: Check types here, are different. Austing and Joe pending.
          return aSingleMondayUser  
        }
      })
      return matchedUser
    }

    // Main Functions Below --->
    function formatMondayTimeTrackingObj(aHarvestObj, matchedItem) {
      const harvestUser = `${aHarvestObj.FirstName} ${aHarvestObj.LastName}`;
      const timeTrackingItemTitle = `${aHarvestObj.FirstName} ${aHarvestObj.LastName} - ${aHarvestObj.Project} - ${aHarvestObj.Task}`;
      const timeTrackingItemDate = aHarvestObj.Date;
      const allMondayUsersContainer = res.locals.allMondayUsersContainer;
      const matchingHarvestUserInMonday = findHarvestUserMondayId(allMondayUsersContainer, harvestUser);
      let trsBoardObjectMatched = matchTrsItem(aHarvestObj)
      const harvestUserHours = aHarvestObj.Hours;
      const hoursApprovedBoolean = aHarvestObj.Approved;
      let hoursApprovalCheckerHours =  hoursApprovedBoolean === "No"? 0 : harvestUserHours;
      const harvestUserNotes = aHarvestObj.Notes;
      // Both variables used in object construction.
      let objectForMondayWithHarvestData
      let justTrsId
      if (trsBoardObjectMatched !== undefined) {
        justTrsId = trsBoardObjectMatched.id

        objectForMondayWithHarvestData = {
          harvestUser,
          timeTrackingItemTitle,
          timeTrackingItemDate,
          matchingHarvestUserInMonday,
          harvestUserHours,
          harvestUserNotes,
          hoursApprovalCheckerHours,

          justTrsId
        };
        harvestObjectsToSendToMonday.push(objectForMondayWithHarvestData)
      }

    }

    // Map over Harvest Objects from CSV
    arrayOfaHarvestObjects.map((aHarvestObj)=>{
      //TODO: Remove matchTrsItem(), not being used here. Used inside of below function.
      let matchedItem = matchTrsItem(aHarvestObj);
      let formattedMondayObject = formatMondayTimeTrackingObj(aHarvestObj, matchedItem)
    });

    // Global variable declared at top level of file.
    res.locals.harvestObjectsToSendToMonday =  harvestObjectsToSendToMonday;
    console.log(`${harvestObjectsToSendToMonday.length} Items ready to be sent to Monday.`);
    next()
  },
  postMondayItems: async (req, res, next)=> {    
    let arrayOfMondayItemsToCreate = harvestObjectsToSendToMonday;
    debugger
    console.log(arrayOfMondayItemsToCreate, `<--- logging my test case here: arrayOfMondayItemsToCreate ---`);

    const mondayURL= "https://api.monday.com/v2";
    const devMondayBoardID = 2635507777;
    let query = `mutation ( 
      $boardId: Int!, 
      $myItemName: String!,
      $column_values: JSON!
    ){
    create_item(
      board_id: $boardId,
      item_name: $myItemName,
      create_labels_if_missing: true,
      column_values: $column_values
    )
    {id}
    }`;

    //TODO: Find out why Joe and Austin returned as undefined.
    let myFormattedTimeTrackingItems = arrayOfMondayItemsToCreate.map((aItem)=> {
      
      if( aItem.matchingHarvestUserInMonday){
        let mondayObjects = JSON.stringify({
          "boardId": devMondayBoardID,
          "myItemName": aItem.timeTrackingItemTitle,
          "column_values": JSON.stringify({
            "person": {"personsAndTeams":[{"id": aItem.matchingHarvestUserInMonday.id ,"kind":"person"}]},
            "date4": {"date": aItem.timeTrackingItemDate},
            "numbers": aItem.harvestUserHours,
            "notes75": aItem.harvestUserNotes,
            "connect_boards5": {"changed_at":"2022-05-11T17:16:52.729Z","linkedPulseIds":[{"linkedPulseId": parseFloat(aItem.justTrsId)}]}
          })
        });
        return mondayObjects;
      }

    })
    let mondayContainer = myFormattedTimeTrackingItems;
    // Post Items, with 1 second pause, to Monday.com API
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
      for (var i = 0; i <= mondayContainer.length - 1; mondayContainer[i++]) {
        
        // console.log(myFormattedTimeTrackingItems[i], `<--- logging my test case here: myFormattedTimeTrackingItems[i] ---`);

          axios.post(mondayURL, {
            'query': query,
            'variables': myFormattedTimeTrackingItems[i]
          }, {
              headers: {
                'Content-Type': `application/json`,
                'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
              },
          })
          .then((response)=>{
            let serverResponse = response.data.errors? response.errors[0] : "No Error"
            console.log(serverResponse, `<--- logging my test case here: serverResponse ---`);
            return response
          })
          .catch((error)=> {
            debugger
            'There was an error here: ' + error, 'TESTING THIS'
          })
        

        // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
        await timer(1000); // Then the created Promise can be awaited
        // Finally the timeout completes & execution continues at this point. 
      }
      console.log('=============== Creating Items Complete! ================');
      //TODO: added return statement to prevent repeat calls if page refreshed.
      return
      next()
    }
    loadAPIRequestsWithDelayTimer()
  },
})
