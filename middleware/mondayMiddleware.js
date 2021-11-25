module.exports = {

    prepareHarvestDataForMondayApp: function (req, res, next){
        const aHarvestProjectObject = res.locals.myProject

        const projectID = aHarvestProjectObject.id 
        const projectName = aHarvestProjectObject.name
        const projectPSNumber = aHarvestProjectObject.code
        const projectStartDate = aHarvestProjectObject.starts_on
        const projectEndDate = aHarvestProjectObject.ends_on
        const projectNotes = aHarvestProjectObject.notes
        const projectIsBillable = aHarvestProjectObject.is_billable

        const harvestObjectForMonday = {
            projectID,
            projectName,
            projectPSNumber,
            projectStartDate,
            projectEndDate,
            projectNotes,
            projectIsBillable
        }

        res.locals.harvestObjectForMonday = harvestObjectForMonday 

        return next()
         
    },
    sendHarvestDataToMondayApp: function (req, res, next) {
        let harvestObjectForMonday = res.locals.harvestObjectForMonday;
        let dateOfToday = new Date().toJSON().slice(0,10).replace(/-/g,'-');

        let variablesForCreatingContent = {
            // https://api.developer.monday.com/docs/guide-to-changing-column-data

            "myItemName": "action item test copy",
            "boardId": harvestObjectForMonday.projectID,
            "column_values": JSON.stringify({
                "text": harvestObjectForMonday.projectID,
                "person": {"personsAndTeams":[{"id":25526553,"kind":"person"}]},
                "date4": dateOfToday,
                "status9": "Sessions",
                "numbers": 40,
                "long_text": harvestObjectForMonday.notes,
                "check": {"checked": harvestObjectForMonday.is_billable}
            })

        }

        // TODO: write axios post request to send data to Monday board
    }
}