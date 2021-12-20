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
    getAllProjectUserAssignments: async (req,res,next) => {
      // set a counter
      let page = 1;
      // create empty array where we want to store the userAssignments objects for each loop
      let userAssignments = [];
      // create a lastResult array which is going to be used to check if there is a next page
      let lastResult = [];
      do {
        // try catch to catch any errors in the async api call
        try {
          // make api call
          let paginationUrl = `https://api.harvestapp.com/v2/user_assignments?page=${page}&per_page=100&ref=next&is_active=true&updated_since=2021-09-01T12:00:22Z`
          let checkThis

          checkThis = await axios.get(paginationUrl, axiosConfigObject)
          .then((resp)=> {
            console.log(resp, 'this is the response');
            let data = resp.data.user_assignments
            lastResult = resp.data

            return data.map((aSingleUserAssignment)=> {
              userAssignments.push(aSingleUserAssignment);
            })
          })

          page++;

        } catch (err) {

          console.error(`There was an error ------> ${err}`);

        }
        // keep running until there's no next page
      } while (lastResult.next_page !== null);
      // let's log out our new userAssignments array
      console.log(userAssignments);
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
      .catch((err)=> {
        console.log(err, '------> There was an Error.');
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
    getProjectByID: function(req, res, next) {
      
        axios.get(getProjectsFromHarvestEndpoint, axiosConfigObject)
        .then( projectsObject => {
            //NOTE: Object{} has an array[] of project objects{}.
            projectsObject.data.projects.map( object => {

                if(object.id === arrayOfProjectIds){

                    res.locals.myProject = object
                    
                    return next()
                }

            })
        })
        .catch((err) => {
            console.error(`The following ERRORS occurred:` + err)
        })
    }
}