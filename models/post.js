var settings = require('../settings');
var markdown = require('markdown').markdown;
var async = require('async');
var MongoClient = require('mongodb').MongoClient;

function Post(name, title, post, type) {
	this.name = name;
	this.title = title;
	this.post = post;
	this.type = type;
}

module.exports = Post;

//存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
	var date = new Date();

	//存储各种时间格式，方便以后扩展
	var time = {
		date : date,
		year : date.getFullYear(),
		month : date.getFullYear() + "-" + (date.getMonth() + 1),
		day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
		minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
		date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
	}

	//要存入数据库的文档
	var post = {
		name: this.name,
		time: time,
		title: this.title,
		post: this.post,
		postId: null,
		type: this.type,
		watch: 0,
		comment: 0
	};

	async.auto({
		connect: function(asynccallback) {
			MongoClient.connect('mongodb://localhost:27017/blog', function(err, db) {
				var collection = db.collection(settings.collections[0]);
				asynccallback(err, collection);
			});
		},

		countPosts: ['connect', function(asynccallback, results) {
			results.connect.count(function(err, count){
				//统计现有文档数，那么插入postId+1
				post.postId = count + 1;
				asynccallback(err, null);
			})
		}],

		insertPost: ['connect', 'countPosts', function(asynccallback, results) {
			results.connect.insert(post, { safe: true }, function (err) {
				asynccallback(err, null);
			});
		}]
	}, function(err, results){
		callback(err);
	});
}

//读取文章及其相关信息, 统计各个分类的文章数
Post.getALL = function(type, page, callback) {

	async.auto({
		connect: function(asynccallback) {
			MongoClient.connect('mongodb://localhost:27017/blog', function(err, db) {
				var collection = db.collection(settings.collections[0]);
				asynccallback(err, collection);
			});
		},

		countArticles: ['connect', function(asynccallback, results) {
			results.connect.count(null, function(err, count) {
				asynccallback(err, count);
      });
		}],

		listArticles: ['connect', function(asynccallback, results) {
			results.connect.find(null, {
				skip: (page - 1) * 5,
				limit: 5
			}).sort({
				time: -1
			}).toArray(function (err, posts) {
				posts.forEach(function (doc) {
					var content = doc.post.substr(0, 600);
					doc.post = markdown.toHTML(content+'......');
				});
				asynccallback(err, posts);
			});
		}],

		//未分类
		countunClassified: ['connect', function(asynccallback, results) {
			results.connect.count({type: 'unclassified'}, function(err, count){
				asynccallback(err, count);
			});
		}],

		//Web开发
		countWebDevelop: ['connect', function(asynccallback, results) {
			results.connect.count({type: 'webDevelop'}, function(err, count){
				asynccallback(err, count);
			});
		}],

		//数据可视化
		countDataVisualization: ['connect', function(asynccallback, results) {
			results.connect.count({type: 'dataVisualization'}, function(err, count){
				asynccallback(err, count);
			});
		}],

		//技术随笔
		countTechnology: ['connect', function(asynccallback, results) {
			results.connect.count({type: 'technology'}, function(err, count){
				asynccallback(err, count);
			});
		}],

		countLife: ['connect', function(asynccallback, results) {
			results.connect.count({type: 'life'}, function(err, count){
				asynccallback(err, count);
			});
		}]
	}, function(err, results) {
		//console.log(err);

		var everyTypeCount = {
			unclassified: results.countunClassified,
			webDevelop: results.countWebDevelop,
			dataVisualization: results.countDataVisualization,
			technology: results.countTechnology,
			life: results.countLife
		}
		//成功, 以数组形式返回查询的结果
		callback(null, results.listArticles, everyTypeCount, results.countArticles);
	});
}

//根据ID获取一篇文章
Post.getOneById = function(id, flag, callback) {
	async.auto({
		connect: function(asynccallback) {
			MongoClient.connect('mongodb://localhost:27017/blog', function(err, db) {
				var collection = db.collection(settings.collections[0]);
				asynccallback(err, collection);
			});
		},

		findPost: ['connect', function(asynccallback, results) {
			results.connect.findOne({ postId: id }, function (err, doc) {
				if(doc == null){
					doc = -1;
				}else{
					//解析 markdown 为 html
					if(flag === '1') doc.post = markdown.toHTML(doc.post);
				}
				asynccallback(err, doc);
			});
		}],

		updateWatch: ['connect', 'findPost', function(asynccallback, results) {
			if(results.findPost === -1) {
				asynccallback(null, null);
			} else {
				var newCount = results.findPost.watch + 1;
				if(newCount === 10000002) newCount = 10000001;

				results.connect.update({ postId: id },{
					$set: {watch: newCount}
				},function(err){
					asynccallback(err, null);
				});
			}
		}],

		findPre: ['connect', 'findPost', function(asynccallback, results) {
			if(results.findPost === -1) {
				asynccallback(null, null);
			} else {
				results.connect.findOne({ postId: (id - 1) }, function(err, linkPost){
					if(linkPost === null){
						asynccallback(err, null);
					} else {
						asynccallback(err, linkPost.title);
					}
				});
			}
		}],

		findNext: ['connect', 'findPost', function(asynccallback, results) {
			if(results.findPost === -1) {
				asynccallback(null, null);
			} else {
				results.connect.findOne({ postId: (id + 1) }, function(err, linkPost){
					if(linkPost === null){
						asynccallback(err, null);
					} else {
						asynccallback(err, linkPost.title);
					}
				});
			}
		}]
	}, function(err, results) {
		if(results.findPost === -1){
			callback(null, results.findPost, null);
		} else {
			if(results.findPre === null) results.findPre = '没有上一篇文章了';
			if(results.findNext === null) results.findNext = '没有下一篇文章了';
			var linkTitle = {
				pre: results.findPre,
				next: results.findNext
			}
			callback(null, results.findPost, linkTitle);
		}
	});
}

Post.getList = function (callback) {
	async.auto({
		connect: function(asynccallback) {
			MongoClient.connect('mongodb://localhost:27017/blog', function(err, db) {
				var collection = db.collection(settings.collections[0]);
				asynccallback(err, collection);
			});
		},

		allPosts: ['connect', function(asynccallback, results){
			results.connect.find({}).sort({ time: -1 }).toArray(function (err, posts) {
				asynccallback(err, posts);
      });
		}]
	}, function(err, results){
		callback(err, results.allPosts);
	});
}

Post.updateById = function (post, id, callback) {
	async.auto({
		connect: function(asynccallback) {
			MongoClient.connect('mongodb://localhost:27017/blog', function(err, db) {
				var collection = db.collection(settings.collections[0]);
				asynccallback(err, collection);
			});
		},

		updatePost: ['connect', function(asynccallback, results){
			results.connect.update({
				"postId": id
			},{
				$set: {
					post: post.post,
					title: post.title,
					type: post.type
				}
			}, function (err){
				asynccallback(err, null);
			});
		}]
	}, function(err, results){
		callback(err);
	});
}
