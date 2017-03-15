var Model = require('./model');
var firebase = require("firebase");

const QUERY_COUNTER = {columns: ['counterid', 'countername', 'symbol', 'active', 'buypips', 'sellpips', 'pipsize', 'decimals', 'exchangeid', 'basecounter'],
    withRelated: ['basecounterObject', 'exchange']};

var getTradingDay = function(req, res) {
  console.log("getTradingDay : " + JSON.stringify(req.query));

  Model.TradingDay.where('active', 1).fetch({columns: ['rollover']}).then(function(tradingDay) {
    console.log("tradingDay : " + JSON.stringify(tradingDay));
    res.json(tradingDay);
  });
}

var getAccountSummary = function(req, res) {
  console.log("getAccountSummary : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.AccountBalance.where('userid', userid)
    .query(function(qb) {
        qb.orderBy('rollover', 'desc');
    }).fetch().then(function(accountBalance) 
  {
    console.log("accountBalance : " + JSON.stringify(accountBalance));
    //res.json(accountBalance);
    Model.EquityRatio.where('userid', userid).fetch().then(function(equityRatio) {
      console.log("equityRatio : " + JSON.stringify(equityRatio));
      var accountSummary = {};
      if (accountBalance != null) {
        accountSummary.previousBalance = accountBalance.get("previous_balance");
        accountSummary.rollover = accountBalance.get("rollover");
      }
      if (equityRatio != null) {
        accountSummary.equity = equityRatio.get("equity");
        accountSummary.marginRequired = equityRatio.get("marginrequired");
      }
      res.json(accountSummary);
    });
  });

}

var listActiveCounter = function(req, res) {
  console.log("listActiveCounter : " + JSON.stringify(req.query));

  Model.Counter.where('active', 1).fetchAll(QUERY_COUNTER).then(function(counter) {
    console.log("counter : " + JSON.stringify(counter));
    res.json(counter);
  });
}

var listTrade = function(req, res) {
  console.log("listTrade : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var limit = parseInt(req.query.limit);
  if (isNaN(limit)) {
    limit = 10;
  }
  var offset = parseInt(req.query.offset);
  if (isNaN(offset)) {
    offset = 0;
  }

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.Trade.where('userid', userid)
    .query(function(qb) {
        //qb.where('userid', userid)
        qb.orderBy('datetime', 'desc');
        qb.limit(limit);
        qb.offset(offset);
    })
    .fetchAll({
      withRelated: ['status', 'counter'],
      //columns: ['tradeid', 'counterid', 'price', 'action', 'openprice', 'statusid', 'datetime', 'remark']
    })
    .then(function(tradeList) {
      var jsonTradeList = tradeList.toJSON();
      console.log("tradeList : " + JSON.stringify(jsonTradeList));
      //var status = trade.related('status');
      //console.log("status : " + JSON.stringify(trade.related('status')));
      var outTradeList = [];
      for (var trade of jsonTradeList) {
        var outTrade = {};
        outTrade.tradeid = trade.tradeid;
        outTrade.price = trade.price;
        outTrade.action = trade.action;
        outTrade.openprice = trade.openprice;
        outTrade.datetime = trade.datetime;
        outTrade.remark = trade.remark;
        outTrade.quantity = trade.quantity;
        outTrade.statusid = trade.statusid;
        if (trade.status != null) {
          outTrade.status = trade.status.statusname;
        }
        if (trade.counter != null) {
          outTrade.counter = trade.counter.countername;
        }
        outTradeList.push(outTrade);
      }
      res.json(outTradeList);
    }
  );
}

var listAccountMargin = function(req, res) {
  console.log("listAccountMargin : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var limit = parseInt(req.query.limit);
  if (isNaN(limit)) {
    limit = 10;
  }
  var offset = parseInt(req.query.offset);
  if (isNaN(offset)) {
    offset = 0;
  }

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.AccountMargin.where('userid', userid)
    .query(function(qb) {
        qb.orderBy('datetime', 'desc');
        qb.limit(limit);
        qb.offset(offset);
    })
    .fetchAll()
    .then(function(accountMarginList) {
      var jsonAccountMarginList = accountMarginList.toJSON();
      console.log("jsonAccountMarginList : " + JSON.stringify(jsonAccountMarginList));
      res.json(jsonAccountMarginList);
    }
  );
}

var listAccountMarginByRollover = function(req, res) {
  console.log("listAccountMarginByRollover : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var rollover = req.query.rollover;

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.AccountMargin.where({userid: userid, rollover: rollover})
    .fetchAll()
    .then(function(accountMarginList) {
      var jsonAccountMarginList = accountMarginList.toJSON();
      console.log("jsonAccountMarginList : " + JSON.stringify(jsonAccountMarginList));
      res.json(jsonAccountMarginList);
    }
  );
}

var listOpenPosition = function(req, res) {
  console.log("listOpenPosition : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var limit = parseInt(req.query.limit);
  if (isNaN(limit)) {
    limit = 10;
  }
  var offset = parseInt(req.query.offset);
  if (isNaN(offset)) {
    offset = 0;
  }
  var rollover = req.query.rollover;

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.OpenPosition.where({userid: userid, rollover: rollover})
    .query(function(qb) {
        qb.where('quantity', '>', '0');
        qb.orderBy('datetime', 'desc');
        qb.limit(limit);
        qb.offset(offset);
    })
    .fetchAll({
      withRelated: ['counter'],
    })
    .then(function(openPositionList) {
      var jsonOpenPositionList = openPositionList.toJSON();
      console.log("jsonOpenPositionList : " + JSON.stringify(jsonOpenPositionList));

      var outOpenPositionList = [];
      for (var openPosition of jsonOpenPositionList) {
        var outOpenPosition = {};
        outOpenPosition.tradeid = openPosition.tradeid;
        outOpenPosition.action = openPosition.action;
        outOpenPosition.price = openPosition.price;
        outOpenPosition.quantity = openPosition.quantity;
        outOpenPosition.commission_in = openPosition.commission_in;
        if (openPosition.counter != null) {
          outOpenPosition.symbol = openPosition.counter.symbol;
          outOpenPosition.counterid = openPosition.counter.counterid;
          outOpenPosition.countername = openPosition.counter.countername;
        }
        outOpenPositionList.push(outOpenPosition);
      }
      res.json(outOpenPositionList);
    }
  );
}

var listAllOpenPosition = function(req, res) {
  console.log("listOpenPosition : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var rollover = req.query.rollover;
  var includezero = req.query.includezero;

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.OpenPosition.where({userid: userid, rollover: rollover})
    .query(function(qb) {
        if (includezero == null) {
          qb.where('quantity', '>', '0');
        }
        qb.orderBy('datetime', 'desc');
    })
    .fetchAll({
      withRelated: ['counter'],
    })
    .then(function(openPositionList) {
      var jsonOpenPositionList = openPositionList.toJSON();
      console.log("jsonOpenPositionList : " + JSON.stringify(jsonOpenPositionList));

      var outOpenPositionList = [];
      for (var openPosition of jsonOpenPositionList) {
        var outOpenPosition = {};
        outOpenPosition.tradeid = openPosition.tradeid;
        outOpenPosition.action = openPosition.action;
        outOpenPosition.price = openPosition.price;
        outOpenPosition.quantity = openPosition.quantity;
        outOpenPosition.commission_in = openPosition.commission_in;
        outOpenPosition.startquantity = openPosition.startquantity;
        if (openPosition.counter != null) {
          outOpenPosition.symbol = openPosition.counter.symbol;
          outOpenPosition.counterid = openPosition.counter.counterid;
          outOpenPosition.countername = openPosition.counter.countername;
        }
        outOpenPositionList.push(outOpenPosition);
      }
      res.json(outOpenPositionList);
    }
  );
}

var listOpenPositionByCondition = function(req, res) {
  console.log("listOpenPositionByCondition : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var rollover = req.query.rollover;
  var counterid = req.query.counterid;

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.OpenPosition.where({userid: userid, rollover: rollover, counterid: counterid})
    .query(function(qb) {
        qb.where('quantity', '>', '0');
        qb.orderBy('datetime', 'desc');
    })
    .fetchAll({
      withRelated: ['counter'],
    })
    .then(function(openPositionList) {
      var jsonOpenPositionList = openPositionList.toJSON();
      console.log("jsonOpenPositionList : " + JSON.stringify(jsonOpenPositionList));

      var outOpenPositionList = [];
      for (var openPosition of jsonOpenPositionList) {
        var outOpenPosition = {};
        outOpenPosition.tradeid = openPosition.tradeid;
        outOpenPosition.action = openPosition.action;
        outOpenPosition.price = openPosition.price;
        outOpenPosition.quantity = openPosition.quantity;
        outOpenPosition.commission_in = openPosition.commission_in;
        outOpenPosition.startquantity = openPosition.startquantity;
        if (openPosition.counter != null) {
          outOpenPosition.symbol = openPosition.counter.symbol;
          outOpenPosition.counterid = openPosition.counter.counterid;
          outOpenPosition.countername = openPosition.counter.countername;
        }
        outOpenPositionList.push(outOpenPosition);
      }
      res.json(outOpenPositionList);
    }
  );
}

var listSettledPositionByRollover = function(req, res) {
  console.log("listSettledPositionByRollover : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var rollover = req.query.rollover;

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.SettledPosition.where({userid: userid, rollover: rollover})
    .fetchAll()
    .then(function(settledPositionList) {
      var jsonSettledPositionList = settledPositionList.toJSON();
      console.log("jsonSettledPositionList : " + JSON.stringify(jsonSettledPositionList));
      res.json(jsonSettledPositionList);
    }
  );
}

var tradeWithCheck = function(req, res) {
  console.log("tradeWithCheck : " + JSON.stringify(req.body));
  var counterid = req.body.counterid;
  var action = req.body.action;
  var price = req.body.price;
  console.log("price : " + price);
  Model.Config.where('configid', "46").fetch().then(function(config) {
    console.log("config : " + JSON.stringify(config));
    var quoteＭulitplier = parseInt(config.get("value"));
    Model.Counter.where('counterid', counterid).fetch().then(function(counter) {
      console.log("counter : " + JSON.stringify(counter));
      var symbol = counter.get('symbol');
      //console.log("counter.get('symbol') : " + symbol);
      Model.RealtimeQuote.where('symbol', symbol).fetch().then(function(quoteModel) {
        console.log("quoteModel : " + JSON.stringify(quoteModel));
        var realtimePrice;
        var counterPipsize = counter.get('pipsize');
        var pipsize = counterPipsize * quoteＭulitplier;
        if (action=="buy") {
          realtimePrice = parseFloat(quoteModel.get('last')) + counter.get('buypips') * counterPipsize;
        } else {  // sell
          realtimePrice = parseFloat(quoteModel.get('last')) + counter.get('sellpips') * counterPipsize;
        }
        console.log("realtimePrice : " + realtimePrice);
        console.log("pipsize : " + pipsize);
        if (price >= realtimePrice - pipsize && price <= realtimePrice + pipsize) {
          console.log("tradeWithCheck : passed");
          trade(req, res);
          return;
        } else {
          console.log("tradeWithCheck : fail");
          res.statusCode = 400;
          res.end();
          return;
        }
      });
    });
  });
}

var trade = function(req, res) {
  console.log("trade : " + JSON.stringify(req.body));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var userid = req.session.user.userid;
  var tradedby = userid;
  var counterid = req.body.counterid;
  var action = req.body.action;
  var price = req.body.price;
  var quantity = req.body.quantity;
  var type = req.body.type;
  var duration = "gtn";
  var datetime = new Date();
  // we need to adjust check_price to make it pass the rules
  // for Sell....the checkprice cannot be higer
  // for buy....the checkprice cannot be lower
  var check_price = req.body.checkprice;
  if (check_price == null) {
    check_price = parseFloat(price);
    if (action == "sell") {
      check_price -= 0.01;
    } else {
      check_price += 0.01;
    }
  }
  var statusid = 2;
  var remark = req.body.remark;
  var openprice = req.body.openprice;
  var openref = req.body.openref;
  var altprice = req.body.altprice;

  /*
  userid, tradedby, counterid, action, price,quantity, type, duration(gtn), 
  if liq than openprice, openref( trade->tradeID), datetime, check_price(firebase price) statusid = 2, 
  updaterollover, rollover
  */

  Model.TradingDay.where('active', 1).fetch({columns: ['rollover']}).then(function(tradingDay) {
    var rollover = tradingDay.get("rollover");
    var updaterollover = rollover;

    var tradeDate = {
      userid: userid, 
      tradedby: tradedby,
      counterid: counterid,
      action: action,
      price: price,
      quantity: quantity,
      type: type,
      duration: duration,
      datetime: datetime,
      check_price: check_price,
      statusid: statusid,
      rollover: rollover,
      update_rollover: updaterollover,
      remark: remark,
      altprice: altprice,
      openprice: openprice,
      openref: openref,
    };
    console.log("tradeDate :" + JSON.stringify(tradeDate));

    new Model.TradeQueue(tradeDate).save().then(function(model) {
      console.log("model :" + JSON.stringify());
      res.json(model);
    }).catch(function(e) {
      console.log("here(463) :");
      console.log(e); // "oh, no!"
    });;
    
  });
  
}

var listTradeQueue = function(req, res) {
  console.log("listTradeQueue : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var limit = parseInt(req.query.limit);
  if (isNaN(limit)) {
    limit = 10;
  }
  var offset = parseInt(req.query.offset);
  if (isNaN(offset)) {
    offset = 0;
  }

  var userid = req.session.user.userid;
  console.log("userid :" + userid);
  Model.TradingDay.where('active', 1).fetch({columns: ['rollover']}).then(function(tradingDay) {
    var rollover = tradingDay.get("rollover");
    Model.TradeQueue
      .query(function(qb) {
          qb.where({userid: userid, rollover: rollover})
            .orWhere({userid: userid, statusid: 2});
          qb.orderBy('datetime', 'desc');
          qb.limit(limit);
          qb.offset(offset);
      })
      .fetchAll({
        withRelated: ['status', 'counter'],
      })
      .then(function(tradeQueueList) {
        var jsonTradeQueueList = tradeQueueList.toJSON();
        console.log("tradeQueueList : " + JSON.stringify(jsonTradeQueueList));
        var outTradeQueueList = [];
        for (var tradeQueue of jsonTradeQueueList) {
          var outTradeQueue = {};
          outTradeQueue.orderid = tradeQueue.orderid;
          outTradeQueue.counterid = tradeQueue.counterid;
          outTradeQueue.action = tradeQueue.action;
          outTradeQueue.price = tradeQueue.price;
          outTradeQueue.altprice = tradeQueue.altprice;
          outTradeQueue.openprice = tradeQueue.openprice;
          outTradeQueue.quantity = tradeQueue.quantity;
          outTradeQueue.type = tradeQueue.type;
          outTradeQueue.remark = tradeQueue.remark;
          outTradeQueue.datetime = tradeQueue.datetime;
          outTradeQueue.statusid = tradeQueue.statusid;
          outTradeQueue.executeprice = tradeQueue.executeprice;
          if (tradeQueue.status != null) {
            outTradeQueue.status = tradeQueue.status.statusname;
          }
          if (tradeQueue.counter != null) {
            outTradeQueue.counter = tradeQueue.counter.countername;
          }
          outTradeQueueList.push(outTradeQueue);
        }
        res.json(outTradeQueueList);
      }
    );
  });
}

var cancelTrade = function(req, res) {
  console.log("cancelTrade : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var orderid = req.body.orderid;
  Model.TradeQueue.forge().where({orderid: orderid, remark: 'mobileLO', statusid: 2}).save({statusid: 0}, {patch: true})
  .then(function(model) {
    console.log("model :" + JSON.stringify());
    res.json(model);
  })
  .catch(function(e) {
    console.log("here(549) :");
    console.log(e); // "oh, no!"
    res.end();
  });
}

var setNotificationClient = function(req, res) {
  console.log("setNotificationClient : " + JSON.stringify(req.query));
  console.log("req.session :" + JSON.stringify(req.session));
  if (req.session == null || req.session.user == null) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  var userid = req.session.user.userid;

  var datetime = new Date();
  Model.Notification.forge().where({userid: userid, client: null, noticetype: "order"}).save({client: datetime}, {patch: true})
    .then(function(model) {
      console.log("model :" + JSON.stringify(model));
      var notificationRef = firebase.database().ref("notification/" + userid);
      notificationRef.remove();
    })
    .catch(function(e) {
      console.log("here(573) :");
      console.log(e); // "oh, no!"
    });
  res.end();
}


module.exports = {
   listActiveCounter: listActiveCounter,
   listTrade: listTrade,
   listAccountMargin: listAccountMargin,
   getTradingDay: getTradingDay,
   getAccountSummary: getAccountSummary,
   listOpenPosition: listOpenPosition,
   listOpenPositionByCondition: listOpenPositionByCondition,
   listAllOpenPosition: listAllOpenPosition,
   listAccountMarginByRollover: listAccountMarginByRollover,
   listSettledPositionByRollover: listSettledPositionByRollover,
   tradeWithCheck: tradeWithCheck,
   trade: trade,
   cancelTrade: cancelTrade,
   listTradeQueue: listTradeQueue,
   setNotificationClient: setNotificationClient,
   QUERY_COUNTER: QUERY_COUNTER,
};
