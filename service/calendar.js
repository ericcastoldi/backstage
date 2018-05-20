const gcal = require('google-calendar');
const Promise = require("bluebird");

const getCalendars = (accessToken, cb) => {
  gcal(accessToken).calendarList.list(function (err, data) {
    if (err) return cb(err);

    const calendars = data.items.map(cal => {
      const { id, summary } = cal;
      return { id, summary };
    });

    cb(null, calendars);
  });
};

const getEvents = (accessToken, calendarName, cb) => {
  return getCalendars(accessToken, (err, calendars) => {
    if (err) {
      cb(err);
      return;
    }


    const cal = calendars.find(c => {
      return c.summary === calendarName;
    });

    if (!cal) {
      cb(`Não foi possível encontrar o calendário ${calendarName}`);
      return;
    }

    gcal(accessToken).events.list(cal.id, (err, data) => {
      if (err) {
        cb(err);
        return;
      }

      const events = data.items.map(evt => {
        const { id, summary, start, end } = evt;
        return { id, summary, start, end };
      });

      cb(null, events);
      return;
    })
  })
};

module.exports = {
  getEvents: Promise.promisify(getEvents),
  getCalendars: Promise.promisify(getCalendars)
};