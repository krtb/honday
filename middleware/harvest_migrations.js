const axios = require('axios');
const _ = require('lodash');

const { parseCsvFileToData } = require('../utils/parseCSV.js');
const { avoidTimeout } = require('../utils/avoidTimeout.js');

/** Global Variables */
let mondayBoardID = process.env.MONDAY_DEV_BOARD_ID;
let arrayOfProjectTrsBoardObjects;
let timeEntryConditionNotSatisfied = [];
let harvestTimeEntriesAndMondayUser = [];
let projectsMissingMondayUser = [];
let validatedPSTimeEntries = [];
let entriesNotOnTRSBoard = [];

Object.assign(module.exports, {
  /**
   * Uses Utility Function parseCsvFileToData() to READ from a provided CSV file.
   * Then maps Harvest data according to requirements for Monday.com board.
   */
  mapCsvToData: async (req, res, next) =>{
    console.log("Read Harvest CSV, map and transform values.");
    {

      {
        const csvFilePath = './csvFiles/2022-07-01_harvest_time_export.csv'
        let allMyRecords = await parseCsvFileToData(csvFilePath)

        const arrayOfHarvestObjects = allMyRecords.map((aSingleRecord)=>{

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
  compareHarvestCSVAndProjectTRSBoard: async (req, res, next)=> {
    var arrayOfHarvestObjects = [...new Set(res.locals.arrayOfHarvestObjects)];; //Note: Set in mapCsvToData() function

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

      function findHarvestUserMondayId(allMondayUsersContainer, harvestUser) {
        const matchedUser = _.find(allMondayUsersContainer, (aSingleMondayUser)=>{
          let mondayUserEmailName = '';
          let harvestUserFirstLastNames = harvestUser.toLowerCase();
          let mondayEmailSplit = aSingleMondayUser.email.toLowerCase().split(/[.:@]/);

          if ( (mondayEmailSplit[1] === "pendo")) {
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

      arrayOfHarvestObjects.forEach((aHarvestObj)=>{
        formatMondayTimeTrackingObj(aHarvestObj)
      });

      let archivedMatt = harvestTimeEntriesAndMondayUser.filter((aTimeEntry)=> aTimeEntry.harvestUser === "Matthew Kerbawy" );
      let archivedMike = harvestTimeEntriesAndMondayUser.filter((aTimeEntry)=> aTimeEntry.harvestUser === "Mike Fotinatos" );
      let allMattAndMikeArchivedProjects = [...archivedMatt, ...archivedMike]

      let duplicatesRemoved = [...new Set(allMattAndMikeArchivedProjects)];
      
      res.locals.harvestTimeEntriesAndMondayUser = duplicatesRemoved
      
      console.log(`${duplicatesRemoved.length} cleaned items ready to be sent to Monday.`);
      next()
    }
  },
  postMondayItems: async (req, res, next)=> {    
    let arrayOfSingularProjectTimeEntries = res.locals.harvestTimeEntriesAndMondayUser;
    
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

    if (arrayOfSingularProjectTimeEntries !== undefined) {
      
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

    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    console.log(`myFormattedTimeTrackingItems Count: ${myFormattedTimeTrackingItems.length - 1} <---`);
    
    async function loadAPIRequestsWithDelayTimer() {
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
            console.log(returnedMondayItem, "Status: Success, Item Created.");
            next()
          })
          .catch((error)=> {

            if( error.response ){
              console.log(error.response.data);
              console.log('There was an error in loadAPIRequestsWithDelayTimer(): ' + error);
            }

          })
          await timer(1000);
      }
      return
    }
    loadAPIRequestsWithDelayTimer()

  },

})
