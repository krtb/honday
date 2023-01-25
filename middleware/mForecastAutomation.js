const axios = require('axios');
const _ = require('lodash');

const { avoidTimeout } = require('../utils/avoidTimeout.js');
const { writeJsonToFile, readFromJsonFile } = require('../utils/readWriteJSON.js');
const localInputFileCreationPath = '../inputFiles/inputData.json';
const test_json_file = require('../inputFiles/inputData.json');
const resultOutputPath = '../outputFiles/outData3.json';

/** Global Variables */
let mondayBoardID = process.env.PROJECT_ROLLUP_BOARD;
let projectTrsBoard = process.env.PROJECT_TRS_BOARD;
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
rollUpBoardNewAndAssignedGroups: async ()=>{
	let query = `{
		boards (ids: ${mondayBoardID}) 
		{ groups (ids: status)
			{ title color position }
		}
	}`;

	const myGroups = await axios.post(axiosURL, {query}, axiosConfig)
		.then(resp => {
			return resp
		})
	console.log(myGroups)
},
productCodeAndTotalHoursCalc: async ()=>{
//Get all items from Monday Project Rollup board

	let query = `{ boards(ids: ${mondayBoardID}) { groups { id title } items(limit: 100) { id name column_values{id title value text} group {title}  } } }`;

	const arrayOfProductCodes = []; 
	const projectRollUpBoardResponse = await axios.post(axiosURL,{query}, axiosConfig).then(resp => resp)
	.catch(function (error) {
		if (error.response) {
		  // Request made and server responded
			console.log(error.response.data);
			console.log(error.response.status);
			console.log(error.response.headers);
		} else if (error.request) {
		  // The request was made but no response was received
			console.log(error.request);
		} else {
		  // Something happened in setting up the request that triggered an Error
			console.log('Error', error.message);
		}
	
		})
	
	const arrayOfAssignedProjects = [];
	if(projectRollUpBoardResponse.data.errors === undefined){
	const onlyProjectData = projectRollUpBoardResponse.data.data.boards[0].items;
	
	function getTotalAmountOfDays(startDateString, endDateString){
		// To calculate the time difference of two dates
		let startDate = new Date(`${startDateString}`);
		let endDate = new Date(`${endDateString}`);
		let differenceInTime = endDate.getTime() - startDate.getTime();
		// To calculate the no. of days between two dates
		let Difference_In_Days = differenceInTime / (1000 * 3600 * 24);
		return Difference_In_Days
	}
	
	function productCodeSwtich(productCodeString){
		let productCode = productCodeString;
		let totalHours  = "No Hour Code Found";

		// TODO: After setting up how switch will go, replace with array values
		// THEN work on GETTING information from data out target
		switch (productCode) {
			case "STRT-UP-PENDO":
				totalHours = 2;
				break;
			case "PNDO-WRKSHP-SER":
				totalHours = 4;
				break;
			case "P-QS-STD":
				totalHours = 16;
				break;
			case "P-QS-PLUS":
				totalHours = 32;
				break;
			case "P-QS-PRM":
				totalHours = 60;
				break;
			case "P-ENT-IMPL-S":
				totalHours = 106;
				break;
			case "P-ENT-IMPL-M":
				totalHours = 215;
				break;
			case "P-ENT-IMPL-L":
				totalHours = 386;
				break;
			case "10-FTE-3-MNTH":
				totalHours = 48;
				break;
			case "20-FTE-3-MNTH":
				totalHours = 96;
				break;
			case "30-FTE-3-MNTH":
				totalHours = 144;
				break;
			case "10-FTE-6-MNTH":
				totalHours = 96;
				break;
			case "20-FTE-6-MNTH":
				totalHours = 192;
				break;
			case "30-FTE-6-MNTH":
				totalHours = 288;
				break;
			case "PS-ACCELERATOR":
				totalHours = 3;
				break;
			case "PS-FB-QS-W":
				totalHours = 3;
				break;
			case "PS-G-QS-W":
				totalHours = 3;
				break;
			case "PS-I-QS-W":
				totalHours = 3;
				break;
			case "PS-PFSU-PLUS-QS-W":
				totalHours = 10;
				break;
			case "PS-QS-PFSU-PLUS-M":
				totalHours = 10;
				break;	
			case "PS-PFSU-QS-W":
				totalHours = 2;
				break;
			case "PS-PRO-QS-W":
				totalHours = 22;
				break;
			case "PS-PRO-QS-M":
				totalHours = 22;
				break;
			case "PS-QS-PFSU-M":
				totalHours = 5;
				break;
			case "PS-PRO-SERV-ACCLTR":
				totalHours = 5;
				break;	
			case "PS-QS-M":
				totalHours = 5;
				break;
			case "PS-QS-PFSU-M":
				totalHours = 2;
				break;
			case "PS-TM-QS-M":
				totalHours = 10;
				break;
			case "PS-TM-QS-W":
				totalHours = 10;
				break;
			case "PS-STRT-UP-PENDO":
				totalHours = 2;
				break;
			case "PS-PNDO-WRKSHP-SER":
				totalHours = 4;
				break;
			case "PS-QS-STD":
				totalHours = 16;
				break;
			case "PS-QS-PLUS":
				totalHours = 32;
				break;
			case "PS-QS-PRM":
				totalHours = 60;
				break;
			case "PS-ENT-IMPL-S":
				totalHours = 106;
				break;
			case "PS-ENT-IMPL-M":
				totalHours = 215;
				break;
			case "PS-ENT-IMPL-L":
				totalHours = 386;
				break;
			case "PS-10-FTE-3-MNTH":
				totalHours = 48;
				break;
			case "PS-20-FTE-3-MNTH":
				totalHours = 96;
				break;
			case "PS-30-FTE-3-MNTH":
				totalHours = 144;
				break;
			case "PS-10-FTE-6-MNTH":
				totalHours = 96;
				break;
			case "PS-20-FTE-6-MNTH":
				totalHours = 192;
				break;
			case "PS-30-FTE-6-MNTH":
				totalHours = 288;
				break;
			case "PS-ACCELERATOR":
				totalHours = 3;
				break;
			case "PS-FB-QS-W":
				totalHours = 3;
				break;
			case "PS-G-QS-W":
				totalHours = 3;
				break;
			case "PS-I-QS-W":
				totalHours = 3;
				break;
			case "PS-PFSU-PLUS-QS-W":
				totalHours = 10;
				break;
			case "PS-QS-PFSU-PLUS-M":
				totalHours = 10;
				break;
			case "PS-PFSU-QS-W":
				totalHours = 2;
				break;
			case "PS-PRO-QS-W":
				totalHours = 22;
				break;
			case "PS-PRO-QS-M":
				totalHours = 22;
				break;
			case "PS-PRO-SERV-ACCLTR":
				totalHours = 5;
				break;
			case "PS-QS-M":
				totalHours = 5;
				break;
			case "PS-QS-PFSU-M":
				totalHours = 2;
				break;
			case "PS-TM-QS-M":
				totalHours = 10;
				break;
			case "PS-TM-QS-W":
				totalHours = 10;
				break;
			case "PS-P-DA-L":
				totalHours = 120;
				break;
			case "PS-P-DA-M":
				totalHours = 80;
				break;
			case "PS-P-DA-M":
				totalHours = 40;
				break;
			default:
				break;
		}
	}
	onlyProjectData.forEach((anItem)=>{
				let projectManagerName = typeof anItem.column_values[12].value
				if(anItem.group.title === "Assigned" 
				&& projectManagerName === "string"){
					let projectDateObj = JSON.parse(anItem.column_values[28].value);
					let startDateString = projectDateObj.from;
					let endDateString = projectDateObj.to;
					let totalProjectDays = getTotalAmountOfDays(startDateString, endDateString);

					let primaryProjectInfoSet = {
						monday_id: anItem.id,
						project_name: anItem.name,
						product_code: productCodeSwtich(anItem.column_values[1].text),
						ps_number: anItem.column_values[2].text,
						project_status: anItem.column_values[6].text,
						project_manager_profile: anItem.column_values[11].value,
						project_manager_name: anItem.column_values[12].value,
						consultant_profile: anItem.column_values[13].value,
						consultant_name:  anItem.column_values[14].value,
						strategic_consultant_profile: anItem.column_values[15].value,
						strategic_consultant_name: anItem.column_values[16].value,
						current_start_date: startDateString,
						current_end_date: endDateString,
						current_timeline_days: totalProjectDays,
						contract_start_date: anItem.column_values[24].text,
						contract_end_date_og: anItem.column_values[26].value,
						group_type: anItem.group.title
					}
					arrayOfAssignedProjects.push(primaryProjectInfoSet)
				}

	});
	console.log(arrayOfAssignedProjects, `<--- logging my test case here: arrayOfAssignedProjects ---`);
	} else {
	console.log(`Error found: ${projectRollUpBoardResponse.data.errors.message}`)
	}
},
	// projectTrsProjectInfo: async(req,res,next)=>{
	// 	let assignedProjectCodes = res.locals.assignedProjectCodes
	// 	// Get all projects from TRS board
	// 	// filter based on PS code, with ps removed
	// 	// create object of information

	// 	let query = `{
	// 		boards (ids: ${projectTrsBoard}) {
	// 			items (limit: 100) {
	// 				id
	// 				name
	// 				column_values {
	// 					id
	// 					title
	// 					value
	// 					text
	// 					description
	// 					additional_info
	// 				}
	// 			}
	// 		}
	// 	}`;

	// 	// getAll Boards, that have been moved into "Assigned"
	// 	// find and return project ps codes, to be used against ProjectTRS table.
	// 	let projectsWithBudgetInfo = []

	// 	await axios.post(axiosURL,{query}, axiosConfig)
	// 	.then((response)=>{
	// 		console.log(response, '<--- my response');
	// 		// if (response.data.data.boards) {
	// 		// 	response.data.data.boards[0].items.map((aBoardItem)=>{
	// 		// 		let assignedStatusColumn = aBoardItem.column_values[50].text
	// 		// 		if(assignedStatusColumn !== null || ''){
	// 		// 			let psProjectNumber = aBoardItem.column_values[2].text;
	// 		// 			projectsWithBudgetInfo.push(psProjectNumber)
	// 		// 		}
	// 		// 	})
	// 		// } else {
	// 		// 	console.error('malformed_query');
	// 		// 	console.error(response.data.errors);
	// 		// }
	// 	})
	// 	.catch((err)=> {
	// 		console.error('server_response');
	// 		console.error(err, `status_code: ${res.statusCode}`);
	// 	});
		
	// 	res.locals.assignedProjectCodes = assignedProjectCodes
	// 	next();
	// },
});