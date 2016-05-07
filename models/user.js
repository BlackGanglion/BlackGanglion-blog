var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var settings = require('../settings');

function User(user) {
  this.name = user.name;
  this.password = user.password;
  this.email = user.email;
};

module.exports = User;

/*
User.prototype.save = function(callback) {

  var user = {
    name: this.name,
    password: this.password,
    email: this.email
  };

  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    db.collection('users', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      collection.insert(user, {
        safe: true
      }, function (err, user) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null, user[0]);
      });
    });
  });
};
*/


User.get = function(name, callback) {
  async.auto({
    init: function(asynccallback) {
      MongoClient.connect('mongodb://localhost:27017/blog', function(err, db) {
        asynccallback(err, db);
      });
    },

    connect: ['init', function(asynccallback, results) {
      var collection = results.init.collection(settings.collections[1]);
      asynccallback(null, collection);
    }],

    findUser: ['connect', function(asynccallback, results){
      results.connect.findOne({ name: name }, function (err, user) {
        asynccallback(err, user);
      });
    }]
  }, function(err, results){
    results.init.close();
    callback(err, results.findUser);
  });
}
