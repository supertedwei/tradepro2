var Bookshelf = require('bookshelf');
var config = require('./config');

var knex = require('knex')({
  client: 'mysql',
  connection: config.masterDb
});

var realtimeKnex = require('knex')({
  client: 'mysql',
  connection: config.realtimeDb
});

var DB = Bookshelf(knex);
var realtimeDB = Bookshelf(realtimeKnex);

module.exports.DB = DB;
module.exports.realtimeDB = realtimeDB;
