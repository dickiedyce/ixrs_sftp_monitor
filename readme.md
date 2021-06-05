# IxRS Arrivals Board Backend

Monitor the status of IxRS feeds, provided via SFTP, log the changes, and
maintain a static file of IxRS feed state.

The script querius vendors SFTP servers, finds matching studies, and
rertrieves their sizes, and modification dates. Previously stored details are
used to determine the 'freshness' of each file, with files older than 6 hours
marked as stale (`status = 'B'`).

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
Provider: vendor1; 05/06/2021, 12:44:48
Provider: vendor2; 05/06/2021, 12:44:48
No study data found for vendor1.
Matching vendor2 study data found for 3 studies:
xPnnnn1, xPnnnn2, xPnnnn3
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
      "updated":"05 Jun",
      "age":"01:33",
      "status":"A"}
  },
  "lastupdate":1622897088115
}
````
