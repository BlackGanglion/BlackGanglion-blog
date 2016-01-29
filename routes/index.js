var express = require('express');
var crypto = require('crypto');
var User = require('../models/user.js');
var Post = require('../models/post.js');
var File = require('../models/file.js');

module.exports = function(app) {
  app.get('/', function (req, res) {
    var page = req.query.p ? parseInt(req.query.p) : 1;

    Post.getALL(null, page, function (err, posts, everyTypeCount, total) {
      if (err) {
        posts = [];
      }

      res.render('index', {
        title: '主页',
        posts: posts,
        everyTypeCount: everyTypeCount,
        isFirstPage: (page - 1) == 0,
        isLastPage: ((page - 1) * 5 + posts.length) == total,
        page: page
      });
    });
  });

  app.get('/file', function(req,res){
    File.getYearList(function (err, yearList, resList){
      res.render('file', {
        yearList: yearList,
        resList: resList
      });
    });
  });

  app.get('/life', function(req, res){
    res.render('life');
  });

  app.get('/seach', function(req, res){
    res.render('search');
  });

  app.get('/:type', function (req, res) {
    var type = req.params.type;
    var page = req.query.p ? parseInt(req.query.p) : 1;

    Post.getALL(type, page, function(err, posts, everyTypeCount, total) {
      if(err) {
        posts = [];
      }

      res.render('index', {
        title: '主页',
        posts: posts,
        everyTypeCount: everyTypeCount,
        isFirstPage: (page - 1) == 0,
        isLastPage: ((page - 1) * 5 + posts.length) == total,
        page: page
      });
    });
  })

  app.get('/admin/aindex', checkLogin);
  app.get('/admin/aindex', function(req, res){
    Post.getList(function (err, posts) {
      res.render('admin/aindex', {
        title: '博文列表',
        posts: posts
      });
    });
  });

  app.get('/admin/update/:id', checkLogin);
  app.get('/admin/update/:id', function (req, res){
    var id = parseInt(req.params.id, 10);

    Post.getOneById(id, '0', function(err, post, linkTitle){
        if(err || post == -1){
            return res.redirect('/admin/aindex');
        }

        res.render('admin/update', {
            post: post,
            success: req.flash('success').toString()
        });
    });
  });

  app.post('/admin/update/:id', checkLogin);
  app.post('/admin/update/:id', function (req, res){
    var id = parseInt(req.params.id, 10);

    var post = {
      title: req.body.title,
      type: req.body.type,
      post: req.body.post
    };

    Post.updateById(post, id, function(err){
      if (err) {
        req.flash('error', err);
        return;
      }
      req.flash('success', '更新成功!');
      return res.redirect('/admin/update/' + id);
    });
  });

  /*
  app.get('/admin/reg', checkNotLogin);
  app.get('/admin/reg', function (req, res) {
    res.render('reg', {
      title: '注册',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/admin/reg', checkNotLogin);
  app.post('/admin/reg', function (req, res) {
    var name = req.body.name;
    var password = req.body.password;
    var password_re = req.body['password-repeat'];

    if(name == ''){
      req.flash('error', '用户名不能为空');
      return res.redirect('/admin/reg');
    }

    if(password == ''){
      req.flash('error', '密码不能为空');
      return res.redirect('/admin/reg');
    }

    if (password_re != password) {
      req.flash('error', '两次输入的密码不一致!');
      return res.redirect('/admin/reg');
    }

    var md5 = crypto.createHash('md5');
    var password = md5.update(req.body.password).digest('hex');
    var newUser = new User({
      name: name,
      password: password,
      email: req.body.email
    });

    User.get(newUser.name, function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/admin/reg');
      }
      if (user) {
        req.flash('error', '用户已存在!');
        return res.redirect('/admin/reg');
      }

      newUser.save(function (err, user) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/admin/reg');
        }
        req.session.user = user;
        req.flash('success', '注册成功!');
        res.redirect('/admin/post');
      });
    });
  });
  */

  app.get('/admin/login', checkNotLogin);
  app.get('/admin/login', function (req, res) {
    res.render('admin/login', {
      title: '登录',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/admin/login', function (req, res) {
    var md5 = crypto.createHash('md5');
    var password = md5.update(req.body.password).digest('hex');

    User.get(req.body.name, function (err, user) {
      if (!user) {
        req.flash('error', '用户不存在!');
        return res.redirect('/admin/login');
      }
      if (user.password != password) {
        req.flash('error', '密码错误!');
        return res.redirect('/admin/login');
      }
      req.session.user = user;
      req.flash('success', '登陆成功!');
      res.redirect('/admin/post');
    });
  });

  app.get('/admin/post', checkLogin);
  app.get('/admin/post', function (req, res) {
    res.render('admin/post', {
      title: '发表',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
     });
  });

  app.post('/admin/post',checkLogin);
  app.post('/admin/post',function (req, res) {
    var currentUser = req.session.user;
    var post = new Post(currentUser.name, req.body.title, req.body.post, req.body.type);

    post.save(function (err) {
      if (err) {
        req.flash('error', err);
        return;
      }
      req.flash('success', '发布成功!');
      res.redirect('/admin/aindex');
    });
  });

  app.get('/admin/logout', checkLogin);
  app.get('/admin/logout', function (req, res) {
    req.session.user = null;
    req.flash('success', '登出成功!');
    res.redirect('/admin/login');
  });

  /*
  app.get('/admin/upload', checkLogin);
  app.get('/admin/upload', function (req, res) {
    res.render('upload', {
      title: '文件上传',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/admin/upload', checkLogin);
  app.post('/admin/upload', function (req, res) {
    req.flash('success', '文件上传成功!');
    res.redirect('/admin/upload');
  });
  */

  app.get('/blog/:id', function(req, res){
    var id = parseInt(req.params.id, 10);

    Post.getOneById(id, '1', function(err, post, linkTitle){
      if(err || post == -1){
        return res.redirect('/');
      }

      res.render('blog', {
        title: post.title,
        post: post,
        linkTitle: linkTitle
      });
    });
  });
};

function checkLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', '未登录!');
    res.redirect('/admin/login');
  }
  next();
}

function checkNotLogin(req, res, next) {
  if (req.session.user) {
    req.flash('error', '已登录!');
    res.redirect('/admin/post'); //回退
  }
  next();
}
