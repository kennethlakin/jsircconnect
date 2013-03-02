//Easy way to package up a message from the server.
function IrcCommand() {
  this.prefix = "";
  this.command = "";
  this.username = "";
  this.args = [];
}

//Defined extension points:
//onMessages(serverMessages[x]IrcCommands
//onDisconnect(resultCode)
//onConnect()
//onRead(readInfo)
//onWritten(writeInfo)
//onWrite(data)
function IrcClient(serverName, serverPort, nick, channel) {
	this.serverName = serverName;
	this.serverPort = serverPort;
	this.channel = channel;
	this.getUserName(this, nick);
	this.socketId;
};

IrcClient.prototype.str2ab = function(str) {
  var buf = new ArrayBuffer(str.length*1); // 1 byte for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++)
  {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

IrcClient.prototype.ab2str = function(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

IrcClient.prototype.write = function(s, f) {
	var self = this;
	var w;
	if(self.onWrite) {
		self.onWrite(s);
	}
	if(self.onWritten) {
		w = self.onWritten.bind(self, f);
	}
  s+="\r\n";
	chrome.socket.write(self.socketId, self.str2ab(s), w);
}

IrcClient.prototype.connect = function() {
	var self = this;
	chrome.socket.create('tcp', {}, function onSocketCreate(createInfo)
	{
		self.socketId = createInfo.socketId;
		chrome.socket.connect(self.socketId, self.serverName, self.serverPort, self.onConnected.bind(self));
	}); // end socket.create
}

IrcClient.prototype.onConnected = function() {
	var self = this;
	if(self.onConnect) { 
		self.onConnect();
	}
  self.readForever();
  self.write('PASS none');
  self.write('NICK ' + self.nick);
  self.write('USER USER 0 * :Real Name');
}

IrcClient.prototype.pong = function(serverMessage) {
	var self = this;
	if(serverMessage) {
		self.write("PONG :"+ serverMessage.username.substring(1));
	} 
	else {
		throw "Error: No message passed to pong.";
	}
}

IrcClient.prototype.joinChannel = function(channelName) {
	var self = this;
	if(channelName) {
		self.write('JOIN ' + channelName);
	}
	else {
		if(this.channel) {
			self.write('JOIN' + self.channel);
		}
		else {
			throw "joinChannel: No channelName passed in and no default channel defined!";
		}
	}
}

IrcClient.prototype.sendPrivmsg = function (reciever, message) {
	var self = this;
	if(reciever && message) {
		self.write("PRIVMSG " + reciever + " :" + message);
	}
	else {
		var except = "sendPrivmsg: ";
		if(!reciever) {
			except += "reciever unspecified. ";
		}
		if(!message) {
			except += "message unspecified. ";
		}
		throw except;
	}
}

//Main message processing loop.
IrcClient.prototype.readForever = function(readInfo)
{
	var self = this;
  if(readInfo!==undefined && readInfo.resultCode < 0)
  {
		if(self.onDisconnect) {
			// we've been disconnected, dang.
			self.onDisconnect(readInfo.resultCode);
		}
		self.onDisconnected(readInfo.resultCode);
		return;
  }
  if (readInfo !== undefined && readInfo.resultCode > 0)
  {
		if(self.onRead) {
			self.onRead(readInfo);
		}
    var serverMsg = self.ab2str(readInfo.data);

    var serverLines = [];
    var serverMessages = [];
    serverLines = serverMsg.split("\n");

    //Split the server messages into single lines.
    for(var i = 0; i < serverLines.length; i++)
    {
      //If the line wasn't empty, save the message.
      var msg = self.crackMessage(serverLines[i]);
      if(msg !== undefined)
      {
        serverMessages.push(msg);
      }
    }

		if(self.onMessages) {
			self.onMessages(serverMessages);
		}
  }

  chrome.socket.read(self.socketId, null, self.readForever.bind(self));
}//end readForever

IrcClient.prototype.onDisconnected = function(resultCode)
{
	var self = this;
  chrome.socket.disconnect(self.socketId);
} // end onDisconnected

//Converts a single message from an IRC server into an IrcCommand object.
IrcClient.prototype.crackMessage = function(serverLine) {
	if(serverLine.length == 0)
	{
		return undefined;
	}
	var r = new IrcCommand();
	var parts = serverLine.split(" ");
	var offset = 0;

	//If our message had a prefix, store it.
	if(parts[0][0] == ":" )
	{
		r.prefix = parts[0];
		offset = 1;
	}
	r.command = parts[0+offset];
	r.username = parts[1+offset];
	r.args = parts.slice(2+offset);
	return r;
}

IrcClient.prototype.setUserName = function(newUserName, optionalCallback)
{
	var self = this;
	if(self.runningInChrome()) {
	  chrome.storage.local.set({userName: newUserName}, optionalCallback);
	}
	else {
		//Don't do anything for now, as we don't have Local Storage.
	}
} // end setUserName

IrcClient.prototype.getUserName = function(ircClient, defaultUsername) {
	var self = this;
	if(self.runningInChrome()) {
		chrome.storage.local.get('userName', function(results)
		{
			ircClient.nick = results.userName || defaultUsername;

		}); // end get userName from storage
	}
	else {
		ircClient.nick = defaultUsername;
	}
}
//@returns true if we're both running in an browser, and running under Google
//Chrome.
IrcClient.prototype.runningInChrome = function() {
	return (window.chrome && chrome);
}
