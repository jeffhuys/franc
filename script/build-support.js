'use strict';

var fs,
    support;

fs = require('fs');
support = require('../data/support');

support = Object.keys(support).sort(function (a, b) {
    return support[b].speakers - support[a].speakers;
}).map(function (iso6393) {
    return support[iso6393];
});

support.unshift({
    'iso6393' : 'und',
    'name' : '† **Special: Case for unknown language**'
});

fs.writeFileSync('Supported-Languages.md',
    'Supported Languages:\n' +
    '=================\n' +
    '\n' +
    '- † — Undetermined languages will result in the "und" language code\n' +
    '\n' +
    '| ISO-639-3 | Name | Script | Speakers |\n' +
    '| :-------: | :--: | :----: | :------: |\n' +

    support.map(function (language) {
        return '| ' + [
            '[' + language.iso6393 + '](http://www-01.sil.org/' +
            'iso639-3/documentation.asp?id=' + language.iso6393 + ')',
            language.name,
            language.script,
            language.speakers
        ].join(' | ') + ' |';
    }).join('\n') +

    '\n'
);
