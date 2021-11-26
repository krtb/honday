/* HTTP CLIENT */ 
const axios = require('axios');

/* MONADY.COM ROUTES */ 
const mondayURL = process.env.MONDAY_APIV2_URL

module.exports = {

    prepareHarvestDataForMondayApp: function (req, res, next){

        const aHarvestProjectObject = res.locals.myProject

        const projectID = aHarvestProjectObject.id 
        const projectName = aHarvestProjectObject.name
        const projectPSNumber = aHarvestProjectObject.code
        const projectStartDate = aHarvestProjectObject.starts_on
        const projectEndDate = aHarvestProjectObject.ends_on
        const projectNotes = aHarvestProjectObject.notes
        const projectIsBillableBoolean = aHarvestProjectObject.is_billable

        const harvestObjectForMonday = {
            projectID,
            projectName,
            projectPSNumber,
            projectStartDate,
            projectEndDate,
            projectNotes,
            projectIsBillableBoolean
        }

        res.locals.harvestObjectForMonday = harvestObjectForMonday 

        return next()
         
    },
    sendHarvestDataToMondayApp: function (req, res, next) {
        let harvestObjectForMonday = res.locals.harvestObjectForMonday;
        let dateOfToday = new Date().toJSON().slice(0,10).replace(/-/g,'-');

        //TODO: update to send multiple entries at once,
        // will need to update all boards, with all projects,
        // that have a new updated_at value in their object.

         // below uses graphql variables
        let queryToCreateContent = `
        mutation (
        $myItemName: String!,
        $boardId: Int!,
        $column_values: JSON!)
        {
        create_item(
            board_id: $boardId,
            item_name: $myItemName,
            create_labels_if_missing: true,
            column_values: $column_values
        )
        {id}
        }
        `;

        let isBillableBoolean = harvestObjectForMonday.projectIsBillableBoolean;
        let isBillableString = isBillableBoolean.toString()

        let variablesForCreatingContent = {
            // https://api.developer.monday.com/docs/guide-to-changing-column-data
            "myItemName": "action item test copy",
            "boardId": Number(process.env.MONDAY_BOARD_KURT_ID),
            "column_values": JSON.stringify({
                "text": harvestObjectForMonday.projectPSNumber,
                "person": {"personsAndTeams":[{"id":25526553,"kind":"person"}]},
                "date4": dateOfToday,
                "status9": "Sessions",
                "numbers": 40,
                "long_text": harvestObjectForMonday.projectNotes,

                "check": {"checked" : isBillableString}
            })

        }

        axios.post(mondayURL, {
            'query':queryToCreateContent,
            'variables': JSON.stringify(variablesForCreatingContent)
        }, {
            headers: {
              'Content-Type': `application/json`,
              'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
            },
        }).then((res) => {
            return next(res)
        })
        .catch((err) => {
            
            console.error(`The following ERRORS occurred:` + err)
        })
    }
}