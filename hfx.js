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


var data = {
	login: {
		url: 'https://www.halifax-online.co.uk',
		title: 'Halifax - Welcome to Online Banking',
		form: {
			selector: 'form[name="frmLogin"]',
			submit: 'input[name="frmLogin:btnLogin1"]',
			input_username: 'frmLogin:strCustomerLogin_userID',
			input_password: 'frmLogin:strCustomerLogin_pwd'
		}
	},
	memorable: {
		title: 'Halifax - Enter Memorable Information',
		form: {
			selector: 'form[name="frmentermemorableinformation1"]',
			submit: 'input[name="frmentermemorableinformation1:btnContinue"]',
			label_1: 'label[for="frmentermemorableinformation1:strEnterMemorableInformation_memInfo1"]',
			input_1: 'frmentermemorableinformation1:strEnterMemorableInformation_memInfo1',
			label_2: 'label[for="frmentermemorableinformation1:strEnterMemorableInformation_memInfo2"]',
			input_2: 'frmentermemorableinformation1:strEnterMemorableInformation_memInfo2',
			label_3: 'label[for="frmentermemorableinformation1:strEnterMemorableInformation_memInfo3"]',
			input_3: 'frmentermemorableinformation1:strEnterMemorableInformation_memInfo3'
		}
	},
	accountList: {
		title: 'Halifax - Personal Account Overview',
		link: 'a[name="lstAccLst:0:lkImageRetail1"]'
	},
	accountDetail: {
		title: 'Halifax - View Product Details',
		pendingLink: 'a[href="#show0"]',
		pendingTable: '#pendingTransactionsTable',
		pendingTableRow: '#pendingTransactionsTable tbody tr',
		statementRow: '.statement tbody tr',
		balance: '.accountBalance .balance',
		available: '.accountBalance',
		overdraft: '.accountBalance .accountMsg'
	}
}

// Step 1 - Login with username and password
casper.start(data.login.url, function login() {
	hfxLog("Step 1:",this.getTitle());
	if (this.getTitle() != data.login.title) throw "Step 1 - Title doesn't match";
	var formData = {};
	formData[data.login.form.input_username] = config.username;
	formData[data.login.form.input_password] = config.password;
	this.fill(data.login.form.selector,formData);
	this.click(data.login.form.submit);
	this.wait(500);
});

// Fill in memorable information
casper.then(function fillInMemorableInformation() {
	hfxLog('Step 2:',this.getTitle());
	if (this.getTitle() != data.memorable.title) throw "Step 2 - Title doesn't match";
	var challenge = this.evaluate(function evaluateMemorableInformationRequested(data, secret) {
		var challenge = {
			request: [
				parseInt(document.querySelector(data.memorable.form.label_1).innerText.replace(/[^0-9]/g,'')),
				parseInt(document.querySelector(data.memorable.form.label_2).innerText.replace(/[^0-9]/g,'')),
				parseInt(document.querySelector(data.memorable.form.label_3).innerText.replace(/[^0-9]/g,''))
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
	},data, config.memorable);
	var formData = {};
	formData[data.memorable.form.input_1] = challenge.values[0];
	formData[data.memorable.form.input_2] = challenge.values[1];
	formData[data.memorable.form.input_3] = challenge.values[2];
	this.fill(data.memorable.form.selector,formData);
	this.click(data.memorable.form.submit);
	this.wait(500);
});

// Navigate to first account
casper.then(function navigateToFirstAccount() {
	hfxLog('Step 3:',this.getTitle());
	if (this.getTitle() != data.accountList.title) throw "Step 3 - Title doesn't match";
	this.click(data.accountList.link);
});

// Get transactions
casper.then(function getTransactions() {
	hfxLog('Step 4:',this.getTitle());
	if (this.getTitle() != data.accountDetail.title) throw "Step 4 - Title doesn't match";
	this.click(data.accountDetail.pendingLink);
	this.waitForSelector(data.accountDetail.pendingTable,function clickPendingTransactions() {
		this.wait(500,function waitForPendingTransactions() {
			var transactions = this.evaluate(function evaluateTransactions(data) {
				var trans = {complete:[],pending:[],summary:{}};
				var pendingItems = Array.prototype.filter.call(document.querySelectorAll(data.accountDetail.pendingTableRow),function(row) {
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
				var completeItems = document.querySelectorAll(data.accountDetail.statementRow);
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
				trans.summary.balance = hfxUtil.currency(document.querySelector(data.accountDetail.balance));
				trans.summary.available=hfxUtil.currency(document.querySelector(data.accountDetail.available).childNodes[4],true);
				trans.summary.overdraft=hfxUtil.currency(document.querySelectorAll(data.accountDetail.overdraft)[1]);
				trans.summary.clear = parseFloat((trans.summary.available - trans.summary.overdraft).toFixed(2));
				trans.summary.unclear = parseFloat((trans.summary.balance - (trans.summary.available - trans.summary.overdraft)).toFixed(2));
				return trans;
			},data);
			console.log(JSON.stringify(transactions));
		});
	},function() {
		console.log("AJAX FAILED");
	});
});


casper.run();