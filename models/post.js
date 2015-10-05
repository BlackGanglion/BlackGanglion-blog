var mongodb = require('./db');
var markdown = require('markdown').markdown;

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

	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}

		//读取 posts 集合
		db.collection('posts', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}

			collection.count(function(err, count){
				if(err) {
					mongodb.close();
					return callback(err);
				}
				//统计现有文档数，那么插入postId+1
				post.postId = count + 1;

				//将文档插入 posts 集合
				collection.insert(post, {
					safe: true
				}, function (err) {
					mongodb.close();
					if (err) {
						return callback(err);//失败！返回 err
					}
					callback(null);//返回 err 为 null
				});

			});
		});
	});
};

//读取文章及其相关信息, 统计各个分类的文章数
Post.getALL = function(type, page, callback) {
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}

		//读取 posts 集合
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}

			var query = {};
			var everyTypeCount = [];
			var posts = [];


			if (type) {
				query.type = type;
			}

			collection.count(query, function(err, total){
				//根据 query 对象查询文章
				//每页5篇文章
				collection.find(query, {
					skip: (page - 1) * 5,
					limit: 5
				}).sort({
					time: -1
				}).toArray(function (err, posts) {
					//mongodb.close();
					if (err) {
						return callback(err);//失败！返回 err
					}

					posts.forEach(function (doc) {
						var content = doc.post.substr(0, 600);
						doc.post = markdown.toHTML(content+'......');
					});

					//未分类
					collection.count({type: 'unclassified'}, function(err, count){
						if(err){
							mongodb.close();
							return callback(err);
						}
						everyTypeCount.unclassified = count;

						//Web开发
						collection.count({type: 'webDevelop'}, function(err, count){
							if(err){
								mongodb.close();
								return callback(err);
							}
							everyTypeCount.webDevelop = count;

							//数据可视化
							collection.count({type: 'dataVisualization'}, function(err, count){
								if(err){
									mongodb.close();
									return callback(err);
								}
								everyTypeCount.dataVisualization = count;

								//技术随笔
								collection.count({type: 'technology'}, function(err, count){
									if(err){
										mongodb.close();
										return callback(err);
									}
									everyTypeCount.technology = count;

									//技术随笔
									collection.count({type: 'technology'}, function(err, count){
										if(err){
											mongodb.close();
											return callback(err);
										}
										everyTypeCount.technology = count;

										//生活杂记
										collection.count({type: 'life'}, function(err, count){
											if(err){
												mongodb.close();
												return callback(err);
											}
											everyTypeCount.life = count;

											callback(null, posts, everyTypeCount, total);//成功！以数组形式返回查询的结果
										});
									});
								});
							});
						});
					});
				});

			});


		});
	});
};

//根据ID获取一篇文章
Post.getOneById = function(id, flag, callback) {
	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}

		//读取 posts 集合
		db.collection('posts', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}

			//用于储存前后博文的标题
			var linkTitle = [];
			var linkPost = [];

			//根据postId进行查询
			collection.findOne({
				postId: id
			}, function (err, doc) {
				if (err) {
					mongodb.close();
					return callback(err);
				}

				if(doc == null){
					doc = -1;
					callback(null, doc, null);
				}else{
				  	//解析 markdown 为 html
						if(flag == '1')
						   doc.post = markdown.toHTML(doc.post);

						var newCount = doc.watch + 1;

						if(newCount == 10000002) newCount = 10000001;

						collection.update({
							postId: id
						},{
							$set: {watch: newCount}
						},function(err){
							if(err){
								mongodb.close();
								return callback(err);
							}
				    });

						collection.findOne({
							postId: (id + 1)
						}, function(err, linkPost){
							if(err){
								mongodb.close();
								return callback(err);
							}

							if(linkPost == null){
								linkTitle.next = '没有下一篇文章了';
							}else{
								linkTitle.next = linkPost.title;
							}

							collection.findOne({
								postId: (id - 1)
							},function(err, linkPost){
								mongodb.close();
								if(err){
									return callback(err);
								}

								if(linkPost == null){
									linkTitle.pre = '没有上一篇文章了';
								}else{
									linkTitle.pre = linkPost.title;
								}

								//返回查询的一篇文章

								callback(null, doc, linkTitle);
							});
						});
				}
			});
		});
	});
};

Post.getList = function (callback) {
	mongodb.open(function (err, db){
		if(err){
			return callback(err);
		}

		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}

      collection.find({}).sort({
        time: -1
      }).toArray(function (err, posts) {
        mongodb.close();
        if (err) {
					return callback(err);
        }

        callback(null, posts);
      });
    });
	});
};

Post.updateById = function (post, id, callback) {
	mongodb.open(function (err, db){
		if(err){
			return callback(err);
		}

		db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }

			var date = new Date();

			var time = {
				date : date,
				year : date.getFullYear(),
				month : date.getFullYear() + "-" + (date.getMonth() + 1),
				day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
				minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
				date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
			}

			collection.update({
				"postId": id
			},{
				$set: {
					post: post.post,
					title: post.title,
					type: post.type
				}
			}, function (err){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
};
