'use strict';

import assert from 'assert';
import should from 'should';
import Vorpal from '@ApeironTsuka/vorpal';
import hn from '../lib/index.js';

let stdout = '', vorpal;

function stdoutFn(data) {
  stdout += data;
  return '';
}

describe('vorpal-hacker-news', () => {
  describe('root', () => {
    before('vorpal preps', () => {
      vorpal = new Vorpal().pipe(stdoutFn).show();
    });

    beforeEach('vorpal preps', () => {
      stdout = '';
    });

    it('should exist and be a function', () => {
      should.exist(hn);
      hn.should.be.type('function');
    });

    it('should import into Vorpal', () => {
      (() => {
        vorpal.use(hn);
      }).should.not.throw();
    });

    it('should pull three items from HN.', function (done) {
      this.timeout(20000);
      vorpal.exec('hacker-news', (err) => {
        should.not.exist(err);
        stdout.should.containEql('1.');
        stdout.should.containEql('2.');
        stdout.should.containEql('3.');
        stdout.should.not.containEql('4.');
        done();
      });
    });

    it('should pull a custom number of items from HN.', function (done) {
      this.timeout(20000);
      vorpal.exec('hacker-news -l 2', (err) => {
        should.not.exist(err);
        stdout.should.containEql('1.');
        stdout.should.containEql('2.');
        stdout.should.not.containEql('3.');
        done();
      });
    });
  });
});

