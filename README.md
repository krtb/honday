# honday

![alt text](https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fstatic.carsdn.co%2Fcldstatic%2Fwp-content%2Fuploads%2Fhyundai-prophecy-concept-01-angle--black--exterior--front.jpg&f=1&nofb=1)

## Table of Contents
* [General Information](#general-information)
* [Installation](#installation)
* [Usage](#usage)
* [Technologies](#technologies)

## General Information
* Honday, [Harvest](https://help.getharvest.com/api-v2/) + [Monday](https://api.developer.monday.com/docs), is a backend application.
  * Requests data from Harvest
  * Maps data to GraphQL values required by Monday.com
  * Sends data to project boards, in Monday.com
* The purpose is to facilitate the inputting of project tracking information into multiple sources.
* By doing so, our management team will 
  * have increased available time
  * be less error prone 
  * can further develop this application to automate additional actions

## Installation
* Check package.json to validate which is the minimal version of Node required.
* Access necessary secrets, required by .env.example
* Setup local .env file with your credentials
  * Do NOT track in git.
* In high level directory, run `npm i`
* To run the development version of the server, run `npm run serve`

## Usage
* Currently only imports projects from Harvest
    * [GET /v2/projects](https://help.getharvest.com/api-v2/projects-api/projects/projects/)
* Application is scheduled to run every day at Midnight, EST
* Will find all projects that have been recently updated and push to Monday.com

## Support
Owned by [Pendo's](https://pendo.io/) Proffesional Services Engineering team.

## Technologies
* [Node](https://www.codecademy.com/articles/what-is-node)
    * JS runtime
    * Provides access to globals such as `module`, `require()`, `process`
    * Built-in modules, such as `https`, `fs`, `os` and `path`
* [Babel](https://babeljs.io/)
    * Transpiler for various versions of JavaScript
    * Allows the use of modern JS features across most browser versions
* [Webpack](https://webpack.js.org)
    * bundles files, in order to be injected into the dependency graph for HTML
    * loaders provide Webpack ability to process different types of files
* [Express](expressjs.com)
    * Web app framework, provides middleware and methods for API creation
* [node-cron](https://www.npmjs.com/package/node-cron)
    * Runs cron job requests on a scheduled basis
* [axios](https://www.npmjs.com/package/axios)
    * HTTP Client
* [Twilio](https://www.twilio.com/docs/sms/send-messages)
    * Texting service, used to alert team if error in data migration

## License
* [MIT](https://mit-license.org/)

## Author
* [krtb](https://github.com/krtb)

## Project Status
* In Development