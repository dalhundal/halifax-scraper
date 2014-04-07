var fs = require('fs');
var moment = require('moment');

var config = JSON.parse(fs.read('hfx.config.json'));

var casper = require('casper').create({
	clientScripts: [
		'node_modules/moment/min/moment.min.js',
		'includes/hfxUtil.js'
	]
});

// Log to file function, path of log file to be specified in config file
function hfxLog() {
	if (!config.log) return;
	var msg = moment().format('[[]YYYY-MM-DD HH:mm:ss[] ]') + Array.prototype.splice.call(arguments,0).join(" ")+"\n";
	fs.write(config.log,msg,'a');
};

// Set user agent string to mimick a desktop Chrome browser
casper.userAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.63 Safari/537.31');

// Catch exceptions, log to file
casper.on('error',function(e) {
	hfxLog("ERROR",e);
});

// Step 1 - Login with username and password
casper.start('https://www.halifax-online.co.uk', function login() {
	hfxLog("Step 1:",this.getTitle());
	if (this.getTitle() != 'Halifax - Welcome to Online Banking') throw "Step 1 - Title doesn't match";
	this.fill('form[name="frmLogin"]',{
		'frmLogin:strCustomerLogin_userID': config.username,
		'frmLogin:strCustomerLogin_pwd': config.password
	});
	this.click('input[name="frmLogin:btnLogin1"]');
	this.wait(500);
});

// Fill in memorable information
casper.then(function fillInMemorableInformation() {
	hfxLog('Step 2:',this.getTitle());
	if (this.getTitle() != 'Halifax - Enter Memorable Information') throw "Step 2 - Title doesn't match";
	var challenge = this.evaluate(function evaluateMemorableInformationRequested(secret) {
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
	this.wait(500);
});

// Navigate to first account
casper.then(function navigateToFirstAccount() {
	hfxLog('Step 3:',this.getTitle());
	if (this.getTitle() != 'Halifax - Personal Account Overview') throw "Step 3 - Title doesn't match";
	this.click('a[name="lstAccLst:0:lkImageRetail1"]');
});

// Get transactions
casper.then(function getTransactions() {
	hfxLog('Step 4:',this.getTitle());
	if (this.getTitle() != 'Halifax - View Product Details') throw "Step 4 - Title doesn't match";
	this.click('a[href="#show0"]');
	this.waitForSelector('#pendingTransactionsTable',function clickPendingTransactions() {
		this.wait(500,function waitForPendingTransactions() {
			var transactions = this.evaluate(function evaluateTransactions() {
				var trans = {complete:[],pending:[],summary:{}};
				var pendingItems = Array.prototype.filter.call(document.querySelectorAll('#pendingTransactionsTable tbody tr'),function(row) {
					return (row.querySelectorAll('td,th').length == 5);
				});
				trans.pending = Array.prototype.map.call(pendingItems,function mapPendingItems(item) {
					var cols = item.querySelectorAll('td,th');
					return {
						when: hfxUtil.date(cols[0]),
						name: hfxUtil.text(cols[1]),
						card: hfxUtil.text(cols[2]),
						type: hfxUtil.text(cols[3]),
						amount: 0-hfxUtil.currency(cols[4])
					};
				});
				//
				var completeItems = document.querySelectorAll('.statement tbody tr');
				trans.complete = Array.prototype.map.call(completeItems,function mapCompleteITems(item) {
					var cols = item.querySelectorAll('td, th');
					//
					var amount = hfxUtil.currency(cols[3]) || 0-hfxUtil.currency(cols[4]);
					var description = Array.prototype.map.call(cols[1].querySelectorAll('span'), hfxUtil.text).filter(function(val) {
						return val ? true:false;
					});
					return {
						when: hfxUtil.date(cols[0]),
						name: description.join('|'),
						type: hfxUtil.text(cols[2]),
						amount: amount,
						balance: hfxUtil.currency(cols[5])
					};
				});
				//
				trans.summary.balance = hfxUtil.currency(document.querySelector('.accountBalance .balance'));
				trans.summary.available=hfxUtil.currency(document.querySelector('.accountBalance').childNodes[4],true);
				trans.summary.overdraft=hfxUtil.currency(document.querySelectorAll('.accountBalance .accountMsg')[1]);
				trans.summary.clear = parseFloat((trans.summary.available - trans.summary.overdraft).toFixed(2));
				trans.summary.unclear = parseFloat((trans.summary.balance - (trans.summary.available - trans.summary.overdraft)).toFixed(2));
				return trans;
			});
			console.log(JSON.stringify(transactions));
		});
	},function() {
		console.log("AJAX FAILED");
	});
});


casper.run();