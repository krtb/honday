/* HTTP CLIENT */ 
const axios = require('axios');

/* HARVEST ROUTES */
const getProjectsEndpoint = `/v2/projects`;
const getUserAssignmentsEndpoint =  `/v2/user_assignments`;
const getAllAssignedTasksEndpoint = `/v2/task_assignments`;
/* ENVIRONMENT VARIABLES */
const HARVEST_ACCOUNT_ID = process.env.HARVEST_ACCOUNT_ID;
const HARVEST_ACCESS_TOKEN = process.env.HARVEST_ACCESS_TOKEN;
const getProjectsFromHarvestUrl = process.env.HARVEST_URL + getProjectsEndpoint;
const getAllAssignedTasksFromHarvestUrl = process.env.HARVEST_URL + getAllAssignedTasksEndpoint;

/* FUNCTION VARIABLES & UTILS */
const currentProjectID = Number(process.env.DEV_HARVEST_PROJECT_ID);
//TODO: GET array of all current Users, get all of their project IDs.
// OR => only update projects based on last upadted date
// AND => Still need to get a list of Users, and their emails, match to Monday
//TODO: get all emails in Monday (?)
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