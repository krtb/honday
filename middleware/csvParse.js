const axios = require('axios')
const _ = require('lodash');
const fs = require('fs');
const { JobList } = require('twilio/lib/rest/bulkexports/v1/export/job');
const { json } = require('express/lib/response');
const { clear } = require('console');
let arrayOfProjectTrsBoardObjects; // Used in getProjectTRSBoardProjectData();
let trashPsCodes = [];
let harvestTimeEntriesAndMondayUser = []; // Used in formatMondayTimeTrackingObj();
//TODO: Revisit below variables and consider removing.
let arrayOfProjectTrsPSCodes = [];
let projectsWithTotalHours = [];
let boardItemsToDelete = [];

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
  viewMondayBoardValues: async (req, res, next ) =>{
    // Note: This function serves as a READ operation. Not required for application to run.
    console.log("Querying Monday Board Values.");
    {
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
      })
      .catch((error)=>{
        console.log('Here is my error:' + error, 'error');
      });
      next();
    }
  },
  getMondayBoardItemIds: async (req, res, next)=>{
    //Note: Required in order to create Linked Items via their IDs.
    console.log("===> Pulling Monday.com items to DELETE. <====");

    {
      const itemsToDeleteBoardId = 2635507777;

      let query = `{
        boards (ids: ${itemsToDeleteBoardId}) {
          items {
            id
          }
        }
      }`;

      await axios.post("https://api.monday.com/v2",
      {
        'query': query,
      },
      {
        headers: {
          'Content-Type': `application/json`,
          'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
        },
      })
      .then((response)=>{
        boardItemsToDelete = response.data.data.boards[0].items;
        next();
      })
      .catch((error)=> {
        'There was an error in loadAPIRequestsWithDelayTimer(): ' + error
      })

    }
    
  },
  deleteBoardItems: async (req, res, next)=>{
    console.log('Starting deletion of Monday.com board items.');

    {
      const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

      async function loadAPIRequestsWithDelayTimer() {
        //Note: Send POST request with 1 second delay to avoid server timeout. Loop must be wrapped in a async function.
        for (var i = 0; i <= boardItemsToDelete.length - 1; boardItemsToDelete[i++]) {
          console.log(`Deleting board item ${i} of ${boardItemsToDelete.length - 1}`);

          let query = `mutation { delete_item (item_id: ${boardItemsToDelete[i].id}) { id }}`;
          axios.post("https://api.monday.com/v2",
          {
            'query': query,
            'variables': boardItemsToDelete[i]
          }, 
          {
            headers: {
              'Content-Type': `application/json`,
              'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
            },
          }
          )
          .then((response)=>{
            let serverResponse = response.data.errors? response.errors[0] : "Status: Success, item deleted!"
            console.log(serverResponse);

            return response
          })
          .catch((error)=> {
            'There was an error in loadAPIRequestsWithDelayTimer(): ' + error
          })
          await timer(1000); // Note: Timeout set, execution halted, when timeout completes, restart.
        }
        console.log(`===============> Finished deleting items! <================`);
        return //Note: Break from sending requests.
      }
      loadAPIRequestsWithDelayTimer()
    }
    
  },
  parseCSV: async (req, res, next) =>{
    console.log("Read Harvest CSV, map and transform values.");
    // TODO: Revisit below variables and consider removing.
    // const assert = require('assert');
    // const os = require('os');
    // const path = require('path');
    // const debug = require('debug')('app:csv:service');
    // const chalk = await import('chalk');

    {
      const fs = require('fs');
      const { parse } = require('csv-parse');
      const { finished } = require('stream/promises'); // Note: The `stream/promises` module only works on Node.js => version 16^
      const onlyCurrentHarvestProjects = './csvFiles/2022-06-08_harvest_codes_for_monday.csv'; // CSV File Path
      const records = await [];
      const stream = fs.createReadStream(onlyCurrentHarvestProjects);
      const parser = stream.pipe(parse({ delimiter: ',', columns: true,}));
  
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
        //TODO: Map over array, filter based on date.
        //TODO: Create a new array with dates up to a specific timeframe.
        //TODO: Use new array to then format projects with summed total hours.
        //TODO: Loop through both arrays to send to Monday.com
        res.locals.arrayOfaHarvestObjects = arrayOfaHarvestObjects;
        console.log(`Collected ${arrayOfaHarvestObjects.length} line items from CSV file.`);
      }
      next();
    }
  },
  getUserFromMonday: async (req, res, next) => {
    //Note: Monday.com User IDs required to create related User in Monday.com.
    console.log('Getting Current Users from Monday.com');
    {
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
      console.log(`${allMondayUsersContainer.length} Monday.com Users collected.`)
      next()
    }
  },
  getProjectTRSBoardProjectData: async (req, res, next)=>{
    //Note: Required in order to create Linked Items via their IDs.
    console.log("Pulling ProjectTRS board projects, to match with Harvest PS Codes.");
    {
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
    }
  },
  compareHarvestCSVAndProjectTRSBoard: async (req, res, next)=> {
    var arrayOfaHarvestObjects = res.locals.arrayOfaHarvestObjects; //Note: Set in parseCSV() function

    {
      //Note: Utility Functions
      function getTodaysDate() {
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

      function removeQuotedString(item) {
        return item.replace(/['"]+/g, '');
      }

      function matchTrsItem(oneHarvestItem) {
        //Note: Matches Monday.com Project PS Code with Harvest CSV PS Code
        let harvestPsCode = oneHarvestItem.ProjectCode;
        let foundID = _.find(arrayOfProjectTrsBoardObjects, (mondayTrsItem) => {
          let psCodeColumnObject = mondayTrsItem.column_values[9].value;

          if (psCodeColumnObject === null || psCodeColumnObject === undefined) {
            trashPsCodes.push(mondayTrsItem.id)
          } else if(removeQuotedString(psCodeColumnObject) === harvestPsCode) {
            let myMondayHarvest = {
              oneHarvestItem,
              mondayTrsItem
            }
            return myMondayHarvest
          } else {
            trashPsCodes.push(mondayTrsItem.id)
          }
        })
        return foundID
      }

      //Note: Matches Harvest User with Monday User ID
      function findHarvestUserMondayId(allMondayUsersContainer, harvestUser) {
        const matchedUser = _.find(allMondayUsersContainer, (aSingleMondayUser)=>{
          let lowerCasedMondayUserName = aSingleMondayUser.name.toLowerCase();
          let lowerCasedHarvestUserName = harvestUser.toLowerCase();
          let validateMondayUser = lowerCasedMondayUserName !== null || undefined? lowerCasedMondayUserName : null;

          if((validateMondayUser === lowerCasedHarvestUserName)){
            return aSingleMondayUser  
          }
        })
        return matchedUser
      }
    }

    {
      //Note: formatMondayTimeTrackingObj() function main worker, map() below loops through all Harvest Time Entries.
      function formatMondayTimeTrackingObj(aHarvestObj) {

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
        const projectCode = aHarvestObj.ProjectCode;

        {
          let timeEntryWithMatchedMondayUser
          let justTrsId

          if (trsBoardObjectMatched !== undefined) {
            justTrsId = trsBoardObjectMatched.id

            timeEntryWithMatchedMondayUser = {

              harvestUser,
              timeTrackingItemTitle,
              timeTrackingItemDate,
              matchingHarvestUserInMonday,
              harvestUserHours,
              harvestUserNotes,
              hoursApprovalCheckerHours,
              projectCode,

              justTrsId
            };

            harvestTimeEntriesAndMondayUser.push(timeEntryWithMatchedMondayUser)
          }
        }

      }
      //Note: Set in parseCSV() function.
      arrayOfaHarvestObjects.map((aHarvestObj)=>{
        formatMondayTimeTrackingObj(aHarvestObj)
      });
      res.locals.harvestTimeEntriesAndMondayUser =  harvestTimeEntriesAndMondayUser;
      console.log(`${harvestTimeEntriesAndMondayUser.length} Items ready to be sent to Monday.`);
      next()
    }
  },
  sumLastFiscalYear: async (res,req,next)=>{
    // Note: Pulls out all time entries from FY2021/June 31st, 2021 into an array.
    const timeEntriesFY2021 = [];
    harvestTimeEntriesAndMondayUser.map((aHarvestTimeEntry)=>{
      if(aHarvestTimeEntry.timeTrackingItemDate <= '2022-01-31'){        
        timeEntriesFY2021.push(aHarvestTimeEntry)
      }
    })

    timeEntriesFY2021.map(function (fy2021TimeEntry){
      let projectHoursTotaled = projectsWithTotalHours.find(existingItem => existingItem.justTrsId == fy2021TimeEntry.justTrsId);

      function utilInsertPSCode(fy2021TimeEntry, itemObject) {
        let getArrayOfTitle = fy2021TimeEntry.timeTrackingItemTitle.split('-')
        getArrayOfTitle.splice(2,0, `${fy2021TimeEntry.projectCode}`);
        itemObject.timeTrackingItemTitle = getArrayOfTitle.join(' - ')

        return itemObject.timeTrackingItemTitle
      }

      function utilUpdateProjectObject(originalItemObject, newItemObject){
        originalItemObject.justTrsId = newItemObject.justTrsId;
        originalItemObject.timeTrackingItemTitle = utilInsertPSCode(newItemObject, originalItemObject)
        originalItemObject.totalHarvestUserHours = newItemObject.harvestUserHours

        return originalItemObject
      }

      if (projectHoursTotaled !== undefined) {
        //Note: Replaces original project user hours, with most recent summed valued.
        let currentTotalHoursForProject = parseFloat(projectHoursTotaled.totalHarvestUserHours);
        let newHoursFromSimilarProject = parseFloat(fy2021TimeEntry.harvestUserHours);
        let totalNewHoursToAdd = (currentTotalHoursForProject + newHoursFromSimilarProject).toString();

        projectHoursTotaled = utilUpdateProjectObject(projectHoursTotaled, fy2021TimeEntry)
        projectHoursTotaled.totalHarvestUserHours = totalNewHoursToAdd;

        console.log('Project hours compiled.');
      } else {
        let newObject = {};

        newObject = utilUpdateProjectObject(newObject, fy2021TimeEntry);
        projectsWithTotalHours.push(newObject)

        console.log('New project added to array that did not exist previously.');
      }
    });

    projectsWithTotalHours // Note: Contains array of unqiue projects, with their totalUserHours compiled.
  },
  postMondayItems: async (req, res, next)=> {    
    let arrayOfSingularProjectTimeEntries = undefined; //Note: uncomment variable when required - harvestTimeEntriesAndMondayUser
    let arrayOfSumProjectTotals = projectsWithTotalHours;
    let myFormattedTimeTrackingItems

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

    //TODO: combine arrays of time entries into one, then loop through and create on if/else
    if (arrayOfSingularProjectTimeEntries !== undefined) {

      myFormattedTimeTrackingItems = arrayOfSingularProjectTimeEntries.map((aTimeEntryAndMondayUser)=> {

        if(aTimeEntryAndMondayUser.matchingHarvestUserInMonday){       

        let aMondayTimeEntrySingularHours = JSON.stringify({

          "boardId": devMondayBoardID,
          "myItemName": aTimeEntryAndMondayUser.timeTrackingItemTitle,
          "column_values": JSON.stringify({
            "person": {"personsAndTeams":[{"id": aTimeEntryAndMondayUser.matchingHarvestUserInMonday.id ,"kind":"person"}]},
            "date4": {"date": aTimeEntryAndMondayUser.timeTrackingItemDate},
            "numbers": aTimeEntryAndMondayUser.harvestUserHours,
            "notes75": aTimeEntryAndMondayUser.harvestUserNotes,
            "connect_boards5": {"changed_at":"2022-05-11T17:16:52.729Z","linkedPulseIds":[{"linkedPulseId": parseFloat(aTimeEntryAndMondayUser.justTrsId)}]}
          })
        });
        
        return aMondayTimeEntrySingularHours;

        }
      })

    } else {
      myFormattedTimeTrackingItems = arrayOfSumProjectTotals.map((aProjectAndTotalHours)=> {
        let mondayProjectHoursTotaled = JSON.stringify({
          
          "boardId": devMondayBoardID,
          "myItemName": aProjectAndTotalHours.timeTrackingItemTitle,
          "column_values": JSON.stringify({
            "numbers": aProjectAndTotalHours.totalHarvestUserHours,
            "connect_boards5": {"changed_at":"2022-05-11T17:16:52.729Z","linkedPulseIds":[{"linkedPulseId": parseFloat(aProjectAndTotalHours.justTrsId)}]}
          })
        });
        
        return mondayProjectHoursTotaled;

      })
    }

    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    console.log(myFormattedTimeTrackingItems, `<--- myFormattedTimeTrackingItems Count: ${myFormattedTimeTrackingItems.length - 1} ---`);

    async function loadAPIRequestsWithDelayTimer() {
      //Note: Send POST request with 1 second delay to avoid server timeout. Loop must be wrapped in a async function.
      for (var i = 0; i <= myFormattedTimeTrackingItems.length - 1; myFormattedTimeTrackingItems[i++]) {
        axios.post(mondayURL,
        {
          'query': query,
          'variables': myFormattedTimeTrackingItems[i]
        }, 
        {
          headers: {
            'Content-Type': `application/json`,
            'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
          },
        }
        )
        .then((response)=>{
          let serverResponse = response.data.errors? response.errors[0] : "Status: Success, Item Created."
          console.log(serverResponse);

          return response
        })
        .catch((error)=> {
          'There was an error in loadAPIRequestsWithDelayTimer(): ' + error
        })
        await timer(1000); // Note: Timeout set, execution halted, when timeout completes, restart.
      }

      //Note: Change output based on array being pushed to Monday.com
      arrayOfSingularProjectTimeEntries !== undefined? 
      console.log('=============== Creating Project Totals Complete! ================'):  
      console.log('=============== Creating Single Time Entries Complete! ================')
      return //Note: Break from sending requests.
    }
    loadAPIRequestsWithDelayTimer()

  },
})
