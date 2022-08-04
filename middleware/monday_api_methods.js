const axios = require('axios');
const _ = require('lodash');

const { avoidTimeout } = require('../utils/avoidTimeout.js');
const { writeJsonToFile } = require('../utils/readWriteJSON.js')

/** Global Variables */
let mondayBoardID = process.env.MONDAY_TRS_BOARD_ID;
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
  itemsColumnValuesData: async (req, res, next) =>{
    {
      let query = `{
        boards (ids: ${mondayBoardID}) {
          items (limit:100) {
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

      let containAllItemsAndColumns = []
      await axios.post(axiosURL,{query}, axiosConfig)
      .then((response)=>{
        if (response.data.data.boards) {
          response.data.data.boards[0].items.forEach(anItem => {
            containAllItemsAndColumns.push([anItem.id, anItem.column_values])
          })
          console.log(`READ ${response.data.data.boards[0].items.length} items and item columns.`);
        } else {
          console.error('malformed_query')
          console.error(response.data.errors)
        }
      })
      .catch((err)=>{
        console.error('server_response')
        console.error(err, `status_code: ${res.statusCode}`);
      });

      writeJsonToFile(containAllItemsAndColumns)
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
          items {
            id
            name
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
      let query = "query { users { email id name} }"
      
      await axios.post("https://api.monday.com/v2",  {
        'query': query,
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

      let mondayItemObjectIdName = [];
      await axios.post(axiosURL,{query: itemIdNameAndColumnValues}, axiosConfig)
      .then((response)=>{

        if (response.data.data.boards) {

          let items = response.data.data.boards[0].items
          items.forEach((singleItem) => {
            let itemID = singleItem.id
            mondayItemObjectIdName.push(itemID)
          })

          console.log(mondayItemObjectIdName, '<--- item ids to EDIT...')
          console.log(`READ ${response.data.data.boards[0].items.length} items and item columns.`);

        } else {
          console.error('malformed_query')
          console.error(response.data.errors)
        }
      })
      .catch((err)=>{
        console.error('server_response')
        console.error(err, `status_code: ${res.statusCode}`);
      });

      function mapDataToQuery(mondayItemObjectIdName) {
        let holdMutations = [];
        mondayItemObjectIdName.map((anItemId)=>{
          let itemTitleToChange = '{"name": "Change name."}'
          let myJSONString = JSON.stringify(itemTitleToChange, null, 2);

          let stringifiedQuery = `mutation { change_multiple_column_values (item_id: ${anItemId}, board_id: ${mondayBoardID}, column_values: ${myJSONString} ) {name} }`;

          holdMutations.push(stringifiedQuery);
        })
        return holdMutations
      }

      let itemIdsWithGraphQlFormat = mapDataToQuery(mondayItemObjectIdName)

      if(mondayItemObjectIdName.length > 0){
        await avoidTimeout(mondayItemObjectIdName, itemIdsWithGraphQlFormat)
      }
    }
  },
});