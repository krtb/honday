const axios = require('axios');
const _ = require('lodash');

const { avoidTimeout } = require('../utils/avoidTimeout.js');
const { writeJsonToFile, readFromJsonFile } = require('../utils/readWriteJSON.js');
const localInputFileCreationPath = '../inputFiles/inputData.json';
const test_json_file = require('../inputFiles/inputData.json');
const resultOutputPath = '../outputFiles/outData3.json';

/** Global Variables */
let mondayBoardID = process.env.PROEJCT_ROLLUP_BOARD;
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

Object.assign(module.exports, {
  /**
   * READ Items and Column Values from Monday.com board.
   * @async
   * @function next From Express Router, allows Server to move on to next route.
   */
  boardItemIdsTotalCount: async (req, res, next) =>{
    {
      let readBoardItemsID = `{
        boards (ids: ${mondayBoardID}) {
          items {
            id
            name
          }
        }
      }`;

      /**
       * Store response data as local JSON file. 
       * @param {*} response - API response with data objects
       * @param {*} localInputFileCreationPath - input file path, defined via global variable.
       * @function writeJsonToFile - Utility function which performs data transformation.
       */
      function createLocalInputFile(localInputFileCreationPath, response, writeJsonToFile) {
        let items = [];

        response.data.data.boards[0].items.forEach(anItem => {
          items.push(anItem)
        })

        writeJsonToFile(localInputFileCreationPath, items);
      }

      await axios.post(axiosURL,{query: readBoardItemsID}, axiosConfig)

      .then((response)=>{
        if (response.data.data.boards) {
          
          /** Comment in to create local JSON file of requested data. */
          // createLocalInputFile(localInputFileCreationPath, response, writeJsonToFile)

          res.locals.totalItemIdsCount = response.data.data.boards[0].items.length
          res.locals.itemIds = response.data.data.boards[0].items
          console.log(`READ ${res.locals.totalItemIdsCount} items and item columns.`);

        } else {
          console.error('malformed_query')
          console.error(response.data.errors)
        }
      })
      .catch((err)=>{
        console.error('server_response')
        console.error(err, `status_code: ${res.statusCode}`);
      });
      next()

      // readFromJsonFile()
      // writeJsonToFile(containAllItemsAndColumns)
    }
  },
  /**
   * READ Board, Owner and Columns from Monday.com board.
   * @async
   * @function next From Express Router, allows Server to move on to next route.
   */
  boardOwnerColumnData: async (req, res, next)=>{
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
      await axios.post(axiosURL,{query}, axiosConfig)
      .then((response)=>{
        if (response.data.data.boards) {
          let boardInfo = response.data.data.boards;
          let ownerInfo = response.data.data.boards[0]["owners"];
          let columnInfo = response.data.data.boards[0]["columns"];

          console.log(boardInfo, ownerInfo, columnInfo);
          console.log("READ boardInfo, ownerInfo, and columnInfo.");
        } else {
          console.error('malformed_query');
          console.error(response.data.errors);
        }
      })
      .catch((err)=> {
        console.error('server_response');
        console.error(err, `status_code: ${res.statusCode}`);
      });

      next();
    }
  },
  /**
   * DELETE Action for Items on a Monday.com board.
   * @param {number} mondayBoardID - Id from a Monady board url.
   * (.com/boards/number) Set as a global variable.
   * First will READ Items from Board, GET items if available, then DELETE all items.
   */
  deleteBoardItems: async (req, res, next)=>{
    console.log('=============== Starting DELETION of items! ===============');

      let getBoardItemIds = `{
          boards (ids: ${mondayBoardID}) {
            items {
              id
            }
          }
        }`;

      let idsFromBoards = []

      await axios.post(axiosURL, {query : getBoardItemIds}, axiosConfig)
      .then(res => {
        try {
          if((!res.data.errors) && 
          (typeof res.data.data.boards[0].items === 'object') &&
          ( res.data.data.boards[0].items.length > 0) 
          ){
            let onlyMyIds = res.data.data.boards[0].items.map((anItem)=> anItem.id? anItem.id : 'Missing Ids')
            idsFromBoards.push(onlyMyIds)
          } else if(res.data.data.boards[0].items.length === 0){
            console.error(`---> ${res.data.data.boards[0].items.length} Items, none to delete ...`)
          } 
          else {
            console.error(res.data.errors, `---> Monday.com returned an error ...`)
          }
        } catch (error) {
          console.error(error, `---> Malformed Query ... `);
        }
      })
      .catch((err)=>{
        console.error(err, `---> Server Error ... `)
      })
      
      if(idsFromBoards.length > 0){
        await avoidTimeout(idsFromBoards, axiosURL, true)
      }
      
  },
  getUserFromMonday: async (req, res, next) => {
    //Note: Monday.com User IDs required to create related User in Monday.com.
    console.log('Getting all Monday.com User emails and ids.');

    {
      let allMondayUsersContainer = [];
      let usersEmailIdName = "query { users { email id name} }"
      
      await axios.post("https://api.monday.com/v2",  {
        'query': usersEmailIdName,
      }, {
          headers: {
            'Content-Type': `application/json`,
            'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
          },
      }
      ).then((response)=>{

        allMondayUsersContainer = response.data.data.users

        return response

      }).catch((error)=>{
        console.log('Here is my error:' + error, 'error');
      })
  
      res.locals.allMondayUsersContainer = allMondayUsersContainer
      console.log(`${allMondayUsersContainer.length - 1} Monday.com Users collected.`)

      next()
    }
  },
  /**
   * EDIT Action for Items on a Monday.com board.
   * @param {number} mondayBoardID - Id from a Monady board url.
   * (.com/boards/number) Set as a global variable.
   * First will READ Items from Board, GET items if avaiblable, then will EDIT all item names on board.
   */
  getItemsEditItemName: async (req,res,next)=>{
    {
      let itemIdNameAndColumnValues = `{
        boards (ids: ${mondayBoardID}) {
          items {
            id
            name
            column_values {
              id
            }
          }
        }
      }`;

      // TODO: Uncomment after testing local JSON file.
      // let totalItemIdsCount = res.locals.totalItemIdsCount
      // let itemIds = res.locals.itemIds.map((singleItem) => singleItem.id)
      // let itemNames = res.locals.itemIds.map((singleItem) => singleItem.name)
      
      function parseOnSepcifiedStringCharacter(arrayofStrings) {
        let mycounter = [];

        arrayofStrings.forEach((itemIdAndName)=> {

          let onlyCheckForFirstCharacter = itemIdAndName.name.split('')[0];

          if (onlyCheckForFirstCharacter === '(' ) {
            mycounter.push(itemIdAndName)
          }

        })
        return mycounter
      }
      
      let myProjectsToEdit = parseOnSepcifiedStringCharacter(test_json_file)

      function reverseString(arrayOfStrings) {

        let myMap = arrayOfStrings.map((aProjectItem)=>{

          let myPsCodeCharacters = [];

          //TODO: uncomment if using.
          aProjectItem.name.split('').find((aCharacter)=> {
            if(aCharacter === ')'){
              return true
            } else {
              myPsCodeCharacters.push(aCharacter)
            }
            return false
          });

          let onlyPSCode = myPsCodeCharacters.join('') + ')';

          let splitTitleArray = aProjectItem.name.split(' ')

          splitTitleArray.find((aCharacter)=>{
            if(aCharacter === ')'){
              return true
            } else {
              myPsCodeCharacters.push(aCharacter)
            }
            return false
          })
          
          //.slice(0,2).join(' ') + ' )'
          let onlTitle = aProjectItem.name.split(' ').slice(3, aProjectItem.length).join(' ')
          
          let reversedProjectTitle = onlTitle + " " + onlyPSCode
          // let nameSpaceRemoved = projectName.split('').splice(1,projectName.length).join('')
          // let reversedProjectTRSItem = nameSpaceRemoved + " " + mergedParans
          let myNewObj = {id: aProjectItem.id, name:reversedProjectTitle}
          return myNewObj
        })

        return myMap
      }

      let myTransformedData = reverseString(myProjectsToEdit)
      
      writeJsonToFile(resultOutputPath, myTransformedData)
    }
  },
});