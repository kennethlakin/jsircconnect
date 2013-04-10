//Easy way to package up a message from the server.
class IrcCommand {
  prefix : string;
  command : string;
  username : string;
  args : string[];
}

//Defined extension points:
//onMessages(serverMessages[x]IrcCommands
//onDisconnect(resultCode)
//onConnect()
//onRead(readInfo)
//onWritten(writeInfo)
//onWrite(data)
class IrcClient {
  public nick : string;
  constructor(public serverName: string,
              public serverPort: number,
              defaultNick: string,
              public channel: string)
  {
    this.retrieveUserName(defaultNick);
    //We're probably running as a Chrome Extension.
    //FIXME: Make this check square with the runningInChrome check,
    //       and play nicely with the various mocks that we're working with.
    if(typeof window !== 'undefined' && chrome && chrome.socket) {
      this.socketId;
      this._connect = function(serverName, port, cb) {
        var self = this;
        chrome.socket.create('tcp', {}, function onSocketCreate(createInfo)
        {
          self.socketId = createInfo.socketId;
          chrome.socket.connect(self.socketId, serverName, serverPort, cb);
        }); // end socket.create
      }
      this._write = function(string, func) {
        var self = this;
        var ab = IrcClient.str2ab(string);
        chrome.socket.write(self.socketId, ab, func);
      }
      this._read = function(cb) {
        var self = this;
        chrome.socket.read(self.socketId, null, cb);
      }
      this._disconnect = function() {
        var self = this;
        chrome.socket.disconnect(self.socketId);
      }
    }
    //We should be running under node.js.
    else if(typeof window === 'undefined' && require) {
      var net = require("net");
      var client;
      this._connect = function(serverName, port, cb) {
        var self = this;
        client = net.connect({port: port, host: serverName}, cb);
        client.on('data', self._callReadForever);

        //FIXME: Need to pass result code to onDisconnected.
        client.on('error', self.onDisconnected);
        client.on('close', self.onDisconnected);
        client.on('end', self.onDisconnected);
      }.bind(this);
      this._write = function(string, func) {
        client.write(string, func);
      }
      this._read = function(data) {
        //...we don't get to manually schedule reads on our own. Grr.
        //So, we just do nothing and let the node.js event handling
        //schedule our eternal reads...
      }
      this._disconnect = function() {
        client.end();
      }
      this._callReadForever = function(data) {
        var self = this;
        //If we've been called, we have data, without error,
        //so setting resultCode to >0 is okay.
        var readInfo = { resultCode: 1, data: data};
        self.readForever(readInfo);
      }.bind(this);
    }
  }

  public static str2ab(str : string) : ArrayBuffer { 
    var buf = new ArrayBuffer(str.length*1); // 1 byte for each char
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++)
    {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  public static ab2str (buf : ArrayBuffer) : string {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

  //Converts a single message from an IRC server into an IrcCommand object.
  public static crackMessage (serverLine : string) : IrcCommand {
    if(serverLine.length === 0)
    {
      return undefined;
    }
    var r = new IrcCommand();
    var parts = serverLine.split(" ");
    var offset = 0;

    //If our message had a prefix, store it.
    if(parts[0].charAt(0) == ":" )
    {
      r.prefix = parts[0];
      offset = 1;
    }
    r.command = parts[0+offset];
    r.username = parts[1+offset];
    r.args = parts.slice(2+offset);
    return r;
  }

  //@returns true if we're both running in an browser, and running under Google
  //Chrome, and have access to Chrome Storage.
  public static runningInChrome() : bool {
    if(typeof window === "undefined") return false;
    return (window.chrome && chrome && chrome.storage);
  }

  public write (s : string, f? : Function) : void {
    var self = this;
    var w;
    if(self.onWrite) {
      self.onWrite(s);
    }
    if(self.onWritten) {
      w = self.onWritten.bind(self, f);
    }
    s+="\r\n";
    self._write(s, w);
  }

  public connect() : void {
    var self = this;
    self._connect(self.serverName, self.serverPort, self.onConnected.bind(self));
  }

  public onConnected() : void {
    var self = this;
    if(self.onConnect) { 
      self.onConnect();
    }
    self.readForever();
    self.write('PASS none');
    self.write('NICK ' + self.nick);
    self.write('USER USER 0 * :Real Name');
  }

  public pong (serverMessage : string) : void {
    var self = this;
    if(serverMessage) {
      self.write("PONG :"+ serverMessage.username.substring(1));
    } 
    else {
      throw new Error("Error: No message passed to pong.");
    }
  }

  public joinChannel (channelName : string) : void {
    var self = this;
    if(channelName) {
      self.write('JOIN ' + channelName);
    }
    else {
      if(self.channel) {
        self.write('JOIN ' + self.channel);
      }
      else {
        throw new Error("joinChannel: No channelName passed in and no default channel defined!");
      }
    }
  }

  public sendPrivmsg (reciever : string, message : string) : void {
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
      throw new Error(except);
    }
  }
  //Main message processing loop.
  public readForever (readInfo? : any) : void
  {
    var self = this;
    if(readInfo!==undefined && readInfo.resultCode < 0)
    {
      self.onDisconnected(readInfo.resultCode);
      return;
    }
    if (readInfo !== undefined && readInfo.resultCode > 0)
    {
      if(self.onRead) {
        self.onRead(readInfo);
      }
      var serverMsg = IrcClient.ab2str(readInfo.data);

      var serverLines = [];
      var serverMessages = [];
      serverLines = serverMsg.split("\n");

      //Split the server messages into single lines.
      for(var i = 0; i < serverLines.length; i++)
      {
        //If the line wasn't empty, save the message.
        var msg = IrcClient.crackMessage(serverLines[i]);
        if(msg !== undefined)
        {
          serverMessages.push(msg);
        }
      }

      if(self.onMessages) {
        self.onMessages(serverMessages);
      }
    }

    self._read(self.readForever.bind(self));
  }//end readForever

  public onDisconnected (resultCode : any) : void
  {
    var self = this;
    if(self.onDisconnect) {
      // we've been disconnected, dang.
      self.onDisconnect(resultCode);
    }
    self._disconnect();
  } // end onDisconnected

  public setUserName (newUserName : string, optionalCallback? : Function) : void
  {
    var self = this;
    if(IrcClient.runningInChrome()) {
      chrome.storage.local.set({userName: newUserName}, optionalCallback);
    }
    else {
      //Don't do anything for now, as we don't have Local Storage.
    }
  } // end setUserName

  public retrieveUserName (defaultUsername : string) : void {
    var self = this;
    if(IrcClient.runningInChrome()) {
      chrome.storage.local.get('userName', function(results) {
        self.nick = results.userName || defaultUsername;
      }); // end get userName from storage
    }
    else {
      self.nick = defaultUsername;
    }
  }
}


//Node.js exports.
if(typeof exports !== 'undefined') {
  exports.IrcClient = IrcClient;
}
