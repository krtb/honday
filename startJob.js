// Trigger to start site, for Express Middlware

let request = require('request');

let options = {
  'method': 'GET',
  'url': 'https://honday.herokuapp.com/',
  'headers': {
  }
};

request(options, function (error, response) {
  if (error) throw new Error(error)
});
