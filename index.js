
'use strict';

if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/trace-agent').start();
  require('@google-cloud/debug-agent').start();
}

const express  = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const MemcachedStore = require('connect-memjs')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const logging = require('./logging');
const SpotifyWebApi = require('spotify-web-api-node');
const { getEvents, getCalendars } = require('./service/calendar');
const app = express();

const {
  oauth2callback,
  MEMCACHE_URL,
  MEMCACHE_USERNAME,
  MEMCACHE_PASSWORD,
  consumer_key,
  consumer_secret,
  spotifyClientId,
  spotifyClientSecret
} = require('./config');


const sessionConfig = {
  resave: false,
  saveUninitialized: false,
  secret: 'n3nn5',
  signed: true
};

if (MEMCACHE_URL) {
  sessionConfig.store = new MemcachedStore({
    servers: [ MEMCACHE_URL ],
    username: MEMCACHE_USERNAME,
    password: MEMCACHE_PASSWORD
  });
}

app.use(logging.requestLogger);

app.use(cookieParser());
app.use(bodyParser());
app.use(session(sessionConfig));
app.use(passport.initialize());

passport.use(new GoogleStrategy({
    clientID: consumer_key,
    clientSecret: consumer_secret,
    callbackURL: oauth2callback,
    scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar'] 
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    return done(null, profile);
  }
));

app.get('/auth', passport.authenticate('google', { session: false }));

app.get('/oauth2callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  function(req, res) { 
    req.session.access_token = req.user.accessToken;
    res.redirect('/');
  });


const handleError = (err, res) => {
  const { message } = err;
  console.log('err', err);
  res.status(400).send({ message });
};


const spotifyCredentials = {
  clientId: spotifyClientId,
  clientSecret: spotifyClientSecret
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

function spotifyAuth(req, res, next) {
  if(req.session.spotify_access_token && spotifyApi.getAccessToken()) {
    return next();
  }

  const handle = (err) => next(err);
  spotifyApi.clientCredentialsGrant()
    .then((data) => {

      const token = data.body['access_token'];

      spotifyApi.setAccessToken(token);
      req.session.spotify_access_token = token;

      next();

    }, handle)
    .catch(handle);
}

app.get('/api/spotify/search', spotifyAuth,(req, res) => {

  const handle = (err) => handleError(err, res);
  console.log('req.query', req.query)
  
  spotifyApi.searchTracks(req.query.q).then(
    (data) => {
      console.log(data.body);

      const tracks = data.body.tracks.items;
      const info = tracks.map(track => {
        const { name, album } = track;
        const artist = track.artists.map(artist => artist.name).join(', ');

        return { name, artist, album: album.name };
      });
      
      res.json(info);
      
      // res.json(data.body.tracks.items);
    }, handle).catch(handle);
});


app.get('/api/calendar/:calendarName', (req, res) => {
  if(!req.session.access_token) {
    return res.redirect('/auth');
  }
  
  const accessToken = req.session.access_token;
  const { calendarName } = req.params;
  const handle = (err) => handleError(err, res);

  getEvents(accessToken, calendarName)
    .then(evts => {
      res.send(evts);
    })
    .catch(handle);
});

app.all('/api/calendar', function(req, res){
  
  if(!req.session.access_token) return res.redirect('/auth');
  
  const accessToken = req.session.access_token;
  const handle = (err) => handleError(err, res);

  getCalendars(accessToken)
    .then(calendars => {
      res.send(calendars);
    })
    .catch(handle);
});

app.use(logging.errorLogger);

// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Basic error handler
app.use((err, req, res, next) => {
  /* jshint unused:false */
  // If our routes specified a specific response, then send that. Otherwise,
  // send a generic message so as not to leak anything.
  res.status(500).send(err.response || 'Something broke!');
});

app.listen(8080);