const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const kafka = require('kafka-node');
const Producer = kafka.Producer;
const Consumer = kafka.Consumer;
var kafkaClient;
var kafkaAdmin;
var kafkaProducer;
var kafkaConsumer;
var expressWs = require('express-ws')(app);
var clientWS;
var currentTopic;
var topics = [];

app.use(bodyParser.json());
app.use('/assets', express.static('assets'));

app.get('/', function (req, res) {
  res.sendFile(path.resolve('index.html'));
});

app.post('/api/connect', function (req, res) {
  var body = req.body;
  connectKafka(body.host, (topics) => {
    res.send(JSON.stringify({
      ok: true,
      topics: topics
    }));
  });
});

app.get('/api/disconnect', function (req, res) {
  if (kafkaConsumer) {
    kafkaConsumer.pause();
  }

  res.send(JSON.stringify({
    ok: true
  }));
});

app.post('/api/push', function (req, res) {
  var body = req.body;
  producer(body);
  res.send(JSON.stringify({
    ok: true
  }));
});

app.post('/api/subscribe', function (req, res) {
  var body = req.body;
  consumer(body.topic);
  res.send(JSON.stringify({
    ok: true
  }));
});

app.ws('/', function(ws, req) {
  clientWS = ws;
  ws.on('close', () => {
    if (kafkaConsumer) {
      kafkaConsumer.pause();
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

function connectKafka(host, cb) {
  if (!kafkaClient) {
    kafkaClient = new kafka.KafkaClient({kafkaHost: host});
    kafkaAdmin = new kafka.Admin(kafkaClient);
    kafkaProducer = new Producer(kafkaClient);
    kafkaProducer.on('ready', function () {
      console.log('kafka connected')
      getTopics(cb);
    });
  } else {
    kafkaConsumer.resume();
    cb(topics);
  }
}

function getTopics(cb) {
  kafkaAdmin.listTopics((err, res) => {
    var t = res[1].metadata;
    var result = [];
    for (var key in t) {
      if (key.indexOf('__') === -1) {
        result.push(t[key]);
      }
    }

    topics = result;
    console.log('topics', result);
    cb(result);
  });
}

function consumer(topic) {
  if (currentTopic === topic) return;

  if (currentTopic) {
    console.log('unsubscribe topic: ' + currentTopic);
    kafkaConsumer.removeTopics([currentTopic], () => {
      console.log('subscribe topic: ' + topic);
      kafkaConsumer.addTopics([topic]);
    });
  } else {
    console.log('subscribe topic: ' + topic);
    currentTopic = topic;
    if (!kafkaConsumer) {
      kafkaConsumer = new Consumer(
        kafkaClient,
        [
          { topic: topic }
        ],
        {
          autoCommit: true
        }
      );

      kafkaConsumer.on('message', (message) => {
        console.log('message:' + message.value)
        clientWS.send(message.value);
      });
    }
  }
}

function producer(data) {
  var payloads = [
    { topic: data.topic, messages: data.message}
  ];

  kafkaProducer.send(payloads, function (err, e) {
    console.log('send: ' + data.message)
  });
}
