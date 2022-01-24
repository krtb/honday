/* HTTP CLIENT */ 
const axios = require('axios');

/*  HARVEST CREDENTIALS */
const HARVEST_ACCOUNT_ID = process.env.HARVEST_ACCOUNT_ID;
const HARVEST_ACCESS_TOKEN = process.env.HARVEST_ACCESS_TOKEN;

const axiosConfigObject = {
  // TODO: Add UserAgent attribute required by harvest, review if axios sending by default
  headers: {
    "Authorization": "Bearer " + HARVEST_ACCESS_TOKEN,
    "Harvest-Account-ID": HARVEST_ACCOUNT_ID 
  }
}

module.exports={
  findHarvestProjectByPsCode: async (req, res, next)=> {
    // This function accesses PS-Code strings, from existing Monday.com board Projects
    let mondayProjectPsCodes = res.locals.getMondayProjectPsCodes;
    let startOnPage = 1;
    let storeAllProjects = []
    console.log(`============ finding ${mondayProjectPsCodes.length}  harvest Clients by name ============`)
    // <------------------------------------------------------------------------------------------------------------------------------
    // Returns a Promise that resolves after Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
      // GET first Projects API page
      // Then store variable data required for loop in "total_pages" variable
      let firstProjectsAPIPage = `https://api.harvestapp.com/v2/projects?page=${startOnPage}&per_page=100&ref=next&is_active=true&updated_since=2021-09-01T12:00:22Z`
      // Set Variable, to hold data requested from API
      let total_pages = 0;
      // Request only the first page, to set starting data for For Loop, used in pagination
      await axios.get(firstProjectsAPIPage, axiosConfigObject)
      .then( response => {
        let firstPageData = response.data;
        // Store total_pages value, to be used as limit in loop below
        total_pages = firstPageData.total_pages;
      });

      // Paginate through Project pages, to store all Projects - start on page 1
      for (let index = 1; index <= total_pages ; index++) {
        // Iterate through Project pages, page number updates
        paginationUrl = `https://api.harvestapp.com/v2/projects?page=${index}&per_page=100&ref=next&is_active=true&updated_since=2021-09-01T12:00:22Z`

        // Get all Projects, paginating with above dynamic URL
        axios.get(paginationUrl, axiosConfigObject)
        .then((response)=>{
          // Access Projects
          let projectsResponse = response.data.projects;
          // Filter out Project objects, nested in an array, inside another array level in batches of 100
          storeAllProjects.push(projectsResponse)
          // Log out current page and total pages
          console.log(`Searching Projects, on page ${index} of ${total_pages} in Harvest`);
        })
        .catch((error)=> 'There was an error here: ' + error)

        // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
        await timer(1000); // Then the created Promise can be awaited
        // Finally the timeout completes & execution continues at this point. 

      };
      // Remove Nested Array
      let flatProjectCollection = storeAllProjects.flat()
      console.log(`======= There are a total of ${flatProjectCollection.length} Projects in Harvest`);

      let harvestProjectsForMonday = [];
      let emptryStringToCheck = '';
      // Check Projects which do not pass filter rules
      let failedTest = [];

      // Loop over all projects currently in Harvest
      for(let index = 0; index <= flatProjectCollection.length - 1; index++) {
        // If PS-Code in harvest and PS-codes from Monday match, AND not an empty srting, then push to harvestProjectsForMonday[]
        mondayProjectPsCodes.map((mondayPsCode) => mondayPsCode.split('-')[1] === flatProjectCollection[index].code.split('-')[1] && flatProjectCollection[index].code !== emptryStringToCheck? harvestProjectsForMonday.push(flatProjectCollection[index]) : null )
      }

      // Filter out only Project ID, from Harvest Projects that were filtered.
      let pullharvestProjectIds = harvestProjectsForMonday.map((aProjectObject)=> aProjectObject.id)
      console.log(`======== Harvest Project Ids Filtered: total is ${pullharvestProjectIds.length} ========`);

      // Store locally
      res.locals.harvestProjectsForMonday = harvestProjectsForMonday
      res.locals.pullharvestProjectIds = pullharvestProjectIds
      next()

    };
    loadAPIRequestsWithDelayTimer();

    // End of logic for loadAPIRequestsWithDelayTimer()  <------------------------------------------------------------------------------------
  },
  getProjectBudgetReports: async (req, res, next)=>{
    // This function uses filtered Projects based on Monday existing values
    // Then compares with Project Budgert client names
    // Finally stores locally to send PATCH request to Monday.com in updateMondayHours();
    
    let pullharvestProjectIds = res.locals.pullharvestProjectIds
    let harvestProjectsForMonday = res.locals.harvestProjectsForMonday
    let getMondayProjectPsNames = res.locals.getMondayProjectPsNames
    // Container variables
    let projectBudgetsForMonday = [];
    let matchedProjectBudgetsForMonday = []

    // <------------------------------------------------------------------------------------------------------------------------------
    // Returns a Promise that resolves after Milliseconds
    const timer = milliseconds => new Promise(response => setTimeout(response, milliseconds))
    async function loadAPIRequestsWithDelayTimer() { // We need to wrap the loop in a asynchronus function for this to work
      // Set Harvest API endpoint for all Project Budgets
      let paginationUrl = `https://api.harvestapp.com/v2/reports/project_budget`
      
      axios.get(paginationUrl, axiosConfigObject)
      .then((response)=>{
        // Access Project Budget Response results and store in array defined above
        projectBudgetsForMonday.push(response.data.results)

      }).catch((error)=> 'There was an error here: ' + error)
      await timer(1000)
      // Remove nested arrays 
      let flatProjectBudgets = projectBudgetsForMonday.flat()

      for (let index = 0; index <= flatProjectBudgets.length - 1; index++) {
        //TODO: Matching with ProjectIds does not result in any data returned. Currently matches with client_name which is unique
        // Only by matching on Project Name, do 10 items get returned, with 1 dupelicate.
        // Project Ids and Project Budget Project_Id do not match
        // Project Name is not the Client- Project is `Quick Start for Web - Enterprise` general bucket, with unique client names
        // project_id: 28416027,
        // project_name: 'Quick Start for Web - Enterprise',
        getMondayProjectPsNames.filter((getMondayProjectPsNames) => getMondayProjectPsNames === flatProjectBudgets[index].client_name? matchedProjectBudgetsForMonday.push(flatProjectBudgets[index]) : null)
      }

      // Remove Duplicate Project Budget values
      let uniqueProjectBudgets = [...new Set(matchedProjectBudgetsForMonday)];

      console.log(`====================== There are a total of ${uniqueProjectBudgets.length} unique project budgets ======================`);
      res.locals.uniqueProjectBudgets = uniqueProjectBudgets
      next()
    }
    loadAPIRequestsWithDelayTimer()
  }
};