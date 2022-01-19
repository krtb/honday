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
const getASingleTimeEntryFromHarvestUrl = process.env.HARVEST_URL + getTimeEntriesEndpoint;
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
    console.log('HondayBot searching for projectUserAssignments...');
    // set a counter
    let page = 1;
    // create empty array where we want to store the userAssignments objects for each loop
    let timeEntries = [];
    // create a lastResult array which is going to be used to check if there is a next page
    let lastResult = [];
    let pageCount = 1

    do {
      try {
        // GET request, sent to 'time_entries' endpoint
        let paginationUrl = `https://api.harvestapp.com/v2/time_entries?page=${page}&per_page=100&ref=next&is_active=true&updated_since=2021-09-01T12:00:22Z`
        // TODO: remove this variable
        let checkThis

        checkThis = await axios.get(paginationUrl, axiosConfigObject)
        .then((resp)=> {
          // TODO: Get total number of pages from data, display in console log

          let data = resp.data

          let totalPageCount = data.total_pages
          // Pull objects, inside an array, that are the first property of the data objecs from above
          let onlyObjectsRequired = data[Object.keys(data)[0]]
          // TODO: Change back to resp.data?
          lastResult = data

          onlyObjectsRequired.map((aSingleUserAssignment)=> {
            // console.log(aSingleUserAssignment, 'aSingleUserAssignment <------');
            if(aSingleUserAssignment.project.code === 'PS-12222'){
              timeEntries.push(aSingleUserAssignment);
              console.log(`HondayBot found timeEntry, on HarvestAPI Page: ${pageCount} / ${totalPageCount}`);
              pageCount++
            }
            if(aSingleUserAssignment.project.code === 'PS-004298'){
              timeEntries.push(aSingleUserAssignment);
              console.log(`HondayBot found timeEntry, on HarvestAPI Page: ${pageCount} / ${totalPageCount}`);
              pageCount++
            }
            if(aSingleUserAssignment.project.code === 'PS-004513'){
              timeEntries.push(aSingleUserAssignment);
              console.log(`HondayBot found timeEntry, on HarvestAPI Page: ${pageCount} / ${totalPageCount}`);
              pageCount++
            }
            if(aSingleUserAssignment.project.code === 'PS-11514'){
              timeEntries.push(aSingleUserAssignment);
              console.log(`HondayBot found timeEntry, on HarvestAPI Page: ${pageCount} / ${totalPageCount}`);
              pageCount++
            }
            if(aSingleUserAssignment.project.code === 'PS-004575'){
              timeEntries.push(aSingleUserAssignment);
              console.log(`HondayBot found timeEntry, on HarvestAPI Page: ${pageCount} / ${totalPageCount}`);
              pageCount++
            }
          })

        })

        page++;

      } catch (err) {

        console.error(`There was a problem in 'getAllTimeEntries'------> ${err}`);

      }
      // keep running until there's no next page
    } while (lastResult.next_page !== null);
    // store found objects
    console.log(timeEntries, 'timeEntries');
    res.locals.allTimeEntriesFromHarvest = timeEntries

    console.log(timeEntries.length, '... getAllProjectUserAssignments middleware complete');

    return next()
  },
  buildTimeEntriesForMondayBoard: async (req, res, next) => {

    // Pull stored UserProjectAssignment Objects
    let allHarvestTimeEntries = await res.locals.allTimeEntriesFromHarvest

    // To hold filtered time stamps only
    let filteredUserProjectArrays

    // Create date time object
    let dateOfToday = new Date();

    // Transform into ISO format, like this => 2022-01-04
    let todaysDateIsoUtcTimezone = await function ISODateString(datOfToday) {
      function pad(n) {return n<10 ? '0'+n : n}
      return datOfToday.getUTCFullYear()+'-'
          + pad(datOfToday.getUTCMonth()+1)+'-'
          + pad(datOfToday.getUTCDate())
    }(dateOfToday)
    
    filteredTimeEntryObjectsForMonday = allHarvestTimeEntries.map((oneTimeEntry)=>{

      // Filter out required information, to communicate with Monday.com
      const mondayTimeEntry = {
        timeEntryId: oneTimeEntry.id,
        submitterId: oneTimeEntry.user.id,
        submitter: oneTimeEntry.user.name,
        submitterEmail: '',
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
    console.log(filteredTimeEntryObjectsForMonday, '... filteredUserProjectArrays middleware complete', filteredTimeEntryObjectsForMonday.length);

    next()
  },
  replaceSubmitterNameWithEmail: async (req, res, next) => {
    // Users{} from Monday.com, contain Email and Id properties 
    let mondayUserEmailIdObjects = res.locals.allMondayUsersContainer
    // TimeEntries{} from Harvest, contain properties formatted in a previous function - thus unique names
    let filteredTimeEntryObjectsForMonday = res.locals.filteredTimeEntryObjectsForMonday

    // Creates array of only Harvest User Ids, required to request specific Users, to then pull email values
    let harvestUserIdCollection = filteredTimeEntryObjectsForMonday.map((singleTimeEntry)=> {
      return singleTimeEntry.submitterId
    })

    // To hold final collection of Objects{}, sanitized to be consumed then be mapped ot Graphql/Monday.com values
    let completeHarvestObjectWithMondayID = [];

    //TODO: loop through filteredTimeEntryObjectsForMonday and use getAllUsersToFilterIDs, to inpute an email, then match based on that.

    // Note: This function kicks butt  ------------------------------------------------------------------------------------<
    // Returns a Promise that resolves after "ms" Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    // Function below will push values to this Array[]
    let harvestUsersContainer = [];

      async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
        console.log('Your Harvest copllection of User IDs is this long: ' + harvestUserIdCollection.length );
        for (var i = 0; i < harvestUserIdCollection.length - 1; harvestUserIdCollection[i++]) {
          // Injects Specified User Ids into URL, to request their User Profiles
          let paginationUrl = `https://api.harvestapp.com/v2/users/${harvestUserIdCollection[i]}`

          console.log(i);

          // Send GET request to specific URL Endpoint, dynamically defined above
          axios.get(paginationUrl, axiosConfigObject)
          .then((response)=>{
            // Push to me array, defined outside of async function
            harvestUsersContainer.push(response.data)
          })

          // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
          await timer(1000); // Then the created Promise can be awaited
          // Finally the timeout completes & execution continues at this point. 
        }

        // Map over list of all Harvest Users, to match based on TimeEntryUserId And HarvestUserId
        harvestUsersContainer.map((singleHarvestUserProfile)=>{
          
          // TODO: get TimeEntryUserIds, use to match with Harvest User Ids and add email

          // Map over singleTimeEntry{}, an object which has an empty string set to the property singleTimeEntry.submitterEmail
          // Information needs to be added from a User{}, which is requested in the async function above.
          filteredTimeEntryObjectsForMonday.map((singleTimeEntry)=> {
            // If a HarvestTimeEntry and a HarvestUserProfile ahve the same ID
            // Then set a submitterEmail
            // And set a Monday ID in my HarvestTimeEntry Object
            if(singleTimeEntry.submitterId === singleHarvestUserProfile.id){
              singleTimeEntry.submitterEmail = singleHarvestUserProfile.email 
              singleTimeEntry.mondayId = singleHarvestUserProfile.id
            }
          })

        })

        // Finally, set TimeEntry Object form Harvest locally, with Emails & Ids added
        res.locals.filteredTimeEntryObjectsForMondayWithUserEmail = filteredTimeEntryObjectsForMonday
        return next()
      }
      // Note: End of butt kick funcrtion here  ------------------------------------------------------------------------------------<

      loadAPIRequestsWithDelayTimer();

  }
}