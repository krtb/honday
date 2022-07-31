const axios = require('axios');
const _ = require('lodash');

const { parseCsvFileToData } = require('../utils/parseCSV.js');
const { avoidTimeout } = require('../utils/avoidTimeout.js');

/** Global Variables */
let mondayBoardID = process.env.MONDAY_DEV_BOARD_ID;
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
          items {
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
          console.log(response.data.data.boards[0])
          console.log(`READ items and item columns.`);
        } else {
          console.error('malformed_query')
          console.error(response.data.errors)
        }
      })
      .catch((err)=>{
        console.error('server_response')
        console.error(err, `status_code: ${res.statusCode}`);
      });
      next();
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
   * First will ready from Board, GET items if available, then DELETE.
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
  getProjectTRSBoardProjectData: async (req, res, next)=>{
    //Note: Required in order to create Linked Items via their IDs.
    console.log("Pulling Board A project items, to match against CSV IDs of: Harvest PS Codes.");

    {
      const projectTrsBoard = 2495489300;
      
      let query = `{
        boards (ids: ${projectTrsBoard}) {
          items {
            id
            name
            column_values {
              id
              title
              value
            }
          }
        }
      }`;

      //Note: Utility functions --->
      const projectTRSBoardObjectsCollection = []
      function collectBoardAColumnNameAndIDItems(boardAItems) {
          const projectTrsItemsNameIdColumnObjects = boardAItems
          projectTrsItemsNameIdColumnObjects.map((boardAItem)=>{
            projectTRSBoardObjectsCollection.push(boardAItem)
          })
      }
  
      await axios.post("https://api.monday.com/v2",  {
        'query': query,
      },
      {
        headers: {
          'Content-Type': `application/json`,
          'Authorization': `${process.env.MONDAY_APIV2_TOKEN_KURT}` 
        },
      })
      .then((response)=>{
        let itemsFromResponse = response.data.data.boards[0].items
        
        collectBoardAColumnNameAndIDItems(itemsFromResponse)
        arrayOfProjectTrsBoardObjects = itemsFromResponse

      })
      .catch((error)=>{
        console.log('Here is my error:' + error, 'error');
      })

      console.log(`${arrayOfProjectTrsBoardObjects.length - 1}` + ` board A Items Collected from: ProjectTrsBoard`)
      next()
    }
  }
});