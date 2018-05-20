const util = require('util');
const express  = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const gcal = require('google-calendar');
const config = require('./config');
const Promise = require("bluebird");
const { getEvents, getEventsAsync, getCalendarsAsync } = require('./service/calendar');
const app = express();

app.use(cookieParser());
app.use(bodyParser());
app.use(session({ secret: 'n3nn5' }));
app.use(passport.initialize());


passport.use(new GoogleStrategy({
    clientID: config.consumer_key,
    clientSecret: config.consumer_secret,
    callbackURL: "http://localhost:8282/oauth2callback",
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
  res.status(400).send({ message });
};

app.get('/:calendarName', (req, res) => {
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

app.all('/', function(req, res){
  
  if(!req.session.access_token) return res.redirect('/auth');
  
  const accessToken = req.session.access_token;
  const handle = (err) => handleError(err, res);

  getCalendars(accessToken)
    .then(calendars => {
      res.send(calendars);
    })
    .catch(handle);
});


app.listen(8282);