#!/Users/dd/.nvm/versions/node/v14.15.1/bin/node
let fs = require('fs');
let Client = require('ssh2-sftp-client');

// timing
let dateOb = new Date();
let timestamp = dateOb.toLocaleString('en-GB', { timeZone: 'UTC' });
let ts = dateOb.getTime();

// file process are local to script directory
process.chdir( '/Users/dd/ixrs_tool' );

// which servers should we process?
const serverList = fs.readFileSync('./servers.config', {encoding:'utf8', flag:'r'});
const servers = JSON.parse(serverList);
const serversToProcess = Object.keys(servers);

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
 * Adds two numbers together.
 * @param {sting} value The date to format.
 * @return {int} Date in 'DD MMM' format.
 */
function formatDate(value) {
  let date = new Date(value);
  const day = date.toLocaleString('default', { day: '2-digit' });
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.toLocaleString('default', { year: 'numeric' });
  return day + ' ' + month ;
}

/**
 * Return the SFTP listing for the specified vendor.
 * @param {string} key The vendor to use.
 * @return {array} The list of files vendor supplies.
 */
function getDirectoryListing(key) {
  const config = servers[key];
  let sftp = new Client();
  return sftp.connect(config)
    .then(() => {
      return sftp.list('/');
    })
    .then(data => {
      sftp.end();
      return {key, data};
    })
    .catch(err => {
      console.log('Error for: ',config.host);
      return {key, data:[]};
    });
}

let IxRSdata;
// read JSON object from file
try {
  const data = fs.readFileSync('./ixrs.json', {encoding:'utf8', flag:'r'});
  IxRSdata = JSON.parse(data.toString());
} catch (error) {
  IxRSdata = {studies:{}};
  log('Issue reading JSON File, new file created');
}

const processesToRun = [];

// generate array of promises to run
serversToProcess.forEach( key => {
    log('==========================');
    log("Provider: "+key+"; "+timestamp);
    processesToRun.push(getDirectoryListing(key));
  });

// wait for all the promises to resolve...
Promise.allSettled(processesToRun).
  then( (results) => {
    results.forEach((listing) =>
      {
        const key = listing.value.key;
        const data = listing.value.data;
        if (data.length > 0) {
          const regex = /.P\d+/g;
          const studies = data.filter(({name}) => name.match(regex));

          if (studies.length > 0) {
            log('Matching '+key+' study data found for ' +
              ( studies.length === 1 ? '1 study: ' : studies.length + ' studies: ')
            );
            log( studies.map( function (e) { return e.name.match(regex)[0]; }).join(', '));
            const result = studies.map( function (e) {
              const names = e.name.match(regex);
              return { study:names[0], filename:e.name, size:e.size, modified:e.modifyTime} ;
            });
            result.forEach(row => IxRSdata.studies[row.study] = { ...row, vendor:key} );
          } else {
            log('No matching study data found for '+key+' ('+data.length+' checked).');
          }
        } else {
          log('No study data found for '+key+'.');
        }
      }
    );  // update data

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
      log("Error writing JSON data.");
    }

    process.exit(0);
  });
