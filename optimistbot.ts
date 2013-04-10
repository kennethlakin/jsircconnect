var OptimistBot = {
   serverConnect : "wright.freenode.net",
   ircPort : 6667,
   userName : "LakinBot",
   channelName :"#realtestchannel",
   client : undefined,
   socketId : undefined,
   timeOfLastChanMsg : new Date(),
   silentTimeInMin:0.5,


  //OptimistBot Sayings
   goodVibes : ["Great job team!","Wow! I can't believe how much headway we're making!",
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
};

//Node.js imports!
if(typeof require !== 'undefined') {
  var IrcClient = require("./irclib").IrcClient;
}

OptimistBot.main  = function() {
  OptimistBot.client = new IrcClient(
      OptimistBot.serverConnect, OptimistBot.ircPort, 
      OptimistBot.userName, OptimistBot.channelName)

  OptimistBot.timeOfLastChanMsg.setTime(1), //initialize the time to 1.
  OptimistBot.client.onConnect = OptimistBot.onConnected;
  OptimistBot.client.onDisconnect = OptimistBot.onDisconnected;
  OptimistBot.client.onMessages = OptimistBot.handleOptimistMessages;
  OptimistBot.client.onRead = OptimistBot.read;
  OptimistBot.client.onWritten = OptimistBot.onWritten;
  OptimistBot.client.onWrite = OptimistBot.onWrite;

  OptimistBot.client.connect();
  var inputElement = document.getElementById('typing');
  if(inputElement) {
    inputElement.addEventListener('keydown', function (event)
    {
      // if the user pushed the enter key while typing a message (13 is enter):
      if (event.keyCode === 13)
      {
        var message = inputElement.value;
        inputElement.value = "";
        OptimistBot.client.write("PRIVMSG " + OptimistBot.channelName + " :" + message);
      }
    });
  }
};


OptimistBot.onConnected = function()
{
  document.getElementById('connectionStatus').textContent = "connected!";
} // end onConnected

OptimistBot.onDisconnected = function()
{
  document.getElementById('connectionStatus').textContent = "disconnected :(";
} // end onDisconnected

OptimistBot.onWrite = function(s)
{
  console.log(s);
  OptimistBot.displayLineToScreen("[sending] " + s);
}//end write

OptimistBot.read = function(readInfo)
{
  console.log(new Date() + IrcClient.ab2str(readInfo.data));
}//end read

OptimistBot.onWritten = function(one, two)
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

OptimistBot.handleOptimistMessages = function(serverMessages) {
  for(var i = 0; i < serverMessages.length; ++i)
  {
    var m = serverMessages[i];
    console.log(m.command, m);
    switch(m.command)
    {
      //Welcome message!
      case "001":
        OptimistBot.client.joinChannel(OptimistBot.channelName);
        break;
      case "PING":
        OptimistBot.client.pong(m);
        OptimistBot.displayLineToScreen('[SERVER PONG]');
        break;
      case "PRIVMSG":
        OptimistBot.handlePrivmsg(m);
        break;
      default:
        //All this spew is a bit annoying.
        //console.log("WARN: Unhandled message: ", m);
        break;
    }
  }
}

OptimistBot.handlePrivmsg = function(message) {
  var text;
  //This is a message to the channel:
  if(message.username === OptimistBot.channelName)
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
      if(arg.search(OptimistBot.userName) != -1)
      {
        text = "I LIKE RAINBOWS?";
        OptimistBot.sendPrivmsg(OptimistBot.channelName, text);
      }
    }
  }
  //If not, it must be a message to me.
  else
  {
    var messagingUser = message.prefix.slice(1, message.prefix.search("!"));
    text = "I LIKE RAINBOWS!?";
    OptimistBot.sendPrivmsg(messagingUser, text);
  }
}

OptimistBot.sendPrivmsg = function(reciever, message) {
  var dateObj = new Date();
  if(reciever != OptimistBot.channelName) {
    OptimistBot.client.sendPrivmsg(reciever, message);
  }
  else {
    var currTime = dateObj.getTime();
    var silentTime = OptimistBot.silentTimeInMin*60000;
    var lastSentTime = OptimistBot.timeOfLastChanMsg.getTime();
    if (currTime - lastSentTime > silentTime) {
      OptimistBot.timeOfLastChanMsg.setTime(currTime);
      OptimistBot.client.sendPrivmsg(reciever, message);
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

OptimistBot.displayLineToScreen = function(text)
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

if(IrcClient.runningInChrome()) {
  OptimistBot.main();
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
  OptimistBot.main();
}

