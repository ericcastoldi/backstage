const clientInfo = require('./client_id.json').web;
const { config } = require('./package.json');
const { client_id, client_secret } = clientInfo;

const environment = process.env.NODE_ENV && process.env.NODE_ENV === 'production' 
  ? config.prod
  : config.dev;

console.log(environment);

const {
  oauth2callback,
  MEMCACHE_URL,
  MEMCACHE_USERNAME,
  MEMCACHE_PASSWORD,
  spotifyClientId,
  spotifyClientSecret
} = environment;

module.exports = {
  oauth2callback, 
  MEMCACHE_URL, 
  MEMCACHE_USERNAME, 
  MEMCACHE_PASSWORD,
  consumer_key: client_id,
  consumer_secret: client_secret,
  spotifyClientId,
  spotifyClientSecret
};