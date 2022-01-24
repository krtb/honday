/* HTTP CLIENT */ 
const axios = require('axios');

/*  HARVEST CREDENTIALS */
const HARVEST_ACCOUNT_ID = process.env.HARVEST_ACCOUNT_ID;
const HARVEST_ACCESS_TOKEN = process.env.HARVEST_ACCESS_TOKEN;

/* GLOBAL VARIABLES & UTILS */
const currentClientID = Number(process.env.DEV_HARVEST_Client_ID);
const arrayOfClientIds = currentClientID;

const axiosConfigObject = {
  // TODO: Add UserAgent attribute required by harvest, review if axios sending by default
  headers: {
    "Authorization": "Bearer " + HARVEST_ACCESS_TOKEN,
    "Harvest-Account-ID": HARVEST_ACCOUNT_ID 
  }
}

module.exports={
  findHarvestClientByName: async (req, res, next)=> {
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
          // TODO: Use flat() array method instead
          // Filter out Project objects, nested in an array, inside another array level in batches of 100
          storeAllProjects.push(projectsResponse.slice(0, projectsResponse.length))
          // Log out current page and total pages
          console.log(`Finding Clients, on page ${index} of ${total_pages}`);
        })
        .catch((error)=> 'There was an error here: ' + error)

        // When the engine reaches the await part, it sets a timeout and halts the execution of the async function.
        await timer(1000); // Then the created Promise can be awaited
        // Finally the timeout completes & execution continues at this point. 

      };

      // TODO: User flat() array method to remove nested arrays
      const harvestProjects = [];
      storeAllProjects.map((arrayOfAHundred)=>{
        // console.log(anArray, `Here is my array <---------`);
        arrayOfAHundred.map((projectObject)=>{
          // console.log(projectObject, `Here is my object <-----------`); 
          harvestProjects.push(projectObject)
        })
      })

      let harvestProjectsForMonday = [];
      let emptryStringToCheck = '';
      // Check Projects which do not pass filter rules
      let failedTest = [];

      // Loop over PS-Codes found on Monday.com board
      for(let index = 0; index <= mondayProjectPsCodes.length; index++) {
        // If PS-Code in harvest and PS-codes from Monday match, AND not an empty srting, then push to harvestProjectsForMonday[]
        harvestProjects.filter((harvestProject) => harvestProject.code === mondayProjectPsCodes[index] && harvestProject.code !== emptryStringToCheck? harvestProjectsForMonday.push(harvestProject) : failedTest.push(harvestProject) )
      }

      // Filter out only Project ID, from Harvest Projects that were filtered.
      let pullharvestProjectIds = harvestProjectsForMonday.map((aProjectObject)=> aProjectObject.id)
      // Store locally
      res.locals.harvestProjectsForMonday = harvestProjectsForMonday
      res.locals.pullharvestProjectIds = pullharvestProjectIds
      next()

    };

    loadAPIRequestsWithDelayTimer();
    // End of logic for loadAPIRequestsWithDelayTimer()  <------------------------------------------------------------------------------------
  },
  getProjectBudgetReports: async (req, res, next)=>{
    // This function accesses filteres values from Monday, that were stored locally
    let pullharvestProjectIds = res.locals.pullharvestProjectIds
    let harvestProjectsForMonday = res.locals.harvestProjectsForMonday
    let getMondayProjectPsNames = res.locals.getMondayProjectPsNames
    // Container variables
    let projectBudgetsForMonday = [];
    let filteredProjectBudgets = [];
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

      // Filter and return only the Client Ids for each Project Budget
      // flatProjectBudgets.map(e => console.log(e.client_name))
      // harvestProjectClientIds = harvestProjectsForMonday.map((singleItem)=> {
      //   return singleItem.client.id
      // })

      // While there are Project Budgets, filter based on Existing Monday board project names, and project budget names
      let matchedProjectBudgetsForMonday = []
      for (let index = 0; index <= flatProjectBudgets.length - 1; index++) {
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