var fs = require('fs');
var moment = require('moment');
var underscore = require('underscore');

var casper = require('casper').create({
	clientScripts: [
		'node_modules/moment/min/moment.min.js',
		'includes/hfxUtil.js'
	]
});

var configFile = 'hfx.config.json';
if (!fs.isFile(configFile) || !fs.isReadable(configFile)) throw "Could not read config file: "+configFile;
try {
	var config = JSON.parse(fs.read(configFile));
} catch (e) {
	throw "Failed to parse JSON config file";
};

// Refuse to run if error file exists. This is to prevent multiple failed attempts which could lock the account
if (fs.isFile(config.error)) throw "Aborting. Last run produced an error - see error log for details";

// Log to file function, path of log file to be specified in config file
function writeLog() {
	if (!config.log) return;
	var msg = moment().format('[[]YYYY-MM-DD HH:mm:ss[] ]') + Array.prototype.splice.call(arguments,0).join(" ")+"\n";
	fs.write(config.log,msg,'a');
};

function writeLogError() {
	var args = Array.prototype.splice.call(arguments,0);
	args.unshift('[ERROR]');
	writeLog.apply(null,args);
	fs.write(config.error,args.join(" "),'w');
	casper.exit();
};

casper.on('error',writeLogError);

function assertTitle(title) {
	if (casper.getTitle() != title) {
		throw "Page title mismatch. Expecting ["+title+"]. Got ["+casper.getTitle()+"]"
	} else {
		writeLog("Page title:",casper.getTitle());
	};
};

// Set user agent string to mimick a desktop Chrome browser
casper.userAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.63 Safari/537.31');

// Step 1 - Login with username and password
casper.start('https://www.halifax-online.co.uk', function login() {
	writeLog("***** Start ******");
	assertTitle('Halifax - Welcome to Online Banking');
	this.fill('form[name="frmLogin"]',{
		'frmLogin:strCustomerLogin_userID': config.username,
		'frmLogin:strCustomerLogin_pwd': config.password
	});
	this.click('input[name="frmLogin:btnLogin1"]');
	this.wait(500);
});

// Step 2 - Fill in memorable information
casper.then(function fillInMemorableInformation() {
	assertTitle('Halifax - Enter Memorable Information');
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
	writeLog("Challenge:",challenge.request[0],challenge.request[1],challenge.request[2]);
	this.fill('form[name="frmentermemorableinformation1"]',{
		'frmentermemorableinformation1:strEnterMemorableInformation_memInfo1': challenge.values[0],
		'frmentermemorableinformation1:strEnterMemorableInformation_memInfo2': challenge.values[1],
		'frmentermemorableinformation1:strEnterMemorableInformation_memInfo3': challenge.values[2]
	});
	this.click('input[name="frmentermemorableinformation1:btnContinue"]');
	this.wait(500);
});

// Step 3 - Navigate to first account
casper.then(function navigateToFirstAccount() {
	assertTitle('Halifax - Personal Account Overview');
	this.click('a[name="lstAccLst:0:lkImageRetail1"]');
});

// Step 4 - Get transactions
casper.then(function getTransactions() {
	assertTitle('Halifax - View Product Details');
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
			writeLog(transactions.pending.length,"pending transactions.",transactions.complete.length,"complete transactions");
			console.log(JSON.stringify(transactions));
		});
	},function() {
		writeLogError("Failed to load pending transactions");
	});
});

casper.run();