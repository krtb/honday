/* API REQUESTS */ 
const axios = require('axios');

/* HARVEST ROUTES */
const getProjectsEndpoint = `/v2/projects`
const getUserAssignmentsEndpoint =  `/v2/user_assignments`

/* ENVIRONMENT VARIABLES */
const HARVEST_ACCOUNT_ID = process.env.HARVEST_ACCOUNT_ID
const HARVEST_ACCESS_TOKEN = process.env.HARVEST_ACCESS_TOKEN
const getProjectsFromHarvestEndpoint = process.env.HARVEST_URL + getProjectsEndpoint

/* FUNCTION VARIABLES & UTILS */
let currentProjectID = Number(process.env.TEST_HARVEST_PROJECT_ID)

module.exports = {
    getProjectByID: function(req, res, next) {
      
        axios.get(getProjectsFromHarvestEndpoint, {
      
            headers: {
                "Authorization": "Bearer " + HARVEST_ACCESS_TOKEN,
                "Harvest-Account-ID": HARVEST_ACCOUNT_ID 
            }
      
        }).then( projectsObject => {

            projectsObject.data.projects.map( object => {

                if(object.id === currentProjectID){
                    res.locals.myProject = object
                    // TODO: send boardID along here,
                    // attach to project object

                    return next()
                }

            })
        })
        .catch((err) => {
            console.error(`The following ERRORS occurred:` + err)
        })
      }
}
