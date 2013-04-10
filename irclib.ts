//Easy way to package up a message from the server.
class IrcCommand {
  prefix : string = "";
  command : string = "";
  username : string = "";
  args : string[] = [];
}

//Defined extension points:
//onMessages(serverMessages[x]IrcCommands
//onDisconnect(resultCode)
//onConnect()
//onRead(readInfo)
//onWritten(writeInfo, optional_function)
//onWrite(data)
class IrcClient {
  public nick : string;
  public socketId : number;
  constructor(public serverName: string,
              public serverPort: number,
              defaultNick: string,
              public channel: string) {
    this.retrieveUserName(defaultNick);
    //We're probably running as a Chrome Extension.
    //FIXME: Make this check square with the runningInChrome check,
    //       and play nicely with the various mocks that we're working with.
    if(typeof window !== 'undefined' && chrome && chrome.socket) {
      this._connect = function(serverName, port, cb) {
        chrome.socket.create('tcp', {}, function (createInfo)
        {
          this.socketId = createInfo.socketId;
          chrome.socket.connect(this.socketId, serverName, serverPort, cb);
        }.bind(this)); // end socket.create
      }
      this._write = function(str, func) {
        var ab = IrcClient.str2ab(str);
        chrome.socket.write(this.socketId, ab, func);
      }
      this._read = function(cb) {
        chrome.socket.read(this.socketId, null, cb);
      }
      this._disconnect = function() {
        chrome.socket.disconnect(this.socketId);
      }
    }
    //We should be running under node.js.
    else if(typeof window === 'undefined' && require) {
      var net = require("net");
      var client;
      this._connect = function(serverName, port, cb) {
        client = net.connect({port: port, host: serverName}, cb);
        client.on('data', this._callReadForever);

        //FIXME: Need to pass result code to onDisconnected.
        client.on('error', this.onDisconnected);
        client.on('close', this.onDisconnected);
        client.on('end', this.onDisconnected);
      }.bind(this);
      this._write = function(str, func) {
        client.write(str, func);
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
        //If we've been called, we have data, without error,
        //so setting resultCode to >0 is okay.
        var readInfo = { resultCode: 1, data: data};
        this.readForever(readInfo);
      }.bind(this);
    }
  }

  //Extension points.
  public onMessages(serverMessages: IrcCommand[]) {};
  public onDisconnect(resultCode : any) {};
  public onConnect() {};
  public onRead(readInfo: any) {};
  public onWritten(one: any, two: Function) {};
  public onWrite(data: any) {};

  private _connect(serverName: string, port: number, cb: Function) : void {};
  private _write(str: string, func: Function) : void {};
  private _read(cb: Function) : void {};
  private _disconnect() : void {};
  private _callReadForever(data : any) : void {};

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
    var w;
    if(this.onWrite) {
      this.onWrite(s);
    }
    if(this.onWritten) {
      w = this.onWritten.bind(this, f);
    }
    s+="\r\n";
    this._write(s, w);
  }

  public connect() : void {
    this._connect(this.serverName, this.serverPort, this.onConnected.bind(this));
  }

  public onConnected() : void {
    if(this.onConnect) { 
      this.onConnect();
    }
    this.readForever();
    this.write('PASS none');
    this.write('NICK ' + this.nick);
    this.write('USER USER 0 * :Real Name');
  }

  public pong (serverMessage : IrcCommand) : void {
    if(serverMessage) {
      this.write("PONG :"+ serverMessage.username.substring(1));
    } 
    else {
      throw new Error("Error: No message passed to pong.");
    }
  }

  public joinChannel (channelName : string) : void {
    if(channelName) {
      this.write('JOIN ' + channelName);
    }
    else {
      if(this.channel) {
        this.write('JOIN ' + this.channel);
      }
      else {
        throw new Error("joinChannel: No channelName passed in and no default channel defined!");
      }
    }
  }

  public sendPrivmsg (reciever : string, message : string) : void {
    if(reciever && message) {
      this.write("PRIVMSG " + reciever + " :" + message);
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
  public readForever (one? : any, two? : any) : void
  {
    var readInfo;
    var prevLine;
    if(arguments.length == 2) {
      readInfo = two;
      prevLine = one;
    }
    else {
      readInfo = one;
    }
    if(readInfo!==undefined && readInfo.resultCode < 0)
    {
      this.onDisconnected(readInfo.resultCode);
      return;
    }
    if (readInfo !== undefined && readInfo.resultCode > 0)
    {
      if(this.onRead) {
        this.onRead(readInfo);
      }
      var serverStr = IrcClient.ab2str(readInfo.data);
      var serverMsg =
      prevLine !== undefined ?
        prevLine + serverStr : serverStr;

      var serverLines = [];
      var serverMessages = [];
      serverLines = serverMsg.split("\n");

      //Split the server messages into single lines.
      for(var i = 0; i < serverLines.length; i++) {
        var line = serverLines[i];
        //This Chrome Sockets API sometimes gives us incomplete lines.
        //We assume that there will be only one of these, and save it for later.
        if(line.length > 0 && line.slice(-1) != "\r") {
          prevLine = line;
          break;
        }
        //If the line wasn't empty, save the message.
        var msg = IrcClient.crackMessage(line);
        if(msg !== undefined) {
          serverMessages.push(msg);
        }
      }

      if(this.onMessages) {
        this.onMessages(serverMessages);
      }
    }

    this._read(this.readForever.bind(this, prevLine));
  }//end readForever

  public onDisconnected (resultCode : any) : void
  {
    if(this.onDisconnect) {
      // we've been disconnected, dang.
      this.onDisconnect(resultCode);
    }
    this._disconnect();
  } // end onDisconnected

  public setUserName (newUserName : string, optionalCallback? : Function) : void
  {
    if(IrcClient.runningInChrome()) {
      chrome.storage.local.set({userName: newUserName}, optionalCallback);
    }
    else {
      //Don't do anything for now, as we don't have Local Storage.
    }
  } // end setUserName

  public retrieveUserName (defaultUsername : string) : void {
    this.nick = defaultUsername;
  }
}


//Node.js exports.
if(typeof exports !== 'undefined') {
  exports.IrcClient = IrcClient;
}
