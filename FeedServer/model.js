var Bookshelf = require('bookshelf');
var config = require('./config');

var knex = require('knex')({
  client: 'mysql',
  connection: config.masterDb,
  pool: { min: 0, max: 7 }
});
var DB = Bookshelf(knex);

var User = DB.Model.extend({
   tableName: 'user',
   idAttribute: 'userid',
   account: function() {
       return this.belongsTo(Account, 'userid');
   },
});

var Account = DB.Model.extend({
   tableName: 'account',
   idAttribute: 'userid',
});

var Counter = DB.Model.extend({
   tableName: 'counter',
   idAttribute: 'counterid',
   basecounterObject: function() {
       return this.belongsTo(Counter, 'basecounter');
   },
   exchange: function() {
       return this.belongsTo(Exchange, 'exchangeid');
   },
});

var Exchange = DB.Model.extend({
   tableName: 'exchange',
   idAttribute: 'exchangeid',
});

var CounterSetValue = DB.Model.extend({
   tableName: 'countersetvalue',
});

var TradingDay = DB.Model.extend({
   tableName: 'tradingday'
});

var Trade = DB.Model.extend({
   tableName: 'trade',
   idAttribute: 'tradeid',
   status: function() {
       return this.belongsTo(TradeStatus, 'statusid');
   },
   counter: function() {
       return this.belongsTo(Counter, 'counterid');
   },
});

var TradeStatus = DB.Model.extend({
   tableName: 'tradestatus',
   idAttribute: 'statusid',
});

var AccountMargin = DB.Model.extend({
   tableName: 'accountmargin',
   idAttribute: 'marginid',
});

var EquityRatio = DB.Model.extend({
   tableName: 'equityratio',
   idAttribute: 'userid',
});

var AccountBalance = DB.Model.extend({
   tableName: 'accountbalance',
   idAttribute: 'userid',
});

var OpenPosition = DB.Model.extend({
   tableName: 'openposition',
   counter: function() {
       return this.belongsTo(Counter, 'counterid');
   },
});

var SettledPosition = DB.Model.extend({
   tableName: 'settledposition',
   counter: function() {
       return this.belongsTo(Counter, 'tradeid');
   },
});

var TradeQueue = DB.Model.extend({
   tableName: 'tradequeue',
   idAttribute: 'orderid',
   status: function() {
       return this.belongsTo(TradeStatus, 'statusid');
   },
   counter: function() {
       return this.belongsTo(Counter, 'counterid');
   },
});

var Notification = DB.Model.extend({
   tableName: 'notification',
   idAttribute: 'noticeid',
   tradequeue: function() {
       return this.belongsTo(TradeQueue, 'referenceid');
   },
});

var Config = DB.Model.extend({
   tableName: 'config',
   idAttribute: 'configid',
});

///////////////////////////

var realtimeKnex = {};
var realtimeDB = {};
var RealtimeQuote = {};

knex('config').where({
  configid: 35
}).select('value').then(function (response) {
  host = response[0].value;
  console.log("configid 35 : " +  host);
  config.realtimeDb.host = host;
  realtimeKnex = require('knex')({
    client: 'mysql',
    connection: config.realtimeDb,
    pool: { min: 0, max: 7 }
  });

  realtimeDB = Bookshelf(realtimeKnex);

  RealtimeQuote = realtimeDB.Model.extend({
    tableName: 'quote',
    idAttribute: 'symbol',
  });

  module.exports.RealtimeQuote = RealtimeQuote;

}).catch(error => {
  console.log("error : " + JSON.stringify(error));
});

module.exports = {
   User: User,
   Counter: Counter,
   CounterSetValue: CounterSetValue,
   TradingDay: TradingDay,
   Trade: Trade,
   TradeStatus: TradeStatus,
   AccountMargin: AccountMargin,
   EquityRatio: EquityRatio,
   AccountBalance: AccountBalance,
   OpenPosition: OpenPosition,
   SettledPosition: SettledPosition,
   Exchange: Exchange,
   TradeQueue: TradeQueue,
   Notification: Notification,
   Config: Config,
};
