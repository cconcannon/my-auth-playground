'use strict';

exports.handler = (event, context, callback) => {
  const response = {
    prop1: "My Best Attribute",
    prop2: "My Not-So-Best Attribute"
  }

  callback(null, {
    statusCode: 200,
    body: JSON.stringify(response),
  });
}