const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config(); 
const port = process.env.SERVER_PORT_8080

/* CRON JOB */
const cron = require('node-cron');

/* MIDDLEWARE */
const { getProjectByID } = require('./middleware/harvestMiddleware');
const { prepareHarvestDataForMondayApp, sendHarvestDataToMondayApp } = require('./middleware/mondayMiddleware');

//See here for config options ==> http://expressjs.com/en/starter/static-files.html
app.use('/static', express.static(path.join(__dirname, 'dist/index.html')))

app.use((req, res, next)=>{

  let cronIsScheduled = true;

  try {

    if(cronIsScheduled === true){
    
    const job = cron.schedule('*/1 * * * *', () => {
    
    console.log('---------------------');
    console.log('Honday Bot sending data ... ');
        
    /* Harvest API */
    app.use(getProjectByID)

    /* Monday.com API w/GrapQL */

    app.use(prepareHarvestDataForMondayApp)
    app.use(sendHarvestDataToMondayApp)

    return next()

    },{
      scheduled: true,
      timezone: 'America/New_York'
    }
    
    );
    
    job.start()
    return next()

    }
  } catch (error) {
    res.send(error)
  }

})

/* Routes */
app.get('/', (req, res, next) => {
  var responseText = 'Hello World!'
  res.send(responseText)
})


/* Log Port To Terminal */
app.listen(port, () => {
console.log(`Honday bot is hanging in http://localhost:${port}`)
})