const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config(); 
const port = process.env.SERVER_PORT_8080

/* MIDDLEWARE */
const { getProjectByID } = require('./middleware/harvestMiddleware');
const { prepareHarvestDataForMondayApp, sendHarvestDataToMondayApp } = require('./middleware/mondayMiddleware');

//See here for config options ==> http://expressjs.com/en/starter/static-files.html
app.use('/static', express.static(path.join(__dirname, 'dist/index.html')))

/* Harvest API */

app.use(getProjectByID)

/* Monday.com API w/GrapQL */

app.use(prepareHarvestDataForMondayApp)
app.use(sendHarvestDataToMondayApp)

/* Routes */

app.get('/', (req, res, next) => {
  var responseText = 'Hello World!'
  res.send(responseText)
})

/* Log Port To Terminal */

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
