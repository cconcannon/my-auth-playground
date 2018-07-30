'use strict';

const https = require('follow-redirects').https;

const github_client_id = process.env.GITHUB_CLIENT_ID;
const github_client_secret = process.env.GITHUB_CLIENT_SECRET;

exports.handler = (event, context, callback) => {
  const authCode = event.queryStringParameters.code;

  const requestPath = "/login/oauth/access_token" +
    "?client_id=" + github_client_id +
    "&client_secret=" + github_client_secret +
    "&code=" + authCode +
    "&accept=:json";

  let response = {};

  const httpOptions = {
    method: 'POST',
    host: 'github.com',
    path: requestPath,
    headers: {
      'User-Agent': 'Serverless-Oauth2-Example',
      'accept': 'application/json'
    }
  }

  https.request(httpOptions, res => {
    res.on('data', (chunk) => {
      response.body += chunk.toString('utf8');
    });

    res.on('error', (e) => {
      console.log('Error--------------', e);
      console.error(e);
    })

    res.on('end', () => {
      callback(null, {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*" // do not deploy this to a public endpoint
        },
        body: JSON.stringify(response)
      });
    })
  })
  .end();
}