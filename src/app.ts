import express = require('express');

const app: express.Application = express();
const port = process.env.PORT || 3000;

app.get('/', function (req, res) {
  res.send('It actually works.!');
});

app.listen(port, function () {
  console.log(`Deadbolt is listening on port ${port}!`);
});