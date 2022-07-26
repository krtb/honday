const axios = require('axios')
const _ = require('lodash');

/** Global Variables */
let mondayBoardID = process.env.MONDAY_DEV_BOARD_ID;
let arrayOfProjectTrsBoardObjects;
let timeEntryConditionNotSatisfied = [];
let harvestTimeEntriesAndMondayUser = [];
let projectsMissingMondayUser = [];
let validatedPSTimeEntries = [];
let entriesNotOnTRSBoard = [];
let mondayBoardItemIds = [];

/** Axios */
const axiosURL = "https://api.monday.com/v2";
const axiosConfig = {
  headers: {
    'Content-Type': `application/json`,
    'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
  },
};

Object.assign(module.exports, {
  /**
   * READ Items and Column Values from Monday.com board.
   * @async
   * @function next From Express Router, allows Server to move on to next route.
   */
  itemsColumnValuesData: async (req, res, next) =>{
    {
      let query = `{
        boards (ids: ${mondayBoardID}) {
          items {
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
      await axios.post(axiosURL,{query}, axiosConfig)
      .then((response)=>{
        if (response.data.data.boards) {
          console.log(response.data.data.boards[0])
          console.log(`READ items and item columns.`);
        } else {
          console.error('malformed_query')
          console.error(response.data.errors)
        }
      })
      .catch((err)=>{
        console.error('server_response')
        console.error(err, `status_code: ${res.statusCode}`);
      });
      next();
    }
  },
  /**
   * READ Board, Owner and Columns from Monday.com board.
   * @async
   * @function next From Express Router, allows Server to move on to next route.
   */
  boardOwnerColumnData: async (req, res, next)=>{
    {
      let query = `{
        boards (ids: ${mondayBoardID}) {
          name
          state
          board_folder_id
          owners {
            id
          }
          columns {
            title
            type
          }
        }
      }`;
      await axios.post(axiosURL,{query}, axiosConfig)
      .then((response)=>{
        if (response.data.data.boards) {
          let boardInfo = response.data.data.boards;
          let ownerInfo = response.data.data.boards[0]["owners"];
          let columnInfo = response.data.data.boards[0]["columns"];

          console.log(boardInfo, ownerInfo, columnInfo);
          console.log("READ boardInfo, ownerInfo, and columnInfo.");
        } else {
          console.error('malformed_query')
          console.error(response.data.errors)
        }
      })
      .catch((err)=> {
        console.error('server_response')
        console.error(err, `status_code: ${res.statusCode}`);
      })
      next();
    }
  },
  deleteBoardItems: async (req, res, next)=>{
    console.log('Starting deletion of Monday.com board items.');

    {
      const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

      async function loadAPIRequestsWithDelayTimer() {
        //Note: Send POST request with 1 second delay to avoid server timeout. Loop must be wrapped in a async function.
        for (var i = 0; i <= mondayBoardItemIds.length - 1; mondayBoardItemIds[i++]) {
          console.log(`Deleting board item ${i} of ${mondayBoardItemIds.length - 1}`);

          let query = `mutation { delete_item (item_id: ${mondayBoardItemIds[i].id}) { id }}`;

          axios.post("https://api.monday.com/v2",
          {
            'query': query,
            'variables': mondayBoardItemIds[i]
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
      // Note: The `stream/promises` module only works on Node.js => version 16^
      const { finished } = require('stream/promises'); 
      const onlyCurrentHarvestProjects = './csvFiles/2022-07-01_harvest_time_export.csv'
      const stream = fs.createReadStream(onlyCurrentHarvestProjects);
      const parser = stream.pipe(parse({ delimiter: ',', columns: true,}));
      const records = await [];

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
        const arrayOfHarvestObjects = await allMyRecords.map((aSingleRecord)=>{

          if(aSingleRecord.Date >= '2022-02-01' && aSingleRecord.Date <= '2022-04-30'){

            const singleaHarvestObject = {
              Date: aSingleRecord.Date,
              Client: aSingleRecord.Client,
              Project: aSingleRecord.Project,
              ProjectCode: aSingleRecord['Project Code'],
              Task: aSingleRecord.Task,
              Notes: aSingleRecord.Notes,
              Hours: aSingleRecord.Hours,
              HoursRounded: aSingleRecord['Hours Rounded'],
              Billable: aSingleRecord['Billable?'],
              Invoiced: aSingleRecord['Invoiced?'],
              Approved: aSingleRecord['Approved?'],
              FirstNam: aSingleRecord['First Name'],
              LastName: aSingleRecord['Last Name'],
              Roles: aSingleRecord.Roles,
              Employee: aSingleRecord['Employee?'],
              BillableRate: aSingleRecord['Billable Rate'],
              BillableAmount: aSingleRecord['Billable Amount'],
              CostRate: aSingleRecord['Cost Rate'],
              CostAmount: aSingleRecord['Cost Amount'],
              Currency: aSingleRecord.Currency,
              ExternalReferenceURL: aSingleRecord['External Reference URL'],
            }

            validatedPSTimeEntries.push(singleaHarvestObject)

          } else {

            timeEntryConditionNotSatisfied.push(aSingleRecord)

          }

        });

        res.locals.arrayOfHarvestObjects = validatedPSTimeEntries;

        console.log(`Completed parsing of ${arrayOfHarvestObjects.length} line items from CSV file.`);
      }
      next();
    }
  },
  getUserFromMonday: async (req, res, next) => {
    //Note: Monday.com User IDs required to create related User in Monday.com.
    console.log('Getting all Monday.com User emails and ids.');

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
      console.log(`${allMondayUsersContainer.length - 1} Monday.com Users collected.`)

      next()
    }
  },
  getProjectTRSBoardProjectData: async (req, res, next)=>{
    //Note: Required in order to create Linked Items via their IDs.
    console.log("Pulling Board A project items, to match against CSV IDs of: Harvest PS Codes.");

    {
      const projectTrsBoard = 2495489300;
      
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

      //Note: Utility functions --->
      const projectTRSBoardObjectsCollection = []
      function collectBoardAColumnNameAndIDItems(boardAItems) {
          const projectTrsItemsNameIdColumnObjects = boardAItems
          projectTrsItemsNameIdColumnObjects.map((boardAItem)=>{
            projectTRSBoardObjectsCollection.push(boardAItem)
          })
      }
  
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
        let itemsFromResponse = response.data.data.boards[0].items
        
        collectBoardAColumnNameAndIDItems(itemsFromResponse)
        arrayOfProjectTrsBoardObjects = itemsFromResponse

      })
      .catch((error)=>{
        console.log('Here is my error:' + error, 'error');
      })

      console.log(`${arrayOfProjectTrsBoardObjects.length - 1}` + ` board A Items Collected from: ProjectTrsBoard`)
      next()
    }
  },
  compareHarvestCSVAndProjectTRSBoard: async (req, res, next)=> {
    var arrayOfHarvestObjects = [...new Set(res.locals.arrayOfHarvestObjects)];; //Note: Set in parseCSV() function

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
          let psCodeColumnObject = mondayTrsItem.column_values[1].value; //TODO: check that this is correct

          if (psCodeColumnObject === null || psCodeColumnObject === undefined) {
            timeEntryConditionNotSatisfied.push(mondayTrsItem.id)
          } else if(removeQuotedString(psCodeColumnObject) === harvestPsCode) {

            let myMondayHarvest = {
              oneHarvestItem,
              mondayTrsItem
            }

            return myMondayHarvest

          } else {
            timeEntryConditionNotSatisfied.push(mondayTrsItem.id)
          }
        })
        return foundID
      }

      //Note: Matches Harvest User with Monday User ID
      function findHarvestUserMondayId(allMondayUsersContainer, harvestUser) {
        const matchedUser = _.find(allMondayUsersContainer, (aSingleMondayUser)=>{
          let mondayUserEmailName = '';
          let harvestUserFirstLastNames = harvestUser.toLowerCase();
          let mondayEmailSplit = aSingleMondayUser.email.toLowerCase().split(/[.:@]/);

          if ( (mondayEmailSplit[1] === "pendo")) {
            // TODO: Note - matt and mike qualify here, but do not have there names changes.
            let mondayLastName =  aSingleMondayUser.name.split(' ')[1].toLowerCase();
            let harvestLastName = harvestUser.split(' ')[1].toLowerCase()

            
            if((mondayLastName === harvestLastName)){
              return aSingleMondayUser
            } 
            
          } else if (harvestUserFirstLastNames === "joshua kent"){
            harvestUserFirstLastNames = "josh kent"
            mondayUserEmailName = mondayEmailSplit.slice(0,2).join(' ')

            if((mondayUserEmailName === harvestUserFirstLastNames)){
              return aSingleMondayUser
            }

          } else if (harvestUserFirstLastNames === "austin devere-board"){
            harvestUserFirstLastNames = "austin devereboard"
            mondayUserEmailName = mondayEmailSplit.slice(0,2).join(' ')

            if((mondayUserEmailName === harvestUserFirstLastNames)){
              return aSingleMondayUser
            }
          } else {
            mondayUserEmailName = mondayEmailSplit.slice(0,2).join(' ')
            
            if((mondayUserEmailName === harvestUserFirstLastNames)){
              
              
              return aSingleMondayUser
            }

          }

        })


        return matchedUser
      }
    }

    {
      //Note: formatMondayTimeTrackingObj() function main worker, map() below loops through all Harvest Time Entries.
      function formatMondayTimeTrackingObj(aHarvestObj) {
        let onlyHarvestFirstname
        function checkForMiddleName(aHarvestFirstName) {
          
          let onlyHarvestFirstname

          if(aHarvestFirstName.split(' ').length > 1){
            onlyHarvestFirstname = aHarvestFirstName.split(' ')[0]
            
            return onlyHarvestFirstname

          } else {

            return aHarvestFirstName
          }
        }

        const harvestUser = `${checkForMiddleName(aHarvestObj.FirstName)} ${aHarvestObj.LastName}`;
        const timeTrackingItemTitle = `${aHarvestObj.FirstName} ${aHarvestObj.LastName} - ${aHarvestObj.ProjectCode} - ${aHarvestObj.Client} - ${aHarvestObj.Project} - ${aHarvestObj.Task}`;
        const timeTrackingItemDate = aHarvestObj.Date;

        const allMondayUsersContainer = res.locals.allMondayUsersContainer;
        
        let matchingHarvestUserInMonday = findHarvestUserMondayId(allMondayUsersContainer, harvestUser);
        let trsBoardObjectMatched = matchTrsItem(aHarvestObj)
        
        const harvestUserHours = aHarvestObj.Hours;
        const hoursApprovedBoolean = aHarvestObj.Approved;
        let hoursApprovalCheckerHours =  hoursApprovedBoolean === "No"? 0 : harvestUserHours;
        const harvestUserNotes = aHarvestObj.Notes;
        const projectCode = aHarvestObj.ProjectCode;

        {
          let timeEntryWithMatchedMondayUser
          let justTrsId

          if ((trsBoardObjectMatched !== undefined && matchingHarvestUserInMonday !== undefined)) {
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

          } else if ((trsBoardObjectMatched !== undefined && matchingHarvestUserInMonday === undefined)) {
            
            projectsMissingMondayUser.push(aHarvestObj)
          }
          else {
            entriesNotOnTRSBoard.push(aHarvestObj)
          }
        }
      }

      //Note: Set in parseCSV() function.
      arrayOfHarvestObjects.forEach((aHarvestObj)=>{
        formatMondayTimeTrackingObj(aHarvestObj)
      });

      let archivedMatt = harvestTimeEntriesAndMondayUser.filter((aTimeEntry)=> aTimeEntry.harvestUser === "Matthew Kerbawy" );
      let archivedMike = harvestTimeEntriesAndMondayUser.filter((aTimeEntry)=> aTimeEntry.harvestUser === "Mike Fotinatos" );
      let allMattAndMikeArchivedProjects = [...archivedMatt, ...archivedMike]

      // onlyArchivedProjects = allMattAndMikeArchivedProjects.filter(aTimeEntry=>{
      //   let myFoundArchivedProject

      //   if ((aTimeEntry.projectCode !== undefined || null)) {

      //     myFoundArchivedProject = onlyArchivedPsCodesArray.archived.find((anArchivedPsCode)=> aTimeEntry.projectCode === anArchivedPsCode)
      //     return myFoundArchivedProject

      //   }

      // })

      let duplicatesRemoved = [...new Set(allMattAndMikeArchivedProjects)];
      
      res.locals.harvestTimeEntriesAndMondayUser = duplicatesRemoved

      
      // harvestTimeEntriesAndMondayUser;      
      console.log(`${duplicatesRemoved.length} cleaned items ready to be sent to Monday.`);
      next()
    }
  },
  // sumLastFiscalYear: async (res,req,next)=>{
  //   // Note: Pulls out all time entries from FY2021/June 31st, 2021 into an array.
  //   const timeEntriesFY2021 = [];
  //   harvestTimeEntriesAndMondayUser.map((aHarvestTimeEntry)=>{
  //     if(aHarvestTimeEntry.timeTrackingItemDate <= '2022-01-31'){        
  //       timeEntriesFY2021.push(aHarvestTimeEntry)
  //     }else{
  //       fy2023Q1April.push(aHarvestTimeEntry)
  //     }
  //   })

  //   timeEntriesFY2021.map(function (fy2021TimeEntry){
  //     let projectHoursTotaled = projectsWithTotalHours.find(existingItem => existingItem.justTrsId == fy2021TimeEntry.justTrsId);

  //     function utilInsertPSCode(fy2021TimeEntry, itemObject) {
  //       let getArrayOfTitle = fy2021TimeEntry.timeTrackingItemTitle.split('-')
  //       getArrayOfTitle.splice(2,0, `${fy2021TimeEntry.projectCode}`);
  //       itemObject.timeTrackingItemTitle = getArrayOfTitle.join(' - ')

  //       return itemObject.timeTrackingItemTitle
  //     }

  //     function utilUpdateProjectObject(originalItemObject, newItemObject){
  //       originalItemObject.justTrsId = newItemObject.justTrsId;
  //       originalItemObject.timeTrackingItemTitle = utilInsertPSCode(newItemObject, originalItemObject)
  //       originalItemObject.totalHarvestUserHours = newItemObject.harvestUserHours

  //       return originalItemObject
  //     }

  //     if (projectHoursTotaled !== undefined) {
  //       //Note: Replaces original project user hours, with most recent summed valued.
  //       let currentTotalHoursForProject = parseFloat(projectHoursTotaled.totalHarvestUserHours);
  //       let newHoursFromSimilarProject = parseFloat(fy2021TimeEntry.harvestUserHours);
  //       let totalNewHoursToAdd = (currentTotalHoursForProject + newHoursFromSimilarProject).toString();

  //       projectHoursTotaled = utilUpdateProjectObject(projectHoursTotaled, fy2021TimeEntry)
  //       projectHoursTotaled.totalHarvestUserHours = totalNewHoursToAdd;

  //       console.log('Project hours compiled.');
  //     } else {
  //       let newObject = {};

  //       newObject = utilUpdateProjectObject(newObject, fy2021TimeEntry);
  //       projectsWithTotalHours.push(newObject)

  //       console.log('New project added to array that did not exist previously.');
  //     }
  //   });

  //   projectsWithTotalHours // Note: Contains array of unqiue projects, with their totalUserHours compiled.
  // },
  postMondayItems: async (req, res, next)=> {    
    let arrayOfSingularProjectTimeEntries = res.locals.harvestTimeEntriesAndMondayUser; //Note: uncomment variable when required - harvestTimeEntriesAndMondayUser
    // let arrayOfSumProjectTotals = undefined; //Note: uncomment variable when required - projectsWithTotalHours
    
    let myFormattedTimeTrackingItems

    const mondayURL= "https://api.monday.com/v2";
    const mondayBoardID = 2635507777;

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
      
      // TODO: Every time this is true, add onto array REMOVE ELSE STATEMENT DOES NOT BREAK.
      myFormattedTimeTrackingItems = arrayOfSingularProjectTimeEntries.map((aTimeEntryAndMondayUser)=> {

        if(aTimeEntryAndMondayUser.matchingHarvestUserInMonday){       

        let aMondayTimeEntrySingularHours = JSON.stringify({

          "boardId": mondayBoardID,
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
    
    } 
    
    // else {
    //   myFormattedTimeTrackingItems = arrayOfSumProjectTotals.map((aProjectAndTotalHours)=> {
    //     let mondayProjectHoursTotaled = JSON.stringify({
          
    //       "boardId": mondayBoardID,
    //       "myItemName": aProjectAndTotalHours.timeTrackingItemTitle,
    //       "column_values": JSON.stringify({
    //         "numbers": aProjectAndTotalHours.totalHarvestUserHours,
    //         "connect_boards5": {"changed_at":"2022-05-11T17:16:52.729Z","linkedPulseIds":[{"linkedPulseId": parseFloat(aProjectAndTotalHours.justTrsId)}]}
    //       })
    //     });
        
    //     return mondayProjectHoursTotaled;

    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    console.log(`myFormattedTimeTrackingItems Count: ${myFormattedTimeTrackingItems.length - 1} <---`);
    
    async function loadAPIRequestsWithDelayTimer() {
      //Note: Send POST request with 1 second delay to avoid server timeout. Loop must be wrapped in a async function.
      for (var i = 0; i <= myFormattedTimeTrackingItems.length - 1; i++) {
        console.log(`Currently on item ${i} of  ${myFormattedTimeTrackingItems.length - 1}`)
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
            let returnedMondayItem = response.data.data.create_item
            console.log(returnedMondayItem, "Status: Success, Item Created."); //TODO: removed response.
            next()
          })
          .catch((error)=> {

            if( error.response ){
              console.log(error.response.data); // => the response payload
              console.log('There was an error in loadAPIRequestsWithDelayTimer(): ' + error);
            }

          })
          await timer(1000); // Note: Timeout set, execution halted, when timeout completes, restart.
      }
      return //break just in case
    }
    loadAPIRequestsWithDelayTimer()
    
  },
  // getReverseTableIdsToLink: async(req, res, next)=>{
  //   //Note: Required in order to create Linked Items via their IDs.
  //   console.log("===> Pulling Monday.com items id. <====");

  //   {
  //     const projectTimeEntriesBoads = 2635507777;

  //     let query = `{
  //       boards (ids: ${projectTimeEntriesBoads}) {
  //         items {
  //           id
  //           name
  //           column_values {
  //             id
  //             title
  //             value
  //           }
  //         }
  //       }
  //     }`;

  //     await axios.post("https://api.monday.com/v2",
  //     {
  //       'query': query,
  //     },
  //     {
  //       headers: {
  //         'Content-Type': `application/json`,
  //         'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
  //       },
  //     })
  //     .then((response)=>{
  //       timeEntryBoardItemColumnIds = response.data.data.boards[0].items;
  //       next();
  //     })
  //     .catch((error)=> {
  //       'There was an error in loadAPIRequestsWithDelayTimer(): ' + error
  //     })

  //   }
  // },
  // getReverTableProjects: async(req, res, next)=>{
  //   //Note: Required in order to create Linked Items via their IDs.
  //   console.log("===> Pulling Monday.com items id. <====");

  //   {
  //     const projectTRSBoard = 2867792547;

  //     let query = `{
  //       boards (ids: ${projectTRSBoard}) {
  //         items {
  //           id
  //           name
  //           column_values {
  //             id
  //             title
  //             value
  //           }
  //         }
  //       }
  //     }`;

  //     await axios.post("https://api.monday.com/v2",
  //     {
  //       'query': query,
  //     },
  //     {
  //       headers: {
  //         'Content-Type': `application/json`,
  //         'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
  //       },
  //     })
  //     .then((response)=>{
  //       mondayBoardToItemsToReverseLinkTo = response.data.data.boards[0].items;
  //       next();
  //     })
  //     .catch((error)=> {
  //       'There was an error in loadAPIRequestsWithDelayTimer(): ' + error
  //     })

  //   }
  // },
  // reverseLinkMondayItems: async (res, req, next) =>{

  //   let myFormattedTimeTrackingItems  = timeEntryBoardItemColumnIds
  //   let test1 = mondayBoardToItemsToReverseLinkTo
  //   let reverseItemsToLinkTo = [];
  //   let query = '';
  //   let projectWithNewPulseIdToLink = '';
    
  //   // Note: Maps through ids from project trs board

  //   // TODO: IF there is a match on pscode of project, then add on to pulse id array
  //   //TODO: Need to have an array of ProjectTRS project codes, 
  //   // let firsParseRound = JSON.parse(existingItem);
  //   // let secondParseRound = JSON.parse(firsParseRound.column_values)['link_to_time_reporting'].linkedPulseIds[index - 1].linkedPulseId;
  //   // secondParseRound !== parseInt(timeEntryBoardItem.id)
  //   timeEntryBoardItemColumnIds.map((timeEntryBoardItem, index)=>{
  //     let myCounter = timeEntryBoardItem[index]
  //     let myFinalItem
  //     // timeEntryBoardItem = TimeTracking Item that has it's id, and column id
  //     //TODO: Every time you map, check if an item has the same ProjectTRS code, as a ProjectTRS item. 
  //     projectWithNewPulseIdToLink = reverseItemsToLinkTo.find((aTrsProject, index) =>{
        
  //       let linkedPulseIdColumn = timeEntryBoardItem.column_values[4].value
  //       let timeEntryProjectTrsLinkedMondayId = JSON.parse(linkedPulseIdColumn).linkedPulseIds[0].linkedPulseId
        
  //       let aTrsProjectIdNumber = parseInt(aTrsProject.id);

  //       if(aTrsProjectIdNumber == timeEntryProjectTrsLinkedMondayId){
  //         myFinalItem = timeEntryProjectTrsLinkedMondayId
  //       } else {

  //         myFinalItem = mondayBoardToItemsToReverseLinkTo[mondayBoardToItemsToReverseLinkTo.length - 1]
  //         return myFinalItem
  //       }

  //     });

      
  //   //TODO: pull board item id and column id of board to be updated
  //   // link_to_duplicate_of_time_tracking_for_harvest_import8
  //   // link_to_duplicate_of_time_tracking_for_harvest_import2
  //   // "value": "{\"linkedPulseIds\":[{\"linkedPulseId\":<item_id_to_be_connected>}]}"

  //   // timeEntryBoardItemColumnIds[38] - item with Nick added to the duplicate

  //   //id: "link_to_time_reporting"
  //   // title: "Duplicate of Time Tracking for Harvest Import"
  //   // value: "{\"changed_at\":\"2022-06-15T18:26:48.773Z\",\"linkedPulseIds\":[{\"linkedPulseId\":2793992229}]}"

  //     if (projectWithNewPulseIdToLink !== undefined) {

        
  //       // Note: Will add a LinkPulseId to an a project item's linked column.
  //       //linkedPulseIds":[{"linkedPulseId":2495489846},{"linkedPulseId":2552643474}]}'}

  //       // query = "mutation { change_column_value (board_id: 1156871139, item_id: 1156871143, column_id: \"status\", value: \"{\\\"label\\\":\\\"Stuck\\\"}\") {id}}";

  //       // "value": "{\"linkedPulseIds\":[{\"linkedPulseId\":<item_id_to_be_connected>}]}"
  //       // query = "mutation { change_column_value( item_id:11111, board_id:22222, column_values: \"{\"linkedPulseIds\": {\"linkedPulseId\" : `${TODO: adTheItemIdHereIteratively}`]}}\") {id}}";
  //       // TODO: Update array only

  //       let query = `mutation ( 
  //         $boardId: Int!,
  //         $itemId: Int!,
  //         $column_values: JSON!
  //       ){
  //         change_multiple_column_values(
  //         board_id: $boardId,
  //         item_id: $itemId,
  //         create_labels_if_missing: true,
  //         column_values: $column_values
  //       )
  //       {id}
  //       }`;

  //       let addNewObject = {"linkedPulseId": parseFloat(projectWithNewPulseIdToLink.id)}
        
  //       //TODO: if linkpulseids already has an id, add on to it without overwriting the original sets of objects
  //       let arrayWithAdditionalLinkedPulseId = JSON.stringify({
  //         "column_values": JSON.stringify({
  //           "link_to_time_reporting": {"changed_at":"2022-05-11T17:16:52.729Z", "linkedPulseIds":[{"linkedPulseId": parseFloat(projectWithNewPulseIdToLink.id)}]}
  //         })
  //       });


  //     } else {
  //       // Create
        
        
  //       reverseItemsToLinkTo.push(mondayBoardToItemsToReverseLinkTo[mondayBoardToItemsToReverseLinkTo.length - 1 ])
  //       // let query = `mutation ( 
  //       //   $boardId: Int!,
  //       //   $itemId: Int!,
  //       //   $column_values: JSON!
  //       // ){
  //       //   change_multiple_column_values(
  //       //   board_id: $boardId,
  //       //   item_id: $itemId,
  //       //   create_labels_if_missing: true,
  //       //   column_values: $column_values
  //       // )
  //       // {id}
  //       // }`;
        
  //       // 
  //       // //TODO: if linkpulseids already has an id, add on to it without overwriting the original sets of objects
  //       // let firstLinkedPulseId = JSON.stringify({
          
  //       //   "boardId": 2495489300,
  //       //   "item_id": parseInt(projectWithNewPulseIdToLink.item_id),
  //       //   "column_values": JSON.stringify({
  //       //     "link_to_time_reporting": {"changed_at":"2022-05-11T17:16:52.729Z", "linkedPulseIds":[{"linkedPulseId": parseFloat(timeEntryBoardItem.id)}]}
  //       //   })
  //       // });

  //       // projectTrsItemsWithLinkedPulseIds.push(firstLinkedPulseId)

  //     }
  //   })

  //   const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
  //   console.log(myFormattedTimeTrackingItems, `<--- myFormattedTimeTrackingItems Count: ${myFormattedTimeTrackingItems.length - 1} ---`);

  //   async function loadAPIRequestsWithDelayTimer() {
  //     //Note: Send POST request with 1 second delay to avoid server timeout. Loop must be wrapped in a async function.
  //     for (var i = 0; i <= myFormattedTimeTrackingItems.length - 1; myFormattedTimeTrackingItems[i++]) {
  //       axios.post(mondayURL,
  //       {
  //         'query': query,
  //         'variables': myFormattedTimeTrackingItems[i]
  //       }, 
  //       {
  //         headers: {
  //           'Content-Type': `application/json`,
  //           'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
  //         },
  //       }
  //       )
  //       .then((response)=>{
  //         let serverResponse = response.data.errors? response.errors[0] : "Status: Success, Item Created."
  //         console.log(serverResponse);

  //         return response
  //       })
  //       .catch((error)=> {
  //         'There was an error in loadAPIRequestsWithDelayTimer(): ' + error
  //       })
  //       await timer(1000); // Note: Timeout set, execution halted, when timeout completes, restart.
  //     }
  //     console.log('=============== Creating Single Time Entries Complete! ================')
  //     return
  //     //Note: Change output based on array being pushed to Monday.com
  //     // arrayOfSingularProjectTimeEntries !== undefined? 
  //     // console.log('=============== Creating Project Totals Complete! ================'):  
  //     // console.log('=============== Creating Single Time Entries Complete! ================')
  //     //Note: Break from sending requests.
  //   }
  //   loadAPIRequestsWithDelayTimer()

  // }


})
