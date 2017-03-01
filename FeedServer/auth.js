var Model = require('./model');
var crypto = require('crypto');

var login_v1 = function(req, res) {
  console.log("login_v1 : " + JSON.stringify(req.body));

  var username = req.body.username;
  var password = req.body.password;
  if (username == null || password == null) {
    res.end();
    return;
  }

  var md5Password = crypto.createHash('md5').update(password).digest('hex');
  console.log("md5Password : " + md5Password);

  new Model.User({username: username})
      .fetch({columns: ['userid', 'username', 'email', 'fullname', 'password'], withRelated: ['account']})
      .then(function(user) {
    var strUser = JSON.stringify(user);
    console.log("user : " + strUser);
    if (user == null) {
      res.end();
      return;
    }
    var dbPassword = user.get("password");
    console.log("dbPassword : " + dbPassword);

    if (dbPassword != md5Password) {
      res.end();
      return;
    } else {
      // save user info in session
      var session = req.session;
      session.user = user.toJSON();
      console.log("req.session :" + JSON.stringify(session));
      // create data sent back to client
      var outUser = {};
      outUser.userid = session.user.userid;
      outUser.username = session.user.username;
      outUser.email = session.user.email;
      outUser.fullname = session.user.fullname;
      outUser.countersetid = session.user.account.countersetid;
      res.end(JSON.stringify(outUser));
    }
  });
}

var changePassword = function(req, res) {
  console.log("changePassword : " + JSON.stringify(req.body));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var userid = req.session.user.userid;
  var oldPassword = req.body.old_password;
  var newPassword = req.body.new_password;
  if (oldPassword == null || newPassword == null) {
    res.end();
    return;
  }

  var md5Password = crypto.createHash('md5').update(oldPassword).digest('hex');
  console.log("md5Password : " + md5Password);

  new Model.User({userid: userid})
      .fetch({columns: ['userid', 'username', 'email', 'fullname', 'password'], withRelated: ['account']})
      .then(function(user) {
    var strUser = JSON.stringify(user);
    console.log("user : " + strUser);
    if (user == null) {
      res.end();
      return;
    }
    var dbPassword = user.get("password");
    console.log("dbPassword : " + dbPassword);

    if (dbPassword != md5Password) {
      res.end();
      return;
    } else {
      // save user new password
      var newMd5Password = crypto.createHash('md5').update(newPassword).digest('hex');
      Model.User.forge().where({userid: userid}).save({password: newMd5Password}, {patch: true})
      .then(function(model) {
        console.log("model :" + JSON.stringify(model));
        // create data sent back to client
        var outUser = {};
        outUser.username = user.get("username");
        outUser.email = user.get("email");
        outUser.fullname = user.get("fullname");
        res.end(JSON.stringify(outUser));
      })
      .catch(function(e) {
        console.log(e); // "oh, no!"
        res.end();
      });
    }
  });
}

module.exports = {
   login_v1: login_v1,
   changePassword: changePassword,
};
