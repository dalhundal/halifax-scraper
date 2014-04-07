Halifax-Scraper
===============

Scrapes the Halifax Online Banking website for your current account details, showing

1. Recent transactions
2. Pending transactions
3. Account balance summary



Requirements
------------
Runs using CasperJS (with PhantomJS backend). Not tested on anything but the machine I develop on. It is presumed that your current account is the first account listed when you login - if it's not, I don't know what will happen.



Usage
-----

Firstly, to pull in the npm modules this script uses:

    npm install

Secondly, you need to provide your login details. Currently, the way this is handled is pretty sketchy - you need to put them in to a **plain text file**. *Super janky, I know - any hassle you get into doing this is your own problem, don't look at me.*

Edit the included hfx.config.json.example file, filling it in with your login details. Then rename the file to hfx.config.json

To run:

    casperjs hfx.js
    
Nothing more than that.



Logging
-------

By default, the script will output log data to a file named *'hfx.log.tmp'* in the current directory.
If an error is encountered, it will also write a file named *'hfx.error.tmp'* in the current directory.

The location of both of these files can be overridden in the config file if desired - but you need to make sure that the location you specify for them is writeable - right now the script doesn't check that.

When the script is run, it check to see if the error-log file exists - if it does, the script will not continue. This is done as a safeguard to prevent multiple successive failed login's which may result in your online banking account being locked. You should review the error that was logged and if you're happy for the script to run, delete the error-log file.



Sample Output
-------------

    {
        timestamp: 123234234234,
        summary: {
            available: 1200.25,
            balance: 1000.25,
            clearBalance: 980.25,
            overdraft: 200,
            pending: 20
        },
        pending: [
            {
                amount: 20,
                card: 1234,
                name: 'A Restaurant',
                type: 'CHIP AND PIN',
                when: '2014-04-01'
            },
            {...}
        ],
        complete: [
            {
                amount: -10.50,
                balance: 1000.25,
                name: ['Newsagent','CD 1234','London'],
                type: 'DEB',
                when: '2014-04-01'
            },
            {...}
        ]
    }



Notes
-----
As this scrapes data from the Halifax Online Banking website, it is of course dependant on the format of their pages not changing. It works as of April 2014.


Do whatever you want with this - just remember any hassle you get yourself into is your problem.
