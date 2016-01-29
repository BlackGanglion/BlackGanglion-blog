var MongoClient = require('mongodb').MongoClient;
var settings = require('../settings');
var async = require('async');

var File = function(){};

module.exports = File;

File.getYearList = function(callback){
  async.auto({
		connect: function(asynccallback) {
			MongoClient.connect('mongodb://localhost:27017/blog', function(err, db) {
				var collection = db.collection(settings.collections[0]);
				asynccallback(err, collection);
			});
		},

		allArticles: ['connect', function(asynccallback, results) {
			results.connect.find({}).sort({ time: -1 }).toArray(function (err, posts) {
        var postWithTimeList = [];
				posts.forEach(function (doc) {
          var res = doc.time.day.split('-');
          postWithTimeList.push({
            title: doc.title,
            month: res[1],
            day: res[2],
            year: res[0],
            postId: doc.postId
          });
				});
				asynccallback(err, postWithTimeList);
			});
		}],

    handle: ['connect', 'allArticles', function(asynccallback, results) {
      var yearList = [], yearPointer = 0;
      //var monthList = [], monthPointer = 0;
      results.allArticles.forEach(function(element){
        if(yearPointer === 0 || yearList[yearPointer - 1]['year'] != element.year){
          yearPointer ++;
          yearList.push({
            year: element.year
          });
        }
        /*
        if(monthPointer === 0){
          monthPointer ++;
          monthList.push({
            year: element.year,
            month: element.month
          });
        } else {
          if(monthList[monthPointer - 1]['year'] != element.year || monthList[monthPointer - 1]['month'] != element.month){
            monthPointer ++;
            monthList.push({
              year: element.year,
              month: element.month
            });
          }
        }
        */
      });
      var resList = [];
      var yearMonthMap = [];
      for(var i = 0; i < results.allArticles.length; i++){
        var nowYear = results.allArticles[i]['year'];
        var nowMonth = results.allArticles[i]['month'];
        var nowDay = results.allArticles[i]['day'];

        var index = nowYear + '-' + nowMonth;
        if(!resList.hasOwnProperty(index)){
          resList[index] = [];
        }
        Array.prototype.push.call(resList[index], {
          title: results.allArticles[i]['title'],
          month: nowMonth,
          day: nowDay,
          year: nowYear,
          postId: results.allArticles[i]['postId']
        });
      }
      asynccallback(null, {
        year: yearList,
        res: resList
      });
    }]
	}, function(err, results) {
    //console.log(results.handle.year);
    //console.log(results.handle.res);
		callback(err, results.handle.year, results.handle.res);
	});

}
