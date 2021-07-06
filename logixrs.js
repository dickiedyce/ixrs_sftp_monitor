#!/Users/dd/.nvm/versions/node/v14.15.1/bin/node
const Client = require('ssh2-sftp-client');
const fs = require('fs');
const xml2js = require('xml2js');
require('events').EventEmitter.defaultMaxListeners = 15;

// File processing criteria
const fileRegex = /IXRS.+?_.P\d+_[^_]+xml$/;
const studyRegex = /.P\d+/g;

// timing
let dateOb = new Date();
let timestamp = dateOb.toLocaleString('en-GB', { timeZone: 'UTC' });
let ts = dateOb.getTime();

// file process are local to script directory
process.chdir( __dirname );

/*** Helper  functions ***/

/**
 * Log changes to output file
 * @param {string} text The text to log.
 */
 function log(text) {
  fs.appendFileSync('IxRS_tracking_log.txt', text + "\n");
}

/**
 * Return formatted 24-hour time.
 * @param {int} timeInMilliseconds The time to format.
 * @return {string} The formatted time hh:mm.
 */
function ageInHoursMins(timeInMilliseconds) {
  var seconds = Math.floor(timeInMilliseconds / 1000);
  var minutes = Math.floor(seconds / 60);
  var minutesPart = String(minutes % 60);
  var hoursPart = String(Math.floor(minutes / 60));
  return (hoursPart.padStart(2,'0') + ':' + minutesPart.padStart(2,'0'));
}

/**
 * Formats dates as DD MMM.
 * @param {string} value The date to format.
 * @return {int} Date in 'DD MMM' format.
 */
function formatDate(value) {
  let date = new Date(value);
  const day = date.toLocaleString('default', { day: '2-digit' });
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.toLocaleString('default', { year: 'numeric' });
  return day + ' ' + month ;
}

// which servers should we process?
const serverList = fs.readFileSync('./servers.config', {encoding:'utf8', flag:'r'});
const servers = JSON.parse(serverList);
const serversToProcess = Object.keys(servers);

const parser = new xml2js.Parser();

// read IxRSdata JSON object from file
let IxRSdata;
try {
  const data = fs.readFileSync('./ixrs.json', {encoding:'utf8', flag:'r'});
  IxRSdata = JSON.parse(data.toString());
} catch (error) {
  IxRSdata = {studies:{}};
  log('Issue reading JSON File, new file created');
}

log('');
log('==========================');
log("Run: "+timestamp);

serversToProcess.forEach( vendor => {
  const config = servers[vendor];
  let sftp = new Client();

  sftp.connect(config)
    .then( async () => {
      // only list non-duplicate xml files beginning with IXRS whose
      // study number has a P as the second character
      const filelist = await sftp.list('/',fileRegex);

      if (filelist.length > 0) {
        log('Matching '+vendor+' study data found for ' +
          ( filelist.length === 1 ? '1 study: ' : filelist.length + ' studies: ')
          );
          log( filelist.map( function (e) { return e.name.match(studyRegex)[0]; }).join(', '));
      } else {
        log('No study data found for '+vendor+'.');
      };

      // for each matching file, construct the details and save it
      for (let index = 0; index < filelist.length; index++) {
        const file = filelist[index];
        const names = file.name.match(studyRegex);
        const details = { study:names[0],
          filename:file.name,
          size:file.size,
          modified:file.modifyTime,
          vendor,
          isValid:false,
          countries:0,
          sites: 0 };
        const remoteFile = file.name; // remote file dir path
        const localFile = file.name; // local file dir path

        let data = null;

        try { // download file, read into memory, then delete it
          await sftp.fastGet(remoteFile, localFile);
          data = fs.readFileSync(localFile);
          fs.rmSync(localFile)
        } catch (err) {
          log('### Download error :' + localFile);
        }

        if (data !== null) {
          parser.parseString(data, function (err, result) {
            if(err === null) {
              details.isValid = true;
              const countryList = result
                .GenentechXSD
                .Header_Information[0]
                .Study_Information[0]
                .Country_Information;
              details.countries = countryList.length || 0;
              details.sites = countryList.reduce(function (result, country) {
                return result + (country.Site_Information.length || 0);
              }, 0);
            } else {
              log('### Parsing error: "' + localFile + '" ' + err.message.split("\n").join('; '));
            }
          });
        }

        IxRSdata.studies[details.study] = details;
      }
    })
    .catch(err => log(err))
    .finally(() => {
      sftp.end();

      IxRSdata.lastupdate = ts;

      Object.keys(IxRSdata.studies).forEach( study => {
        const {modified, size, ...rest} = IxRSdata.studies[study];
        IxRSdata.studies[study]['updated'] = formatDate(modified);
        IxRSdata.studies[study]['age'] = ageInHoursMins(IxRSdata.lastupdate - modified)
        // 6 hour 'freshness' window determines status:
        IxRSdata.studies[study]['status'] = (Math.floor((IxRSdata.lastupdate - modified) / 1000 / 60 / 60) < 6 ? 'A' : 'B');
      }, IxRSdata);

      // convert JSON object to string
      const exportData = JSON.stringify(IxRSdata);
      // write JSON string to a file
      try {
        fs.writeFileSync('./ixrs.json', exportData, {encoding:'utf8'});
      } catch (error) {
        log("### Error writing JSON data.");
      }
    });
});

