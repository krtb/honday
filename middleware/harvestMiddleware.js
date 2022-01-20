/* HTTP CLIENT */ 
const axios = require('axios');

/*  HARVEST CREDENTIALS */
const HARVEST_ACCOUNT_ID = process.env.HARVEST_ACCOUNT_ID;
const HARVEST_ACCESS_TOKEN = process.env.HARVEST_ACCESS_TOKEN;

/* HARVEST ENDPOINTS */
const getProjectsEndpoint = `/v2/projects`;
const getAllAssignedTasksEndpoint = `/v2/task_assignments`;
const getAllUserAssignmentsEndpoint =  `/v2/user_assignments`;
const getSingleProjectEndpoint = `/v2/projects/`;
const getTimeEntriesEndpoint = `/v2/time_entries`;

/* HARVEST API URL CONSTRUCTION */
const getProjectsFromHarvestUrl = process.env.HARVEST_URL + getProjectsEndpoint;
const getAaEmailAndIdFromMondayFromHarvestUrl = process.env.HARVEST_URL + getTimeEntriesEndpoint;
const getAllAssignedTasksFromHarvestUrl = process.env.HARVEST_URL + getAllAssignedTasksEndpoint;
const getASingleProjectFromHarvestUrl = process.env.HARVEST_URL + getSingleProjectEndpoint;
const getProjectUserAssignmentsUrl = process.env.HARVEST_URL + getAllUserAssignmentsEndpoint;

/* GLOBAL VARIABLES & UTILS */
const currentProjectID = Number(process.env.DEV_HARVEST_PROJECT_ID);
const arrayOfProjectIds = currentProjectID;
const axiosConfigObject = {
  // TODO: Add UserAgent attribute required by harvest, review if axios sending by default
  headers: {
    "Authorization": "Bearer " + HARVEST_ACCESS_TOKEN,
    "Harvest-Account-ID": HARVEST_ACCOUNT_ID 
  }
}

module.exports = {
  getAllTimeEntries: async (req,res,next) => {
    console.log('HondayBot searching for Time Entries...');
    // set a counter
    let startPage = 1;
    // create empty array where we want to store the userAssignments objects for each loop
    let filteredTimeEntryObjectsBySpecificProjectCode = []
    // create a lastResult array which is going to be used to check if there is a next page
    let lastResult = [];
    let pageCount = 1

    // Returns a Promise that resolves after Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))

    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
      let paginationUrl = `https://api.harvestapp.com/v2/time_entries?page=${startPage}&per_page=100&ref=next&is_active=true&updated_since=2021-09-01T12:00:22Z`

      // Initial Total Page Count
      let totalPageCount = 0;
      let arrayOfTimeEntryObjects = ''

      // Dynamically call TimeEntries from Harvestm, with API pagination
      await axios.get(paginationUrl, axiosConfigObject)
        .then((resp)=> {
          // TODO: Get total number of pages from data, display in console log
          let data = resp.data
          // Currently 112
          totalPageCount = data.total_pages
          // 100 per GET Request
          arrayOfTimeEntryObjects = data[Object.keys(data)[0]]
      })
      
      for (let pageCount = 1; pageCount <= totalPageCount; pageCount++) {
        paginationUrl = `https://api.harvestapp.com/v2/time_entries?page=${pageCount}&per_page=100&ref=next&is_active=true&updated_since=2021-09-01T12:00:22Z`
        // console.log('Page Count inside function: ' + pageCount, 'Total Page Count: ' +  totalPageCount);

        axios.get(paginationUrl, axiosConfigObject)
        .then((response)=>{
          arrayOfTimeEntryObjects = response.data.time_entries

          var filter = {
            first: 'PS-12222',
            second: 'PS-11514',
            third: 'PS-004513',
            fourth: 'PS-004298',
            fith: 'PS-004575',
          };

          
          arrayOfTimeEntryObjects.map((item) => {
            Object.values(filter).map((specifiedProjectCode)=>{
              if(specifiedProjectCode === item.project.code){
                filteredTimeEntryObjectsBySpecificProjectCode.push(item);
              }
            })

          });

        })
        .catch((error)=> 'There was an error here: ' + error)

        // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
        await timer(1000); // Then the created Promise can be awaited
        // Finally the timeout completes & execution continues at this point. 
        console.log(
        `On Page: ${pageCount}` + ` of ${totalPageCount}` + ' -',
        'TimeEntries Stored Total: ' + filteredTimeEntryObjectsBySpecificProjectCode.length,
        );
      }

      console.log(filteredTimeEntryObjectsBySpecificProjectCode, '============== FILTERING OF TIME ENTRIES DONE ==============');
      res.locals.filteredTimeEntryObjectsBySpecificProjectCode = filteredTimeEntryObjectsBySpecificProjectCode
      return next()
    }

    loadAPIRequestsWithDelayTimer()
    // End of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<
  },
  buildTimeEntriesForMondayBoard: async (req, res, next) => {
    console.log('============================================= buildTimeEntriesForMondayBoard function started =============================================');
    // Pull stored UserProjectAssignment Objects
    let allHarvestTimeEntries = await res.locals.filteredTimeEntryObjectsBySpecificProjectCode
    
    filteredTimeEntryObjectsForMonday = allHarvestTimeEntries.map((oneTimeEntry)=>{
      // Filter out required information, to communicate with Monday.com
      const mondayTimeEntry = {
        timeEntryId: oneTimeEntry.id,
        submitterId: oneTimeEntry.user.id,
        submitter: oneTimeEntry.user.name,
        email: '',
        mondayId: 0,
        billableBoolean: oneTimeEntry.billable,
        dateSubmitted: oneTimeEntry.spent_date,
        hoursSubmitted: oneTimeEntry.hours,
        client: oneTimeEntry.client.name,
        projectName: oneTimeEntry.project.name,
        projectCode: oneTimeEntry.project.code,
        projectNotes: oneTimeEntry.notes,
        task: oneTimeEntry.task.name,
      }

      return mondayTimeEntry
    })


    // Store locally
    res.locals.filteredTimeEntryObjectsForMonday = filteredTimeEntryObjectsForMonday
    console.log(' ======= filteredUserProjectArrays middleware complete ==========', filteredTimeEntryObjectsForMonday.length);
    return next()

    //TODO: Move this date object to a part of the app where it can be better used
    // // Create date time object
    // let dateOfToday = new Date();

    // // Transform into ISO format, like this => 2022-01-04
    // let todaysDateIsoUtcTimezone = await function ISODateString(datOfToday) {
    //   function pad(n) {return n<10 ? '0'+n : n}
    //   return datOfToday.getUTCFullYear()+'-'
    //       + pad(datOfToday.getUTCMonth()+1)+'-'
    //       + pad(datOfToday.getUTCDate())
    // }(dateOfToday)
  },
  addEmailAndIdToTimeEntry: async (req, res, next) => {
    // Users{} from Monday.com, contain Email and Id properties 
    // TimeEntries{} from Harvest, contain properties formatted in a previous function - thus unique names
    let filteredTimeEntryObjectsForMonday = res.locals.filteredTimeEntryObjectsForMonday
    // Creates array of only Harvest User Ids, required to request specific Users, to then pull email values
    let harvestTimeEntrySubmitterIds = filteredTimeEntryObjectsForMonday.map((singleTimeEntry)=> {
      return singleTimeEntry.submitterId
    })

    // Start of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<
    // Returns a Promise that resolves after "ms" Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    // Function below will push values to this Array[]
    let harvestUserIdNameEmail = [];

    console.log('Your Harvest collection of User IDs is this long: ' + harvestTimeEntrySubmitterIds.length );

    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
        
      for (var i = 0; i <= harvestTimeEntrySubmitterIds.length - 1; harvestTimeEntrySubmitterIds[i++]) {
        // Injects Specified User Ids into URL, to request their User Profiles
        let paginationUrl = `https://api.harvestapp.com/v2/users/${harvestTimeEntrySubmitterIds[i]}`

        console.log(`Currently on User Profile Number: ${i} of ${harvestTimeEntrySubmitterIds.length - 1}`);

        // Send GET request to specific URL Endpoint, dynamically defined above
        axios.get(paginationUrl, axiosConfigObject)
        .then((mySpecificHarvestUser)=>{
  
          mySpecificHarvestUser.data

          filertedHarvestUserData = {
            id: mySpecificHarvestUser.data.id,
            first_name: mySpecificHarvestUser.data.first_name,
            last_name: mySpecificHarvestUser.data.last_name,
            email: mySpecificHarvestUser.data.email
          }

          harvestUserIdNameEmail.push(filertedHarvestUserData)            
        })

        // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
        await timer(1000); // Then the created Promise can be awaited
        // Finally the timeout completes & execution continues at this point. 
      }

      let mondayUserEmailIdObjects = res.locals.allMondayUsersContainer
      let holdMeTimeEntriesWithEmail = [];
      filteredTimeEntryObjectsForMonday.map((singleTimeEntry)=>{

        harvestUserIdNameEmail.map((singleHarvestUser)=>{

          if (singleHarvestUser.id === singleTimeEntry.submitterId){
            singleTimeEntry.email = singleHarvestUser.email;
            holdMeTimeEntriesWithEmail.push(singleTimeEntry);
          }

        })

      })

      let uniqueTimeEntries = [];
      holdMeTimeEntriesWithEmail.filter(function(o1){
        let i = uniqueTimeEntries.findIndex(x => (x.timeEntryId === o1.timeEntryId));
        if(i <= -1){
          uniqueTimeEntries.push(o1);
        }
        return null;
      });


      let TimeEntriesWithEmailAndMondayID = uniqueTimeEntries.filter(o1 => mondayUserEmailIdObjects.some(o2 => o1.email === o2.email? o1.mondayId = o2.id : null));

      res.locals.filteredTimeEntryObjectsForMondayWithUserEmail = TimeEntriesWithEmailAndMondayID
      console.log(`==================================== ${TimeEntriesWithEmailAndMondayID.length} Time Entries Updated ! ====================================`);
      //TODO: Maybe return here?
      next()
    }
    loadAPIRequestsWithDelayTimer();
    // End of logic for loadAPIRequestsWithDelayTimer()  ------------------------------------------------------------------------------------<


  }
}