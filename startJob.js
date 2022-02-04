// Trigger to start site, for Express Middlware

let request = require('request');

let options = {
  'method': 'GET',
  'url': 'https://honday.herokuapp.com/',
  'headers': {
  }
};

module.exports.start_job = function(){
request(options, function (error, response) {
  if (error) throw new Error(error)
});

}

require('make-runnable');
