'use strict';

/**
 * Vantage extension which exposes
 * the command `hacker-news`. This pulls
 * the top entries from hacker news.
 */

/**
 * Module dependencies.
 */

import chalk from 'chalk';
import moment from 'moment';
import urlp from 'node:url';
import https from 'node:https';

function request(url) {
  return new Promise((resolve, reject) => {
    let o = urlp.parse(url), req = https, data = '';
    o.method = 'GET';
    req.request(o, (res) => {
      if ((res.statusCode == 302) || (res.statusCode == 301)) { request((!/^http/i.test(res.headers.location) ? o.protocol : '') + res.headers.location, ).then(resolve).catch(reject); return; }
      else if (res.statusCode != 200) { reject(new Error(`Status code: ${res.statusCode}`)); return; }
      res.on('data', (c) => { data += c; })
         .on('error', (e) => { reject(e); })
         .on('end', () => { resolve({ res, body: data }); });
    }).end();
  });
};

function getStory(id, rank, callback) {
  const url = `https://hacker-news.firebaseio.com/v0/item/${id}.json?`;
  request(url).then(({ body, res }) => {
    if (res.statusCode === 200) {
      body = JSON.parse(body);
      body.rank = rank;
      callback(undefined, body);
    }
  })
  .catch((err) => {
    callback(true, `Error getting story: ${err}`);
  });
}

function getStories(stories, callback) {
  let error = false;
  let results = [];
  const total = stories.length;
  let done = 0;

  function handler() {
    done++;
    if (total === done) {
      if (error !== false) {
        callback(true, error);
      } else {
        callback(undefined, results);
      }
    }
  }

  function handleOnce(err, data) {
    if (err) {
      error = data;
    } else {
      results.push(data);
    }
    handler();
  }

  for (let i = 0, l = stories.length; i < l; i++) {
    getStory(stories[i], (i + 1), handleOnce);
  }
}

function getTopStories(amt, callback) {
  amt = amt || 5;
  const url = 'https://hacker-news.firebaseio.com/v0/topstories.json?';
  request(url).then(({ res, body }) => {
    if (res.statusCode === 200) {
      body = JSON.parse(body);
      const sliced = body.slice(0, amt);
      callback(undefined, sliced);
    }
  })
  .catch((err) => {
    callback(true, `Error getting top stories: ${err}`);
  })
}

export default function (vorpal) {
  vorpal
    .command('hacker-news', 'Lists the top stories on hacker news.')
    .option('-l, --length [amt]', 'Limits the list to a given length.')
    .action(function (args, cb) {
      let length = args.options.length;
      length = (isNaN(length)) ? 3 : length;
      this.log('\n  Pulling top ' + length + ' stories on Hacker News:\n');
      getTopStories(length, (err2, data2) => {
        if (!err2) {
          getStories(data2, (err3, data3) => {
            if (!err3) {
              let result = '';
              data3 = data3.sort((a, b) => {
                return (a.rank > b.rank) ? 1 : -1;
              });
              for (let i = 0, l = data3.length; i < l; i++) {
                let s = data3[i];
                let url = String(s.url).split('//');
                url = (url.length > 1) ? url[1] : s.url;
                url = String(url).split('/')[0];
                url = String(url).split('.');
                url.shift();
                url = url.join('.');
                let nbr = String('  ' + (i + 1) + '. ');
                let title = chalk.white(s.title) + ' (' + url + ')\n';
                let points = '     ' + String(s.score) + ' points by ' + String(s.by) + ' ' + String(moment(parseFloat(s.time) * 1000).fromNow()) + ' | ' + String(s.descendants) + ' comments\n';
                let str = nbr + title + points;
                str = str.replace(/’/g, '').replace(/`/g, '').replace(/‘/g, '');
                result = result + str + '\n';
                this.log(str);
              }
              cb(undefined, result);
            } else {
              console.error('Error getting stories: ' + err3);
              cb('Error getting stories: ' + err3);
            }
          });
        } else {
          console.error('Error getting top stories: ' + err2);
          cb('Error getting stories: ' + err2);
        }
      });
    });
};
