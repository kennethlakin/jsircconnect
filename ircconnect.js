var socketId;

chrome.socket.create('tcp', {}, function onSocketCreate(createInfo) {
  socketId = createInfo.socketId;
  chrome.socket.connect(socketId, '10.0.0.30', 6667, onConnected);
});

function onConnected() {
  console.log(socketId);
  read();
  write('PASS none\r\n');
  write('NICK USER\r\n');
  write('USER USER 0 * :Real Name\r\n', function() {
    readForever();
    write('JOIN #realtestchannel\r\n'); //This is broken. We should wait till the server acks the nick registration before joining.
  });
}

function write(s, f) {
  chrome.socket.write(socketId, str2ab(s), function(good) {console.log('write was ', good); if (f) f();});
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length*1); // 1 byte for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function read() {
  chrome.socket.read(socketId, null, function(readInfo) {
    if (readInfo.resultCode > 0) {
      console.log(ab2str(readInfo.data));
    }
  });
}

function readForever(readInfo) {
  if (readInfo != undefined && readInfo.resultCode != undefined && readInfo.resultCode > 0) {
    console.log(ab2str(readInfo.data));
  }
  chrome.socket.read(socketId, null, readForever);
}
