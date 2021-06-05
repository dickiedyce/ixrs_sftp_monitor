/**
 * Returns an HTML service HtmlOutput object.
 * @param {object} e event request parameter object.
 * @return {object} The webpage to display.
 */
function doGet(e) {
  const tmpl = HtmlService.createTemplateFromFile('Index');
  const scriptProperties = PropertiesService.getScriptProperties();
  const data = scriptProperties.getProperties();

  // update logging
  const d = new Date;
  tmpl.thisRun = d.toUTCString();
  tmpl.lastRun = ( data.thisRun !== undefined ) ? data.thisRun : tmpl.thisRun;
  tmpl.runs = ( data.runs !== undefined ) ? Number(data.runs) + 1 : 1;

  scriptProperties.setProperty('thisRun', tmpl.thisRun );
  scriptProperties.setProperty('lastRun', tmpl.lastRun );
  scriptProperties.setProperty('runs', tmpl.runs );

  return tmpl.evaluate()
    .setTitle('IxRS Arrivals')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * Return IxRS data from script properties, used by UI.
 * @return {object} The IxRS data as an object.
 */
function getArrivalData() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return JSON.parse(scriptProperties.getProperty('ixrs'));
}

/**
 * Fetch and save IxRS data to script properties, triggered every 10 mins.
 */
function fetchArrivalData() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const response = UrlFetchApp.fetch('https://fmdyce.co.uk/ixrs.json');
  try {
    scriptProperties.setProperty('ixrs', response.getContentText() );
  } catch (err) {
    Logger.log(err.message);
  }
}