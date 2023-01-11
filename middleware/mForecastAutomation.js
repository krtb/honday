const axios = require('axios');
const _ = require('lodash');

const { avoidTimeout } = require('../utils/avoidTimeout.js');
const { writeJsonToFile, readFromJsonFile } = require('../utils/readWriteJSON.js');
const localInputFileCreationPath = '../inputFiles/inputData.json';
const test_json_file = require('../inputFiles/inputData.json');
const resultOutputPath = '../outputFiles/outData3.json';

/** Global Variables */
let mondayBoardID = process.env.PROJECT_ROLLUP_BOARD;
// MONDAY_DEV_BOARD_ID;
let arrayOfProjectTrsBoardObjects;

/** Axios */
const axiosURL = "https://api.monday.com/v2";
const axiosConfig = {
  headers: {
    'Content-Type': `application/json`,
    'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
  },
};

// 1 - pull data from board with projects
// 2 - then find a specific column - with name - total project hours
// 3 - next, save other collumns, such as Project Start Date, Project End Date, consultant hrs, project manager hours, Budget
// 4 - get projects from project trs board, where project information lives
//------
// 5 - Create objects of only information needed.
// 6 - Divide budget, 80/20, by pm and consultant
// 7 - create a new table
// 8 - populate ever column with hours
// 9 - figure out how to have it autorun - should as long as final function call is ok.

Object.assign(module.exports, {
  /**
   * READ Project Roll-Up Board, to filter on project status and only get those projects back.
   * @async
   * @function next From Express Router, allows Server to move on to next route.
   */
  assignedProjectPSCodes: async (req, res, next)=>{
    {
      let query = `{
        boards (ids: ${mondayBoardID}) {
          items (limit: 100) {
            id
            name
            column_values {
              id
              title
              value
              text
            }
          }
        }
      }`;

			// getAll Boards, that have been moved into "Assigned"
			// find and return project ps codes, to be used against ProjectTRS table.
      let assignedProjectCodes = []
			await axios.post(axiosURL,{query}, axiosConfig)
      .then((response)=>{
        if (response.data.data.boards) {
					response.data.data.boards[0].items.map((aBoardItem)=>{
						let assignedStatusColumn = aBoardItem.column_values[50].text
						if(assignedStatusColumn !== null || ''){
							let psProjectNumber = aBoardItem.column_values[2].text;
							assignedProjectCodes.push(psProjectNumber)
						}
					})
        } else {
          console.error('malformed_query');
          console.error(response.data.errors);
        }
      })
      .catch((err)=> {
        console.error('server_response');
        console.error(err, `status_code: ${res.statusCode}`);
      });
			
			res.locals.assignedProjectCodes = assignedProjectCodes

      next();
    }
  },
	projectBudgetInfo: async(req,res,next)=>{
		let assignedProjectCodes = res.locals.assignedProjectCodes
	}
});