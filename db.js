var mongoose = require('mongoose'),
  _ = require('underscore'),
  deferred = require('deferred'),
  Promise = mongoose.Promise;

mongoose.connect('http://localhost:27017/aiwars');

exports.mongoose = mongoose;

function mapReduceHelper(map, reduce, options) {
  var d = deferred();
  var cmd = _.extend({}, {
    mapreduce: this.collection.name,
    map: map && map.toString(),
    reduce: reduce && reduce.toString(),
    out: { inline: 1 },
    jsMode: true
  }, options);
  mongoose.connection.db.executeDbCommand(cmd, function (err, res) {
    if (err) d.resolve(err);
    else {
      res = res.documents[0];
      if (!res.ok) {
        console.log('MapReduce error: ', res);
        d.resolve(new Error(res.err));
      } else if (res.results) {
        d.resolve(res.results);
      } else {
        mongoose.connection.db.collection(res.result, function (err, coll) {
          if (err) d.resolve(err);
          else d.resolve(coll);
        });
      }
    }
  });
  return d.promise;
}

/*function groupHelper(cond, keys, initial, reduce) {
  var d = deferred();
  var key = {};
  keys.forEach(function (k) { key[k] = true; });
  mongoose.connection.db.executeDbCommand({
    group: {
      ns: this.collection.name,
      cond: cond,
      key: key,
      initial: initial,
      $reduce: reduce.toString()
    }
  }, function (err, res) {
    if (err) {
      d.resolve(err);
    } else {
      d.resolve(res.documents[0]);
    }
  });
  return d.promise;
}*/

function groupMax(keys, valueSelector, options) {
  if (keys.length == 1) keys = keys[0];
  var mapFunc;
  if (!_.isArray(keys)) {
    mapFunc = "function() { emit(this[keys], this); }";
  } else {
    mapFunc = "function() { var i, key, emitKey = {}; for (i in keys) { key = keys[i]; emitKey[key] = this[key]; }; emit(emitKey, this); }";
  }
  var reduceFunc;
  if (!_.isFunction(valueSelector)) {
    reduceFunc = "function(key, docs) { var res = null, v, resv, sel = " + JSON.stringify(valueSelector) + "; docs.forEach(function(doc) {v = doc[sel]; if (res === null || v > resv) { res = doc; resv = v; } }); return res; }";
  } else {
    reduceFunc = "function(key, docs) { var res = null, v, resv, sel = " + valueSelector.toString() + "; docs.forEach(function(doc) {v = sel(doc); if (res === null || v > resv) { res = doc; resv = v; } }); return res; }";
  }
  var opt = _.extend({}, {
    map: mapFunc,
    reduce: reduceFunc,
  }, options);
  opt.scope = _.extend({}, opt.scope, { keys: keys });
  return this.mapReduce(null, null, opt).then(function(res) {
    return _.pluck(res, 'value');
  });
} 

exports.model = function (name, schemaObj, init) {
  var schema = new mongoose.Schema(schemaObj, { strict: true });

  function mapPromisify(target) {
    return function (method) {
      target['p_' + method] = deferred.promisify(function () { return this[method].apply(this, arguments); });
    }
  }

  ['save'].forEach(mapPromisify(schema.methods));
  ['find', 'findOne', 'findById', 'update', 'count', 'create'].forEach(mapPromisify(schema.statics));

  schema.statics.mapReduce = mapReduceHelper;
  schema.statics.groupMax = groupMax;

  if (init) init(schema);
  return mongoose.model(name, schema);
}

  exports.ObjectId = mongoose.ObjectId;

  mongoose.Promise.prototype.asDeferred = function () {
    var d = deferred();
    this.addCallback(function () {
      d.resolve.apply(d, arguments);
    });
    this.addErrback(function () {
      d.resolve.apply(d, arguments);
    });
    return d.promise;
  };

  exports.mongo = function () {
    return mongoose.connection.db;
  }