/* HTTP CLIENT */ 
const axios = require('axios');

/* HARVEST ROUTES */
const getProjectsEndpoint = `/v2/projects`;
const getUserAssignmentsEndpoint =  `/v2/user_assignments`;
const getAllAssignedTasksEndpoint = `/v2/task_assignments`;
const getAllUserAssignmentsEndpoint =  `/v2/user_assignments`;
/* ENVIRONMENT VARIABLES */
const HARVEST_ACCOUNT_ID = process.env.HARVEST_ACCOUNT_ID;
const HARVEST_ACCESS_TOKEN = process.env.HARVEST_ACCESS_TOKEN;
const getProjectsFromHarvestUrl = process.env.HARVEST_URL + getProjectsEndpoint;
const getAllAssignedTasksFromHarvestUrl = process.env.HARVEST_URL + getAllAssignedTasksEndpoint;
const getProjectUserAssignmentsUrl = process.env.HARVEST_URL + getAllUserAssignmentsEndpoint;

/* FUNCTION VARIABLES & UTILS */
const currentProjectID = Number(process.env.DEV_HARVEST_PROJECT_ID);
const arrayOfProjectIds = currentProjectID;
const axiosConfigObject = {
  headers: {
    "Authorization": "Bearer " + HARVEST_ACCESS_TOKEN,
    "Harvest-Account-ID": HARVEST_ACCOUNT_ID 
  }
}

module.exports = {
  getAllProjectUserAssignments: async (req,res,next) => {
    console.log('Honday Bot searching for projectUserAssignments...');
    // set a counter
    let page = 1;
    // create empty array where we want to store the userAssignments objects for each loop
    let userAssignments = [];
    // create a lastResult array which is going to be used to check if there is a next page
    let lastResult = [];

    do {
      try {
        // make api call
        let paginationUrl = `https://api.harvestapp.com/v2/user_assignments?page=${page}&per_page=100&ref=next&is_active=true&updated_since=2021-09-01T12:00:22Z`
        let checkThis

        checkThis = await axios.get(paginationUrl, axiosConfigObject)
        .then((resp)=> {

          let data = resp.data
          // Pull objects, inside an array, that are the first property of the data objecs from above
          let onlyObjectsRequired = data[Object.keys(data)[0]]
          // TODO: Change back to resp.data?
          lastResult = data

          onlyObjectsRequired.filter((aSingleUserAssignment)=> {

            if(aSingleUserAssignment.project.code === 'PS-12222'){
              userAssignments.push(aSingleUserAssignment);
              console.log(`Honday Bot captured a project, on Harvest API Page: ${page}`);

            }
            if(aSingleUserAssignment.project.code === 'PS-004298'){
              userAssignments.push(aSingleUserAssignment);
              console.log(`Honday Bot captured a project, on Harvest API Page: ${page}`);

            }
            if(aSingleUserAssignment.project.code === 'PS-004513'){
              userAssignments.push(aSingleUserAssignment);
              console.log(`Honday Bot captured a project, on Harvest API Page: ${page}`);

            }
            if(aSingleUserAssignment.project.code === 'PS-11514'){
              userAssignments.push(aSingleUserAssignment);
              console.log(`Honday Bot captured a project, on Harvest API Page: ${page}`);

            }
            if(aSingleUserAssignment.project.code === 'PS-004575'){
              userAssignments.push(aSingleUserAssignment);
              console.log(`Honday Bot captured a project, on Harvest API Page: ${page}`);

            }
          })

        })

        page++;

      } catch (err) {

        console.error(`There was an error ------> ${err}`);

      }
      // keep running until there's no next page
    } while (lastResult.next_page !== null);
    // store found objects
    console.log(userAssignments, 'userAssignments');
    res.locals.allProjectUserAssignments = userAssignments

    console.log(userAssignments.length, '... getAllProjectUserAssignments middleware complete');

    return next()
  },
  filterProjectUserData: async (req, res, next) => {

    // Pull stored UserProjectAssignment Objects
    let allMyProjectUserAssignments = await res.locals.allProjectUserAssignments

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
    
    filteredUserProjectArrays = allMyProjectUserAssignments.map((singleProjectUserAssignment)=>{

      // Filter out required information, to communicate with Monday.com
      let projectUserData = {
        // Remove section of timestamp that we do not need when comparing to today's date format
        // Original harvestTimeStamps look like this ===> 2021-09-10T18:55:33Z
        updatedAt: `${singleProjectUserAssignment.updated_at.split('T')[0]}`, 
        projectID: `${singleProjectUserAssignment.project.id}`, 
        projectName: `${singleProjectUserAssignment.project.name}`, 
        projectCode: `${singleProjectUserAssignment.project.code}`,
        userID: `${singleProjectUserAssignment.user.id}`,
        userName: `${singleProjectUserAssignment.user.name}`,
      }

      return projectUserData
    })


    // Store locally
    res.locals.filteredUserProjectArrays = filteredUserProjectArrays
    console.log(filteredUserProjectArrays, '... filteredUserProjectArrays middleware complete');

    next()
  },
  getAllProjects: (req, res, next) => {
      axios.get(getProjectsFromHarvestUrl, axiosConfigObject)
      .then( projectsObject => {
        // NOTE: Most recent projects will appear at top of list, according to created_at field.
        const aProjectsListObject = projectsObject.data; //objects in array, other properties outside
        const totalEntriesPerPage = projectsObject.per_page // 100
        const totalPagesOfProjects = projectsObject.total_pages; // 32
        const totalEntriesOfProjects = projectsObject.total_entries // 3120
        console.log(aProjectsListObject, '-----> All Projects!');
      })
      .catch((err) => {
          console.error(`The following ERRORS occurred:` + err)
      })
    },
    getAllAssignedTasks: (req, res, next) => {
      // NOTE: Most recent assignedTasks will appear at top of list, according to created_at field.
      axios.get(getAllAssignedTasksFromHarvestUrl, axiosConfigObject)
      .then((assignedTasksObject)=> {
        const anAssignedTasksListObject = assignedTasksObject.data;
        const totalPerPageOfAssignedTasks = assignedTasksObject.per_page // 100
        const totalPagesOfAssignedTasks = assignedTasksObject.total_pages; // 170
        const totalEntriesPerPageOfAssignedTasks = assignedTasksObject.total_entries; // 16,967
        console.log(anAssignedTasksListObject, '------> All Assigned Tasks!')
      })
      .catch((error)=> {
        console.log(error, '------> There was an Error.');
      })
    },
    getProjectsAndTasksFromAssignedTasks: (req, res, next)=>{
      axios.get(getAllAssignedTasksFromHarvestUrl, axiosConfigObject)
      .then((allAssignedTasksResponse)=> {
        const {task_assignments} = allAssignedTasksResponse.data;
        let count = 0
        const assignedTaskProjectsAndTasks = task_assignments.map((aSingleAssignedTaskObject)=> {
          //NOTE: Displays a count of items
          ++count

          const dataMap = {
            task_count: count,
            project: 'project',
            task: 'project',
          };   

          dataMap.project = aSingleAssignedTaskObject.project;
          dataMap.task = aSingleAssignedTaskObject.task;
          return dataMap;
        })

        console.log(assignedTaskProjectsAndTasks, '------> Projects and Tasks!');
      })
    },
}