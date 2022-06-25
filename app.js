const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config(); 
const port = process.env.PORT || 8080;

/* Cron Job */
const cron = require('node-cron');

/* Twilio */
//TODO: Add back in when testing complete
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const client = require('twilio')(accountSid, authToken);
// const devTwilioNumber = process.env.DEV_TWILIO_NUMBER;
// const devNumberToContact = process.env.DEV_PERSONAL_NUMBER;

/* Parse CSV file */
const { 
  getMainBoardItemsToDelete,
  deleteBoardItems,
  parseCSV,
  getProjectTRSBoardProjectData, 
  compareHarvestCSVAndProjectTRSBoard,
  getUserFromMonday,
  viewMondayBoardValues,
  sumLastFiscalYear, 
  postMondayItems, 
  getHarvestCSVData,
} = require('./middleware/csvParse');

/* Time_Entries Board */
const {
  getAllTimeEntries,
  buildTimeEntriesForMondayBoard,
  addEmailAndIdToTimeEntry,
} = require('./middleware/harvestTimeEntries');

const { 
  compareExisitingAndNewProjectUserAssignments, 
  // getUserFromMonday,
  sendNewHarvestDataToMondayApp, 
} = require('./middleware/mondayTimeEntries');

/* Project Roll-Up Board, Hours */
const {
  getProjectPsCodesMonday,
  getProjectNamesMonday,
  getExistingMondayBoardValues,
  updateMondayHours,
  killRequests
} = require('./middleware/mondayHours');

const {
  findHarvestProjectByPsCode,
  findTimeEntriesByProjectId,
  getProjectBudgetReports,
} = require('./middleware/harvestHours');

//See here for config options ==> http://expressjs.com/en/starter/static-files.html
// app.use('/static', express.static(path.join(__dirname, 'dist/index.html')));

/*================ Time Entry Section ================*/
console.log('Honday Bot is Starting Work')
//Note: To find which column value types to create
//app.use(viewMondayBoardValues); TODO: find pulse ids, to pass into TRS board.
//Note: To delete items from a board.
app.use(getMainBoardItemsToDelete);
app.use(deleteBoardItems);
// app.use(getUserFromMonday);
// app.use(parseCSV);
// app.use(getProjectTRSBoardProjectData);
// app.use(compareHarvestCSVAndProjectTRSBoard);
// app.use(sumLastFiscalYear);
// app.use(postMondayItems);

//----------------> Harvest API
// app.use(getAllUsersToFilterIDs);
// app.use(getAllTimeEntries);
// app.use(buildTimeEntriesForMondayBoard);
// app.use(addEmailAndIdToTimeEntry);
// //----------------> Monday.com API
// app.use(compareExisitingAndNewProjectUserAssignments);
// app.use(sendNewHarvestDataToMondayApp)

// /*================ Actual_Hours Section ================*/

// //----------------> Monday API
// app.use(getProjectPsCodesMonday)
// app.use(getProjectNamesMonday)
// app.use(getExistingMondayBoardValues)
// //----------------> Harvest API
// app.use(findHarvestProjectByPsCode)
// app.use(getProjectBudgetReports)
// //----------------> Monday.com
// app.use(updateMondayHours)

/* Comment Back in When Hosting Plan Solved */
// app.use((req, res, next)=>{

//   let cronIsScheduled = true;

//   try {
    
//     if(cronIsScheduled === true){
    
//     const job = cron.schedule('30 0-59 * * * *', () => {
//       //TODO: '0 0 0 * * *' === run every day at 12:00 AM
//       console.log('---------------------');
//       console.log('Honday Bot sending data ... ');
          
//       /* Harvest API */
//       app.use(getProjectByID)

//       /* Monday.com API w/GrapQL */
//       app.use(prepareHarvestDataForMondayApp)
//       app.use(sendHarvestDataToMondayApp)
      
//       return next()

//       },{
//         /* exposing properties for clarity */ 
//         scheduled: true,
//         timezone: 'America/New_York'
//       }
      
//       );
      
//       job.start()
//       return next()
//     }
//   } catch (error) {

//     console.log('Honday Bot is buggin out ...');
//     client.messages
//     .create({
//         body: 'Honday Bot ran into an error when syncing projects.',
//         from: devTwilioNumber,
//         to: devNumberToContact
//       }, (error, message) => {

//         if (!error) {

//           console.log('Honday Bot texted a human for help ...');

//           // SID info ==> https://support.twilio.com/hc/en-us/articles/223134387-What-is-a-Message-SID-
//           console.log('Text Sent! SID  for this SMS message is:');
//           console.log(message.sid);
  
//           console.log('Message sent on:');
//           console.log(message.dateCreated);

//         } else {

//           console.log('Twilio error, please see below ...');
//           console.log(error);

//         }

//       }
//     )
//     .then(message => console.log(message.sid));

//     /* display error message json on localhost page */
//     res.json(error.message)
//   }

// })
/* Routes */
app.get('/', function (req, res) {
  var responseText = 'Hello, World!'
  res.send(responseText)
})

// /* Log Port To Terminal */
app.listen(port, function (req, res) {
  console.log(`HondayBot online at http://localhost:${port}`)
})