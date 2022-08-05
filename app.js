const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config(); 
const port = process.env.PORT || 8080;

const { 
  boardOwnerColumnData,
  deleteBoardItems,
  getUserFromMonday,
  boardItemIdsTotalCount,
  getItemsEditItemName,
} = require('./middleware/monday_api_methods');

const { 
  mapCsvToData,
  compareHarvestCSVAndProjectTRSBoard,
  postMondayItems,
} = require('./middleware/migrate_getharvest.com');

/** CREATE Actions */
// app.use(getUserFromMonday);
// app.use(mapCsvToData);
// app.use(getProjectTRSBoardProjectData);
// app.use(compareHarvestCSVAndProjectTRSBoard);
// app.use(postMondayItems);

/** READ Actions */
// app.use(boardItemIdsTotalCount); //TODO: using
// app.use(boardOwnerColumnData);

/** EDIT Actions */
app.use(getItemsEditItemName); //TODO: using

/** DELETE Actions */
// app.use(deleteBoardItems);

app.get('/', function (req, res) {
  var responseText = 'Hello, World!'
  res.send(responseText)
})

app.listen(port, function (req, res) {
  console.log(`HondayBot online at http://localhost:${port}`)
})