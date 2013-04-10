class OptimistBot {
  private client: IrcClient;
  private timeOfLastChanMsg: Date;
  private silentTimeInMin: number;
  private goodVibes: string[];

  constructor(
    private serverName: string,
    private serverPort: number,
    private userName: string,
    private channelName: string) {

    this.timeOfLastChanMsg = new Date();
    this.silentTimeInMin = 0.5;
    //OptimistBot Sayings
    this.goodVibes = [
      "Great job team!","Wow! I can't believe how much headway we're making!",
      "That's a great point! Let's explore this perspective with bit more dicussion. ",
      "Keep up the great work team! This discussion is fascinating!",
      "This is very encouraging. We are reaching our goals by talking things out.",
      "All of these are great ideas! Let's keep going and get everyone's contribution.",
      "Congratulations team! Great work so far!",
      "Thanks for mentioning that. That's a perspective I've never thought about before.",
      "All right! Fantastic point!",
      "Just wanted to throw in my two cents- you're all doing a dynamite job here!",
      "That's one thing I love about this channel- the truly diverse ideas being discussed. Great job!",
      "I like that. Let's brainstorm some more on this idea."
    ]
  }

  public main () {
    this.client = new IrcClient(
        this.serverName, this.serverPort, 
        this.userName, this.channelName)

    this.timeOfLastChanMsg.setTime(1), //initialize the time to 1.
    this.client.onConnect = OptimistBot.onConnected;
    this.client.onDisconnect = OptimistBot.onDisconnected;
    this.client.onMessages = this.handleOptimistMessages.bind(this);
    this.client.onRead = OptimistBot.read;
    this.client.onWritten = OptimistBot.onWritten;
    this.client.onWrite = OptimistBot.onWrite;

    this.client.connect();
    var inputElement = document.getElementById('typing');
    if(inputElement) {
      inputElement.addEventListener('keydown', function (event)
      {
        // if the user pushed the enter key while typing a message (13 is enter):
        if (event.keyCode === 13)
        {
          var message = inputElement.value;
          inputElement.value = "";
          this.client.write("PRIVMSG " + this.channelName + " :" + message);
        }
      });
    }
  };


  private static onConnected ()
  {
    document.getElementById('connectionStatus').textContent = "connected!";
  } // end onConnected

  private static onDisconnected ()
  {
    document.getElementById('connectionStatus').textContent = "disconnected :(";
  } // end onDisconnected

  private static onWrite (s)
  {
    console.log(s);
    displayLineToScreen("[sending] " + s);
  }//end write

  private static read (readInfo)
  {
    console.log(new Date() + IrcClient.ab2str(readInfo.data));
  }//end read

  private static onWritten (one: any, two: Function)
  {
    if(two) {
      console.log('write was ', two); 
      if(one) {
        one();
      }
    }
    else {
      console.log('write was ', one); 
    }
  }

  private handleOptimistMessages (serverMessages) {
    for(var i = 0; i < serverMessages.length; ++i)
    {
      var m = serverMessages[i];
      console.log(m.command, m);
      switch(m.command)
      {
        //Welcome message!
        case "001":
          this.client.joinChannel(this.channelName);
          break;
        case "PING":
          this.client.pong(m);
          OptimistBot.displayLineToScreen('[SERVER PONG]');
          break;
        case "PRIVMSG":
          this.handlePrivmsg(m);
          break;
        default:
          //All this spew is a bit annoying.
          //console.log("WARN: Unhandled message: ", m);
          break;
      }
    }
  }

  private handlePrivmsg (message) {
    var text;
    //This is a message to the channel:
    if(message.username === this.channelName)
    {
      for(var i = 0; i < message.args.length; ++i)
      {
        var arg = message.args[i];
        //Slice off the colon from the first arg.
        //FIXME: We should do this fixup elsewhere.
        if(i === 0)
        {
          arg = arg.substring(1);
        }
        //If someone has mentioned us, speak back.
        if(arg.search(this.userName) != -1)
        {
          text = "I LIKE RAINBOWS?";
          this.sendPrivmsg(this.channelName, text);
        }
      }
    }
    //If not, it must be a message to me.
    else
    {
      var messagingUser = message.prefix.slice(1, message.prefix.search("!"));
      text = "I LIKE RAINBOWS!?";
      this.sendPrivmsg(messagingUser, text);
    }
  }

  private sendPrivmsg (reciever, message) {
    var dateObj = new Date();
    if(reciever != this.channelName) {
      this.client.sendPrivmsg(reciever, message);
    }
    else {
      var currTime = dateObj.getTime();
      var silentTime = this.silentTimeInMin*60000;
      var lastSentTime = this.timeOfLastChanMsg.getTime();
      if (currTime - lastSentTime > silentTime) {
        this.timeOfLastChanMsg.setTime(currTime);
        this.client.sendPrivmsg(reciever, message);
      }
      else {
        console.log("You don't get to write because you messaged the channel already. dateObj.getTime: ")
        console.log(currTime);
        console.log("Time of timeOfLastChanMsg")
        console.log(lastSentTime);
        console.log(currTime - lastSentTime)
        console.log(currTime - lastSentTime < silentTime)
      }
    }
  }

  private static displayLineToScreen (text: string)
  {
    var p = document.createElement('pre');
    p.textContent = text;
    var container = document.getElementById('recent-chat-display');
    container.appendChild(p);
    while (container.childNodes.length > 15)
    {
      container.childNodes[0].remove();
    }
  }
}

//Node.js imports!
if(typeof require !== 'undefined') {
  var IrcClient = require("./irclib").IrcClient;
}

if(IrcClient.runningInChrome()) {
  var ob = new OptimistBot("chat.freenode.net",
    6667, "LakinBot", "#realtestchannel");
  ob.main();
}
//Node.js main!
else if(typeof exports !== 'undefined') {
  //Mocks to make the UI "work" under node.
  var document = {
    createElement : function() {
      return { textContent : "" }
    },
    getElementById : function() {
      return {
        textContent : "",
        addEventListener: function() {},
        appendChild: function() {},
        childNodes: { length: 0}
        }
      }
  };
  var ob = new OptimistBot("chat.freenode.net",
    6667, "LakinBot", "#realtestchannel");
  ob.main();
}

