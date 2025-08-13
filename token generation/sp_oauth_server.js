const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const url = require('url');
const crypto = require('crypto'); // <-- Add this!
const cors = require('cors');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const CLIENT_ID = 'demo123';
const CLIENT_SECRET = 'shhh-456';
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, state } = req.query;
  // Just show a simple HTML consent/login page
  res.send(`
    <h2>Dummy SP - OAuth Login</h2>
    <p>Authorize DApp to access your ride data?</p>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${client_id}" />
      <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
      <input type="hidden" name="state" value="${state}" />
      <button type="submit">Authorize</button>
    </form>
  `);
});

app.post('/oauth/authorize', (req, res) => {
  // Accept all logins; generate a code
  const { client_id, redirect_uri, state } = req.body;
  // Generate a pseudo-random code (could be stored with user info in real use)
  const code = crypto.randomBytes(12).toString('hex');
  const uri = url.parse(redirect_uri, true);
  uri.query.code = code;
  if (state) uri.query.state = state;
  delete uri.search;
  // For demo: store code in memory (optional, skip for simplicity)
  res.redirect(url.format(uri));
});

app.post('/oauth/token', (req, res) => {
  // Normally: Validate client, code, etc.
  const { client_id, client_secret, code, redirect_uri, grant_type } = req.body;
  // Just check client ID and secret
  if (
    client_id === CLIENT_ID &&
    client_secret === CLIENT_SECRET &&
    code // any code is allowed for demo
  ) {
    // Generate random tokens!
    const accessToken = crypto.randomBytes(16).toString("hex");
    const refreshToken = crypto.randomBytes(16).toString("hex");
    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: 'Bearer'
    });
  } else {
    res.status(400).json({ error: 'invalid_grant' });
  }
});

app.listen(4000, () => {
  console.log('SP OAuth server running at http://localhost:4000');
});
