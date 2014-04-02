var fs = require('fs');
var casper = require('casper').create();
var stringTable = require('string-table');

var config = {
   "username":"<USERNAME>",
   "password":"<PASSWORD>",
   "memorable": "<MEMORABLE-INFORMATION>"
};

// DESKTOP
casper.userAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.63 Safari/537.31');

// Login
casper.start('https://www.halifax-online.co.uk', function() {
	console.log("Step 1:",this.getTitle());
	if (this.getTitle() != "Halifax - Welcome to Online Banking") throw "Step 1 - Title doesn't match";
	this.fill('form[name="frmLogin"]',{
		'frmLogin:strCustomerLogin_userID': config.username,
		'frmLogin:strCustomerLogin_pwd': config.password
	});
	this.click('input[name="frmLogin:btnLogin1"]');
	this.wait(1000);
});

// Fill in memorable information
casper.then(function() {
	console.log('Step 2:',this.getTitle());
	if (this.getTitle() != "Halifax - Enter Memorable Information") throw "Step 2 - Title doesn't match";
	var challenge = this.evaluate(function(secret) {
		var challenge = {
			request: [
				parseInt(document.querySelector('label[for="frmentermemorableinformation1:strEnterMemorableInformation_memInfo1"]').innerText.replace(/[^0-9]/g,'')),
				parseInt(document.querySelector('label[for="frmentermemorableinformation1:strEnterMemorableInformation_memInfo2"]').innerText.replace(/[^0-9]/g,'')),
				parseInt(document.querySelector('label[for="frmentermemorableinformation1:strEnterMemorableInformation_memInfo3"]').innerText.replace(/[^0-9]/g,''))
			]
		};
		challenge.response = [
			secret[challenge.request[0]-1],
			secret[challenge.request[1]-1],
			secret[challenge.request[2]-1]
		];
		challenge.values = [
			'&nbsp;'+challenge.response[0],
			'&nbsp;'+challenge.response[1],
			'&nbsp;'+challenge.response[2],
		];
		return challenge;
	},config.memorable);
	this.fill('form[name="frmentermemorableinformation1"]',{
		'frmentermemorableinformation1:strEnterMemorableInformation_memInfo1': challenge.values[0],
		'frmentermemorableinformation1:strEnterMemorableInformation_memInfo2': challenge.values[1],
		'frmentermemorableinformation1:strEnterMemorableInformation_memInfo3': challenge.values[2]
	});
	this.click('input[name="frmentermemorableinformation1:btnContinue"]');
	this.wait(1000);
});

// Navigate to first account
casper.then(function() {
	console.log('Step 3:',this.getTitle());
	if (this.getTitle() != "Halifax - Personal Account Overview") throw "Step 3 - Title doesn't match";
	this.click('a[name="lstAccLst:0:lkImageRetail1"]');
});

// Get transactions
casper.then(function() {
	console.log('Step 4:',this.getTitle());
	if (this.getTitle() != "Halifax - View Product Details") throw "Step 4 - Title doesn't match";
	var transactions = this.evaluate(function() {
		var trans = [];
		var items = document.querySelectorAll('.statement tbody tr');
		for (var i=0; i<items.length; i++) {
			var cols = items[i].querySelectorAll('td, th');
			//
			var amount = parseFloat(cols[3].innerText.replace(/[^0-9-\.]/g,''));
			if (!amount) amount = 0-parseFloat(cols[4].innerText.replace(/[^0-9-\.]/g,''));
			//
			trans.push({
				when: new Date(cols[0].innerText),
				name: cols[1].innerText,
				type: cols[2].innerText,
				amount: amount,
				balance: parseFloat(cols[5].innerText.replace(/[^0-9-\.]/g,''))
			});
		};
		return trans;
	});
	console.log(stringTable.create(transactions));
});

casper.run();
