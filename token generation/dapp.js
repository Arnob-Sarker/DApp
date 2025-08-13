const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = 'demo123';
const CLIENT_SECRET = 'shhh-456';
const SP_AUTH_URL = 'http://localhost:5000/oauth/authorize';
const SP_TOKEN_URL = 'http://localhost:5000/oauth/token';
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

app.get('/', (req, res) => {
  res.send(`
    <h2>DApp Aggregator</h2>
    <form action="/start-oauth" method="get">
      <button type="submit">Grant Permission to SP</button>
    </form>
  `);
});

app.get('/start-oauth', (req, res) => {
  const state = 'abcxyz'; // random or session-specific for CSRF
  const authUrl = `${SP_AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=${state}`;
  res.redirect(authUrl);
});

app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  // Exchange code for tokens
  try {
    const resp = await axios.post(
      SP_TOKEN_URL,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    // In a real app: store tokens in DB
    res.send(`
      <h3>OAuth Success!</h3>
      <pre>${JSON.stringify(resp.data, null, 2)}</pre>
      <a href="/">Back to Home</a>
    `);
  } catch (err) {
    res.status(400).send('OAuth token exchange failed: ' + err.message);
  }
});

app.listen(3000, () => {
  console.log('DApp running at http://localhost:3000');
});
