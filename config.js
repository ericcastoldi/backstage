const clientInfo = require('./client_id.json').web;
const { client_id, client_secret } = clientInfo;

module.exports = {
  consumer_key: client_id,
  consumer_secret: client_secret
};