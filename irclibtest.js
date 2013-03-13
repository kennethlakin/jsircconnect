describe("CrackMessage", function() {
	it("Parses Empty String", function() {
		expect(IrcClient.crackMessage("")).toEqual(undefined);
	})
	it("Retrieves name correctly", function() {
		var c = new IrcClient;
		c.retrieveUserName("varjar");
		expect(c.nick).toEqual("varjar");
	})
	it("str2ab and ab2str are transitive", function() {
		var str = "Hello there!";
		var ab = IrcClient.str2ab(str);
		var str2 = IrcClient.ab2str(ab);
		expect(str2).toEqual(str);
	})
})
