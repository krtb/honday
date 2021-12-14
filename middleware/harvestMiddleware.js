/* HTTP CLIENT */ 
const axios = require('axios');

/* HARVEST ROUTES */
const getProjectsEndpoint = `/v2/projects`
const getUserAssignmentsEndpoint =  `/v2/user_assignments`

/* ENVIRONMENT VARIABLES */
const HARVEST_ACCOUNT_ID = process.env.HARVEST_ACCOUNT_ID
const HARVEST_ACCESS_TOKEN = process.env.HARVEST_ACCESS_TOKEN
const getProjectsFromHarvestEndpoint = process.env.HARVEST_URL + getProjectsEndpoint

/* FUNCTION VARIABLES & UTILS */
let currentProjectID = Number(process.env.DEV_HARVEST_PROJECT_ID)
let arrayOfProjectIds = currentProjectID

module.exports = {

    getAllProjects: (req, res, next) => {
        axios.get(getProjectsFromHarvestEndpoint, {
      
            headers: {
                "Authorization": "Bearer " + HARVEST_ACCESS_TOKEN,
                "Harvest-Account-ID": HARVEST_ACCOUNT_ID 
            }
      
        }).then( projectsObject => {
          // NOTE: Most recent projects will appear at top of list, according to updated_at field.
          const anObjectOfProjects = projectsObject.data; //objects in array, other properties outside
          const totalEntriesPerPage = projectsObject.per_page // 100
          const totalPagesOfProjects = projectsObject.total_pages; // 32
          const totalEntriesOfProjects = projectsObject.total_entries // 3120
          console.log(projectsObject.data, '-----> projects object');
        })
        .catch((err) => {
            console.error(`The following ERRORS occurred:` + err)
        })
    },
    getProjectByID: function(req, res, next) {
      
        axios.get(getProjectsFromHarvestEndpoint, {
      
            headers: {
                "Authorization": "Bearer " + HARVEST_ACCESS_TOKEN,
                "Harvest-Account-ID": HARVEST_ACCOUNT_ID 
            }
      
        }).then( projectsObject => {

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