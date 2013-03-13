describe("IrcClient tests", function() {
  describe("Message parsing tests", function() {
  	it("Parses Empty String", function() {
  		expect(IrcClient.crackMessage("")).toEqual(undefined);
  	})
  })
  it("Sets name correctly, in the absence of Chrome LocalStorage.", function() {
    var c = new IrcClient("", 0, "nick");
    expect(c.nick).toEqual("nick");
    c.retrieveUserName("varjar");
    expect(c.nick).toEqual("varjar");
  })
  it("str2ab and ab2str are symmetric", function() {
    var str = "Hello there!";
    var ab = IrcClient.str2ab(str);
    expect(IrcClient.ab2str(ab)).toEqual(str);
    expect(IrcClient.ab2str(ab)).not.toEqual("asdf");
  })
  describe("Throws on various errors", function() {
  	var c;
  	beforeEach( function () { c = new IrcClient(); });
  	it("Throws on Join, with no channel name passed.", function() {
  		expect(function() {
  			c.joinChannel();
  		}).toThrow();
  		expect(function() {
  			c.joinChannel("#channel");
  		}).not.toThrow();
  	})
  	it("Throws on sendPrivmsg, with no reciever and/or message passed.", function() {
  		expect(function() {
  			c.sendPrivmsg();
  		}).toThrow();
  		expect(function() {
  			c.sendPrivmsg("asdf");
  		}).toThrow();
  		expect(function() {
  			c.sendPrivmsg(undefined, "asdf");
  		}).toThrow();
  		expect(function() {
  			c.sendPrivmsg("asdf", "asdf");
  		}).not.toThrow();
  	})
  	it("Throws on pong, when no server name specified.", function() {
  		expect(function() { 
  			c.pong();
  		}).toThrow();
  	})
  	it("Doesn't throw on pong, when server name specified.", function() {
  		expect(function() { 
  			c.pong({ username: ":server.name.tld" });
  		}).not.toThrow();
  	})
  }) //End "Throws on various errors suite"
  describe("Various read/write operations", function() {
  	var c;
  	chrome.socket = { 
      connect: function() {;},
      create: function() {;},
      read: function() {;},
      write: function() {;},
      disconnect: function() {;}
		};
  	beforeEach(function() { c = new IrcClient() });

  	it("Should connect", function() {
  		spyOn(chrome.socket, "create");
  		c.connect();	
  		expect(chrome.socket.create).toHaveBeenCalled();
  	});
  	it("Should disconnect", function() {
  		spyOn(chrome.socket, "disconnect");
  		c.onDisconnected();
  		expect(chrome.socket.disconnect).toHaveBeenCalled();
  	});
  	it("Should write", function() {
  		spyOn(chrome.socket, "read");
  		spyOn(chrome.socket, "write");
  		c.write();
  		expect(chrome.socket.write).toHaveBeenCalled();
  		expect(chrome.socket.read).not.toHaveBeenCalled();
  	});
  	it("Should read", function() {
  		spyOn(chrome.socket, "read");
  		spyOn(chrome.socket, "write");
  		c.readForever();
  		expect(chrome.socket.read).toHaveBeenCalled();
  		expect(chrome.socket.write).not.toHaveBeenCalled();
  	});
  })
})
