angular.module('MyApp', ['ngMaterial'])
.config(function($mdIconProvider) {
  $mdIconProvider
  .defaultIconSet('assets/images/mdi.svg');
})
.controller('AppCtrl', function($scope, $http) {
  const socket = new WebSocket('ws://localhost:3000');
  socket.addEventListener('open', function (event) {
    console.log('ws is connected')
  });

  socket.addEventListener('message', function (event) {
    $scope.messages.push(event.data);
    $scope.$apply();
    setTimeout(function() {
      var el = document.getElementById('mesWrap');
      el.scrollTop = el.scrollHeight;
    }, 250);
  });

  $scope.messages = [];
  $scope.isConnected = false;
  $scope.host = 'localhost:9092';
  $scope.producer = {
    topic: 'test',
    message: ''
  }

  $scope.consumer = {
    topic: 'test'
  };

  $scope.connect = function() {
    if ($scope.isConnected) {
      $scope.isConnected = false;
      $scope.messages = [];
      $http.get('/api/disconnect').then(function(res) {
        if (res.data.ok) {
          $scope.isConnected = false;
          $scope.isSubcribed = false;
        }
      });
      return;
    }

    $http.post('/api/connect', {
      host: $scope.host
    }).then(function(res) {
      if (res.data.ok) {
        $scope.isConnected = true;
        $scope.topics = res.data.topics;
        $scope.consumer.topic = $scope.topics[0][0].topic;
        $scope.producer.topic = $scope.topics[0][0].topic;
        $scope.topicChanged();
      }
    });
  };

  $scope.send = function() {
    $http.post('/api/push', $scope.producer).then(function(res) {
      $scope.producer.message = '';
    });
  };

  $scope.topicChanged = function() {
    $scope.messages = [];
    $http.post('/api/subscribe', {
      topic: $scope.consumer.topic
    }).then(function(res) {
    });
  };
});
