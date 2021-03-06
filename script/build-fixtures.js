'use strict';

/**
 * Dependencies.
 */

var support,
    customFixtures,
    udhr;

support = require('../data/support');
customFixtures = require('../data/custom-fixtures');
udhr = require('udhr').json();

/**
 * Get fixtures from UDHR preambles and notes.
 */

var data;

data = {};

Object.keys(support).forEach(function (code) {
    var udhrKey,
        fixture;

    udhrKey = support[code].udhr;

    if (udhrKey in customFixtures) {
        fixture = customFixtures[udhrKey];
    } else if (udhrKey in udhr) {
        if (udhr[udhrKey].preamble && udhr[udhrKey].preamble.para) {
            fixture = udhr[udhrKey].preamble.para;
        } else if (udhr[udhrKey].note && udhr[udhrKey].note[0]) {
            fixture = udhr[udhrKey].note[0].para;
        }
    }

    if (!fixture) {
        throw new Error(
            'Could not access preamble or note for `' + code + '` ' +
            '(' + udhrKey + ')'
        );
    }

    fixture = fixture.slice(0, 200);

    data[code] = fixture;
});

/**
 * Add a fixture for `und`: Undetermined languages.
 */

data.und = '';

data = JSON.stringify(data, 0, 2);

/**
 * Write.
 */

require('fs').writeFileSync('spec/fixtures.json', data);
