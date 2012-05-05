var ut = require('./utils'),
    tt = require('./template'),
    fs = require('fs');

var fn = 'ui/server/code_editor.html';
console.log(tt.compile(fs.readFileSync(fn).toString()).toString());