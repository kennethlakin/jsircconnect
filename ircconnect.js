var socketId;
var serverConnect = "10.0.0.30";
//var serverConnect = "wright.freenode.net";
var ircPort = 6667;
var serverName;
var channelName ="#realtestchannel";
var userName = "LakinBot";
var timeOfLastChanMsg = new Date();
timeOfLastChanMsg.setTime(1); //initialize the time to 1.
var silentTimeMin=.5;

var client = new IrcClient(serverConnect, ircPort, userName, channelName);


//OptimistBot Sayings
var goodVibes = ["Great job team!","Wow! I can't believe how much headway we're making!",
"That's a great point! Let's explore this perspective with bit more dicussion. ",
"Keep up the great work team! This discussion is fascinating!",
"This is very encouraging. We are reaching our goals by talking things out.",
"All of these are great ideas! Let's keep going and get everyone's contribution.",
"Congratulations team! Great work so far!",
"Thanks for mentioning that. That's a perspective I've never thought about before.",
"All right! Fantastic point!",
"Just wanted to throw in my two cents- you're all doing a dynamite job here!",
"That's one thing I love about this channel- the truly diverse ideas being discussed. Great job!",
"I like that. Let's brainstorm some more on this idea.",
];


function IrcCommand() {
  this.prefix = "";
  this.command = "";
  this.username = "";
  this.args = [];
}

function main () {
	client.onConnect = onConnected;
	client.onDisconnect = onDisconnected;
	client.onMessages = handleOptimistMessages;
	client.onRead = read;
	client.onWritten = onWritten;
	client.onWrite = onWrite;

	client.connect();
	var inputElement = document.getElementById('typing');
	inputElement.addEventListener('keydown', function (event)
	{
		// if the user pushed the enter key while typing a message (13 is enter):
		if (event.keyCode === 13)
		{
			var message = inputElement.value;
			inputElement.value = "";
			client.write("PRIVMSG " + channelName + " :" + message);
		}
	});
};


function onConnected()
{
  document.getElementById('connectionStatus').textContent = "connected!";
} // end onConnected

function onDisconnected()
{
  document.getElementById('connectionStatus').textContent = "disconnected :(";
} // end onDisconnected

function onWrite(s)
{
  console.log(s);
	displayLineToScreen("[sending] " + s);
}//end write

function read(readInfo)
{
	console.log(new Date() + client.ab2str(readInfo.data));
}//end read

function onWritten(one, two)
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

function handleOptimistMessages(serverMessages) {
	for(var i = 0; i < serverMessages.length; ++i)
	{
		var m = serverMessages[i];
		console.log(m.command, m);
		switch(m.command)
		{
			//Welcome message!
			case "001":
				client.joinChannel(channelName);
				break;
			case "PING":
				client.pong(m);
				displayLineToScreen('[SERVER PONG]');
				break;
			case "PRIVMSG":
				handlePrivmsg(m);
				break;
			default:
				//All this spew is a bit annoying.
				//console.log("WARN: Unhandled message: ", m);
				break;
		}
	}
}

function handlePrivmsg(message) {
  //This is a message to the channel:
  if(message.username === channelName)
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
      if(arg.search(userName) != -1)
      {
				var text = "I LIKE RAINBOWS?";
				sendPrivmsg(channelName, text);
      }
    }
  }
  //If not, it must be a message to me.
  else
  {
    var messagingUser = message.prefix.slice(1, message.prefix.search("!"));
    var text = "I LIKE RAINBOWS!?";
		sendPrivmsg(messagingUser, text);
  }
}

function sendPrivmsg(reciever, message) {
	var dateObj = new Date();
	if(reciever != channelName) {
		client.sendPrivmsg(reciever, message);
	}
	else if (dateObj.getTime()-timeOfLastChanMsg.getTime()>silentTimeMin*60000)
	{
		timeOfLastChanMsg.setTime(dateObj.getTime());
		client.sendPrivmsg(reciever, message);
	}
	else
	{
		console.log("You don't get to write because you messaged the channel already. dateObj.getTime: ")
		console.log(dateObj.getTime());
		console.log("Time of timeOfLastChanMsg")
		console.log(timeOfLastChanMsg.getTime());
		console.log(dateObj.getTime()-timeOfLastChanMsg.getTime())
		console.log(dateObj.getTime()-timeOfLastChanMsg.getTime()<silentTimeMin*60000)
	}
}

function displayLineToScreen(text)
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

if(window.chrome) {
	main();
}
