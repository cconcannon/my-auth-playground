'use strict';
const https = require('https');

const github_client_id = process.env.GITHUB_CLIENT_ID;
const github_client_secret = process.env.GITHUB_CLIENT_SECRET;


exports.handler = (event, context, callback) => {
  const authCode = event.queryStringParameters.code;

  const tokenEndpoint = "/login/oauth/access_token" +
    "?client_id=" + github_client_id +
    "&client_secret=" + github_client_secret +
    "&code=" + authCode +
    "&accept=:json";

  let response = '';

  const httpOptions = {
    method: 'POST',
    host: 'github.com',
    path: tokenEndpoint,
    headers: {
      'User-Agent': 'Serverless-Oauth2-Example',
      'accept': 'application/json'
    }
  }

  https.request(httpOptions, res => {
    res.on('data', (raw) => {
      response += raw.toString('utf8');
    });

    res.on('error', (e) => {
      console.log('Error--------------', e);
      console.error(e);
    })

    res.on('end', () => {
      callback(null, {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "http://localhost:4200",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        body: response
      });
    })
  })
  .end();
}