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
    // TODO: add function to search all projects (or list of specific projects by speicific managers),
    // if updated_at value has changed when compared to today's date,
    // then update a collection of boards.
    getAllProjects: (req, res, next) => {
        axios.get(getProjectsFromHarvestEndpoint, {
      
            headers: {
                "Authorization": "Bearer " + HARVEST_ACCESS_TOKEN,
                "Harvest-Account-ID": HARVEST_ACCOUNT_ID 
            }
      
        }).then( projectsObject => {

            projectsObject.data.projects.map( aProject => {

                console.log(aProject, 'allProjects');

            })
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