const express = require('express');
const app = express();
const fs = require('fs');

app.get('/', (req, res) => {
  res.send('IxRS Server');
})

app.get('/api/ixrs', (req, res) => {
  fs.readFile('./ixrs.json', (err, json) => {
    let obj = JSON.parse(json);
    res.json(obj);
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));
