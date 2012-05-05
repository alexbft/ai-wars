var deferred = require('deferred');
deferred(null).invoke('a').then(console.log, function() { console.log('an error happened'); });