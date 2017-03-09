var Model = require('./model');
var serviceapi = require('./serviceapi');
var firebase = require("firebase");

var cache = {};
var onQuoteChangeMap = {};

var encode = function(input) {
    var output = cache[input];
    if (output == null) {
        output = input.replace(".", "_");
        output = output.replace("#", "_");
        output = output.replace("$", "_");
        output = output.replace("[", "_");
        output = output.replace("]", "_");
        cache[input] = output;
    }
    return output;
}

var onQuoteOrCounterChange = function(counter, quote) {
  var encodedConterid = Buffer.from(counter.counterid).toString('base64');
  var counterQuoteRef = firebase.database().ref("counterquote").child(encodedConterid);
  counterQuoteRef.once('value', function(counterQuoteSnapshot) {
    var counterQuote = counterQuoteSnapshot.val();
    var counterQuoteData = {};

    // set time
    counterQuoteData.time = quote.time

    // set bid + ask
    var bid = parseFloat(quote.last) + counter.sellpips * counter.pipsize;
    //console.log("counter.sellpips : " + counter.sellpips);
    bid = bid.toFixed(counter.decimals);
    bid = parseFloat(bid);
    if (!isNaN(bid) && bid != "") {
        counterQuoteData['bid'] = bid;
        if (counterQuote.bid != null) {
            counterQuoteData['lastbid'] = counterQuote.bid;
        }
      var ask = parseFloat(quote.last) + counter.buypips * counter.pipsize;
      ask = ask.toFixed(counter.decimals)
      ask = parseFloat(ask);
      if (!isNaN(ask) && ask != "") {
        counterQuoteData['ask'] = ask;
      }
    }

    // set high
    var high = parseFloat(quote.high) + counter.sellpips * counter.pipsize;
    high = high.toFixed(counter.decimals);
    high = parseFloat(high);
    if (!isNaN(high)) {
      counterQuoteData['lastHigh'] = counterQuote.high;
      counterQuoteData['high'] = high;
    }

    // set low
    var low = parseFloat(quote.low) + counter.sellpips * counter.pipsize;
    low = low.toFixed(counter.decimals);
    low = parseFloat(low);
    if (!isNaN(low)) {
      counterQuoteData['lastLow'] = counterQuote.low;
      counterQuoteData['low'] = low;
    }

    // set change since open
    var quoteChange = parseFloat(quote.change);
    if (isNaN(quoteChange)) {
      console.log("quoteChange is Nan : " + quote.change);
      counterQuoteData['quoteChange'] = counterQuote.quoteChang;
    } else {
      counterQuoteData['quoteChange'] = quoteChange;
    }
    
    // set change
    counterQuoteData['change'] = 0;
    if (counterQuoteData['lastbid'] != null) {
      var change = counterQuoteData['bid'] - counterQuoteData['lastbid'];
      change = change.toFixed(counter.decimals)
      change = parseFloat(change);
      if (!isNaN(change)) {
        counterQuoteData['change'] = change;
      }
    }
    counterQuoteRef.update(counterQuoteData);
  });
}

var onCounterChange = function(counter) {
  if (counter == null) {
    // skip
    return;
  }
  var quoteRef = firebase.database().ref("quote");
  var quoteChildRef = quoteRef.child(counter.symbol);
  quoteChildRef.once('value', function(quoteSnapshot) {
    var quote = quoteSnapshot.val();
    onQuoteOrCounterChange(counter, quote);
  });
}

var onQuoteChange = function(quoteSnapshot) {
  var quote = quoteSnapshot.val();
  //console.log("quote : " + JSON.stringify(quote));
  //console.log("quote key : " + quoteSnapshot.key);
  if (quote == null) {
    // skip
    return;
  }
  var encodedSymbol = encode(quote.symbol);
  var counterRef = firebase.database().ref("counter").child(encodedSymbol);
  counterRef.once('value', function(counterSnapshot) {
    var counter = counterSnapshot.val();
    onQuoteOrCounterChange(counter, quote);
  });
}

var syncCounter = function() {
  console.log("syncCounter : " + new Date());
  Model.Counter.where('active', 1).fetchAll(serviceapi.QUERY_COUNTER).then(function(dbCounters) {
    //console.log("dbCounters : " + JSON.stringify(dbCounters));
    var counterRef = firebase.database().ref("counter");
    var quoteRef = firebase.database().ref("quote");
    var counterQuoteRef = firebase.database().ref("counterquote");
    
    counterRef.once('value', function(snapshot) {
      var fbCounters = snapshot.val();
      
      var jsonCounters = dbCounters.toJSON();
      for (var counter of jsonCounters) {
        // set basecounter
        if (counter.basecounterObject != null && counter.basecounterObject.symbol != null) {
          counter.basecounterSymbol = counter.basecounterObject.symbol;
          counter.basecounterid = counter.basecounterObject.counterid;
        }
        counter.basecounterObject = null;
        
        // set counter
        counter.symbol = encode(counter.symbol);
        counter.exchange = {open: counter.exchange.open};
        counter.active = null;
        var itemCounterRef = counterRef.child(counter.symbol);
        itemCounterRef.set(counter);
        if (fbCounters != null) {
          delete fbCounters[counter.symbol];
        }

        // set counterquote
        var encodedConterid = Buffer.from(counter.counterid).toString('base64');
        var itemCounterQuoteRef = counterQuoteRef.child(encodedConterid);
        itemCounterQuoteRef.update(counter);
        
        // register for quote update
        var quoteChildRef = quoteRef.child(counter.symbol);
        if (onQuoteChangeMap[counter.symbol] == null) {
          onQuoteChangeMap[counter.symbol] = true;
          quoteChildRef.on('value', onQuoteChange);
          console.log("registered onQuoteChange : " + counter.symbol);
        }

        onCounterChange(counter);
        syncCounterSetValue(counter);
      }

      // delete residual counter
      for (var name in fbCounters) {
        console.log("name : " + name);
        counterRef.child(name).remove();

        // unregister for quote update
        var quoteChildRef = quoteRef.child(name);
        onQuoteChangeMap[name] = true;
        quoteChildRef.off('value', onQuoteChange);
        console.log("unregistered onQuoteChange : " + name);
      }
    });
  });
}

var counterSetValueCache = {};
var cacheCounterSetValue = function() {
  console.log("cacheCounterSetValue : " + new Date());
  Model.CounterSetValue
      .fetchAll({columns: ['countersetid', 'exchangeid', 'lotsize']})
      .then(function(dbCounterSetValues) {
    var jsonCounterSetValues = dbCounterSetValues.toJSON();
    // console.log("jsonCounterSetValues : " + jsonCounterSetValues);
    tempCache = {};
    for (var counterSetValue of jsonCounterSetValues) {
      var item = tempCache[counterSetValue.exchangeid];
      if (item == null) {
        item = [];
      }
      item.push(counterSetValue);
      tempCache[counterSetValue.exchangeid] = item;
    //   //console.log("countersetid    : " + counterSetValue.countersetid);
    //   var bundle = Object.assign(counter, counterSetValue);
    //   var ref = countersetRef.child(counterSetValue.countersetid);
    //   ref.set(bundle);
    }
    counterSetValueCache = tempCache;
    // console.log("counterSetValueCache : " + JSON.stringify(counterSetValueCache));
  });
}

var syncCounterSetValue = function(counter) {
  //console.log("exchangeid    : " + counter.exchangeid);

  var countersetRef = firebase.database().ref("counterset/" + encode(counter.symbol));

  jsonCounterSetValues = counterSetValueCache[counter.exchangeid];
  // console.log("jsonCounterSetValues : " + jsonCounterSetValues);
  if (jsonCounterSetValues != null) {
    for (var counterSetValue of jsonCounterSetValues) {
      //console.log("countersetid    : " + counterSetValue.countersetid);
      var bundle = Object.assign(counter, counterSetValue);
      var ref = countersetRef.child(counterSetValue.countersetid);
      ref.set(bundle);
    }
  }
  // Model.CounterSetValue.where('exchangeid', counter.exchangeid)
  //     .fetchAll({columns: ['countersetid', 'exchangeid', 'lotsize']})
  //     .then(function(dbCounterSetValues) {

  //   var jsonCounterSetValues = dbCounterSetValues.toJSON();
  //   for (var counterSetValue of jsonCounterSetValues) {
  //     //console.log("countersetid    : " + counterSetValue.countersetid);
  //     var bundle = Object.assign(counter, counterSetValue);
  //     var ref = countersetRef.child(counterSetValue.countersetid);
  //     ref.set(bundle);
  //   }
  // });
}

var syncNotification = function() {
  Model.TradingDay.where('active', 1).fetch({columns: ['rollover']}).then(function(tradingDay) {
    var rollover = tradingDay.get("rollover");
    Model.Notification
      .query(function(qb) {
        qb.where({client: null, rollover: rollover, noticetype: "order"})
      })
      .fetchAll({
        withRelated: ['tradequeue', 'tradequeue.status'],
      })
      .then(function(notificationList) {
        var jsonNotificationList = notificationList.toJSON();
        //console.log("jsonNotificationList : " + JSON.stringify(jsonNotificationList));
        for (var notification of jsonNotificationList) {
          var notificationRef = firebase.database().ref("notification/" + notification.userid + "/" + notification.noticeid);
          var outNotification = {};
          outNotification.noticeid = notification.noticeid;
          outNotification.orderid = notification.tradequeue.orderid;
          outNotification.statusname = notification.tradequeue.status.statusname;
          notificationRef.set(outNotification);
        }
      }
    );
  });
}

module.exports = {
   syncCounter: syncCounter,
   syncNotification: syncNotification,
   cacheCounterSetValue: cacheCounterSetValue,
};
