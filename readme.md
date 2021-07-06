# IxRS Arrivals Board Backend

Monitor the status of IxRS feeds, provided via SFTP, log the changes, and
maintain a static file of IxRS feed state.

The script querius vendors SFTP servers, finds matching studies, and
rertrieves their sizes, modification dates, downloads, and validates the XML.

Previously stored details are used to determine the 'freshness' of each file,
with files older than 6 hours marked as stale (`status = 'B'`).

## Config file

The process requires a config file (`servers.config`), with an entry for every
Vendor to check. The file format is JSON, structured :

````json
{
  "vendor1": {
    "host": "sftp.vendor1.com",
    "port": "22",
    "username": "user1",
    "password": "password1"
  },
  "vendor2": {
    "host": "sftp.vendor2.com",
    "port": "22",
    "username": "user2",
    "password": "password2"
  }
}
````

The script records the state of the IxRS files offered by the vendors, and
writes a log (`IxRS_tracking.log.txt`) and a JSON file (`ixrs.json`).

### Log File

An example log file:

````text
==========================
Run: 06/07/2021, 21:27:45
No study data found for vendor1.
Matching vendor2 study data found for 3 studies:
xPnnnn1, xPnnnn2, xPnnnn3
### Parsing error: "IXRS_VND2_xPnnnn2_2021-07-06T1200.xml"
Invalid character in entity name; Line: 839; Column: 50; Char:
TypeError: Cannot read property 'length' of undefined
````

### JSON File

An example JSON file.

````json
{
  "studies":{
    "yPnnnn3":{
      "study":"yPnnnn3",
      "filename":"IXRS_vendor1_yPnnnn3_2021-06-02T0000.xml",
      "size":427062,
      "modified":1622617441000,
      "vendor":"vendor1",
      "isValid": true,
      "countries": 3,
      "sites": 42,
      "updated":"02 Jun",
      "age":"77:40",
      "status":"B"
      },
    ...
    "xPnnnn7":{
      "study":"xPnnnn7",
      "filename":"IXRS_vendor2_xPnnnn7_2021-06-05T0000_02.xml",
      "size":449928,
      "modified":1622891500000,
      "vendor":"vendor2",
      "isValid": false,
      "countries": 0,
      "sites": 0,
      "updated":"05 Jun",
      "age":"01:33",
      "status":"A"}
  },
  "lastupdate":1622897088115
}
````

## Appendix A: Install on Centos

Here are some basic instructions for installing on an Vanilla Centos platform. Note version 1.o.3 onwards provides a basic http server for servint the JSON data file. An alternative approach (shown in step 4,) is to use an existing server to serve the file, via a `cp` cron job.

1. Install some basic tools:

    ````bash
    sudo yum install unzip
    sudo yum install centos-release-scl-rh
    sudo yum install rh-nodejs10
    ````

2. Download the latest source files:

    ````bash
    curl -L https://github.com/dickiedyce/ixrs_sftp_monitor/archive/refs/tags/v1.0.1.zip -o ixrs.zip
    unzip ixrs.zip
    mv ixrs_sftp_monitor-1.0.1/ ixrs
    cd ixrs
    ````

3. Enable Node, and install the dependencies:

    ````bash
    scl enable rh-nodejs10 bash
    npm install
    cat >> servers.config <<'EOF'
    {
      "vendor1": {
        "host": "sftp.vendor.com",
        "port": "22",
        "username": "user1",
        "password": "password1"
      },
      "vendor2": {
        "host": "sftp.vendor2.com",
        "port": "22",
        "username": "user2",
        "password": "password2"
      }
    }
    EOF
    cat servers.config
    exit
    ````

4. Edit the crontab file:

    ````bash
    crontab -e
    ````

    Example crontab, showing script execution, and copying of ixrs data to suitable server folder:

    ````crontab
    0,15,30,45 * * * *  scl enable rh-nodejs10 "node ixrs/logixrs.js >> ~/cron.log 2>&1"
    1,16,31,46 * * * *  sudo cp ixrs/ixrs.json "/opt/HTTPServer/htdocs/httpsRoot"
    ````
