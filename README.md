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



Plans for later
---------------
1. Have it spit out nice JSON.



Notes
-----
As this scrapes data from the Halifax Online Banking website, it is of course dependant on the format of their pages not changing. It works as of April 2014.


Do whatever you want with this - just remember any hassle you get yourself into is your problem.
