// Run script after page has loaded,
// Update display initially, and then
// add repeat calls to updateRefresh
// every second
window.addEventListener('load', () => {
  getArrivalData();
  setInterval(() => updateRefresh(), 1000);
});

/**
 * Return IxRS data from script properties, used by UI.
 * @return {object} The IxRS data.
 */
function getArrivalData() {
  // read from fetch
  fetch('/api/ixrs')
    .then(response => response.json())
    .then(data => updateDisplay(data))
    .catch(error => {
      updateDisplay({ studies: {} });
      console.log(error);
      console.log('Issue reading JSON File, new file created');
    });
}

/**
 * Adds spans to mimic railway arrivals board.
 * @param {string} text The text.
 * @param {int} width The character width of the display element.
 * @return {string} The text with each character
 *   wrapped in an appropriate span.
 */
function addSpans(text, width) {
  if (width > 0) {
    text = String(text).padEnd(width, '–');
  } else {
    text = String(text).padStart(width * -1, '–');
  }
  try {
    text = text
      .toUpperCase()
      .replaceAll(/([^–])/g, '<span class="flip">$1</span>');
    text = text.replaceAll(/–/g, '<span class="flip lightbar">–</span>');
  } catch (err) {
    console.log(text);
  }
  return `${text}&nbsp;`;
}

// Show an element
const show = function (elem) {
  elem.style.display = 'block';
};

function showDetails(studyData) {
  const additionaltitle = document.getElementById('additionaltitle');
  const additionalinfo = document.getElementById('additionalinfo');
  show(additionaltitle);
  show(additionalinfo);

  console.log(studyData);
  const infoText =
    studyData.isValid === false
      ? studyData.study + ' IxRS file is invalid XML.'
      : studyData.sites === undefined || studyData.countries === undefined
      ? studyData.study + ' has yet to list sites.'
      : studyData.study +
        ' covers ' +
        (studyData.sites === 1 ? '1 site' : studyData.sites + ' sites') +
        ', across ' +
        (studyData.countries === 1
          ? '1 country'
          : studyData.countries + ' countries') +
        '.';

  additionalinfo.className = studyData.isValid === false ? 'invalid' : '';
  additionalinfo.innerHTML = addSpans(infoText);
}

/**
 * Updates display of IxRS data.
 * @param {Object} ixrsdata IxRS records, keyed by study number.
 * Each IxRS record looks like this:
 * "BP40283": {
 *  age: "04:32"
 *  filename: "IXRS_BCKT_BP40283_2021-05-17T0000.xml"
 *  modified: 1621234940000
 *  size: 413009
 *  status: "A"
 *  study: "BP40283"
 *  updated: "17 May"
 *  vendor: "signant"
 * }
 *
 */
function updateDisplay(ixrsdata) {
  console.log(ixrsdata);
  const updateinfo = document.getElementById('updateinfo');
  const updatespan = document.getElementById('lastupdate');

  const studyNames = Object.keys(ixrsdata.studies).sort();
  const lastupdate = new Date(ixrsdata.lastupdate);

  updatespan.innerHTML = addSpans(lastupdate.toUTCString());
  show(updateinfo);
  show(updatespan);

  // heading.innerHTML = "Last Update for " + ixrsdata.lastupdate + ":";
  const resultsTable = document.getElementById('results-table');
  const results = document.getElementById('results-body');

  // make sure we have enough child nodes
  // either:
  // 1. we currently have no rows in the table, or
  // 2. we have more rows in the table than studies, or
  // 3. we have fewer or an equal number of rows in the table than studies

  const rowsRequired =
    results.childNodes.length > studyNames.length
      ? results.childNodes.length
      : studyNames.length;
  const emptyRow = document.createElement('tr');
  emptyRow.innerHTML =
    `<td>${addSpans('', 8)}</td>` +
    `<td>${addSpans('', 8)}</td>` +
    `<td>${addSpans('', 6)}</td>` +
    `<td>${addSpans('', -6)}</td>` +
    `<td>${addSpans('', -7)}</td>` +
    '<td><span class="indicator-B" ">&#9677;</span></td>';

  // first time around we have no rows, so lets add them
  if (results.childNodes.length === 0) {
    for (let j = 0; j < rowsRequired; j++) {
      results.append(emptyRow.cloneNode(true));
    }
  }
  show(resultsTable);

  // now we need to replace the rows with the updated data or an empty row
  for (let i = 0; i < rowsRequired; i++) {
    setTimeout(function () {
      results.replaceChild(emptyRow.cloneNode(true), results.childNodes[i]);
    }, 300 * i);
    if (i <= studyNames.length) {
      const studyName = studyNames[i];
      const studyData = ixrsdata.studies[studyName];
      const newRow = document.createElement('tr');
      newRow.onmouseover = function () {
        showDetails(studyData);
      };
      let displaySize = Math.ceil(studyData.size / 1024);
      if (studyData.isValid === false) {
        newRow.className = 'invalid';
        displaySize = 'INVALID';
      }
      newRow.innerHTML =
        `<td>${addSpans(studyData.vendor, 8)}</td>` +
        `<td>${addSpans(studyData.study, 8)}</td>` +
        `<td>${addSpans(studyData.updated, 6)}</td>` +
        `<td>${addSpans(studyData.age, -6)}</td>` +
        `<td>${addSpans(displaySize, -7)}</td>` +
        `<td><span class="indicator-${studyData.status}" ">&#9677;</span></td>`;
      setTimeout(function () {
        results.replaceChild(newRow, results.childNodes[i]);
      }, 250 + 300 * i);
    }
  }
}

/**
 * Updates clock, and refreshes data periodically
 */
function updateRefresh() {
  const d = new Date();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  const time = addSpans(`${hours}:${mins} GMT`);
  document.getElementById('lastrefresh').innerHTML = time;

  // execute every 5 minutes
  if (d.getUTCMinutes() % 5 === 2 && d.getUTCSeconds() === 5) {
    // 2,7,12,17,22... minutes past
    getArrivalData();
  }
}
