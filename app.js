const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config(); 
const port = process.env.PORT || 8080;

const { 
  boardOwnerColumnData,
  deleteBoardItems,
  mapCsvToData,
  getProjectTRSBoardProjectData, 
  compareHarvestCSVAndProjectTRSBoard,
  getUserFromMonday,
  itemsColumnValuesData,
  postMondayItems, 
} = require('./middleware/csvParse');

/** CREATE Actions */
// app.use(getUserFromMonday);
// app.use(mapCsvToData);
// app.use(getProjectTRSBoardProjectData);
// app.use(compareHarvestCSVAndProjectTRSBoard);
// app.use(postMondayItems);

/** READ Actions */
// app.use(itemsColumnValuesData);
// app.use(boardOwnerColumnData);

/** DELETE Actions */
// app.use(deleteBoardItems);

app.get('/', function (req, res) {
  var responseText = 'Hello, World!'
  res.send(responseText)
})

app.listen(port, function (req, res) {
  console.log(`HondayBot online at http://localhost:${port}`)
})