const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// add routes for public folder, /codh and /pdil APIs
app.get(app.use(express.static(path.join(__dirname, 'public'))));

app.get('/api/ixrs', (req, res) => {
  fs.readFile('./ixrs.json', (err, json) => {
    let obj = JSON.parse(json);
    res.json(obj);
  });
});

const port = process.env.PORT || 80;
server = app.listen(port, () => console.log(`Server running on port ${port}`));
