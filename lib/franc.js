/* Guess the natural language of a text
 * Copyright (c) 2014 Titus Wormer <tituswormer@gmail.com>
 * http://github.com/wooorm/franc/
 *
 * Original Python package:
 * Copyright (c) 2008, Kent S Johnson
 * http://code.google.com/p/guess-language/
 *
 * Original C++ version for KDE:
 * Copyright (c) 2006 Jacob R Rideout <kde@jacobrideout.net>
 * http://websvn.kde.org/branches/work/sonnet-refactoring/common/
 *     nlp/guesslanguage.cpp?view=markup
 *
 * Original Language::Guess Perl module:
 * Copyright (c) 2004-2006 Maciej Ceglowski
 * http://web.archive.org/web/20090228163219/http://languid.cantbedone.org/
 *
 * Note: Language::Guess is GPL-licensed. KDE developers received permission
 * from the author to distribute their port under LGPL:
 * http://lists.kde.org/?l=kde-sonnet&m=116910092228811&w=2
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty
 * of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

var data,
    utilities,
    expressions,
    singletons;

/**
 * Load `trigram-utils`.
 */

utilities = require('trigram-utils');

/**
 * Load `expressions` (regular expressions matching
 * scripts).
 */

expressions = require('./expressions.js');

/**
 * Load `singletons` (regular expressions matching
 * scripts, their occurrence denoting a single
 * language).
 */

singletons = require('./singletons.js');

/**
 * Load `data` (trigram information per language,
 * per script).
 */

data = require('./data.json');

/**
 * Construct trigram dictionaries.
 */

(function () {
    var languages,
        name,
        trigrams,
        model,
        script,
        weight;

    for (script in data) {
        languages = data[script];

        for (name in languages) {
            model = languages[name].split('|');

            weight = model.length;

            trigrams = {};

            while (weight--) {
                trigrams[model[weight]] = weight;
            }

            languages[name] = trigrams;
        }
    }
})();

var MAX_LENGTH,
    MIN_LENGTH,
    MAX_DIFFERENCE;

/**
 * Maximum sample length.
 */

MAX_LENGTH = 2048;

/**
 * Minimum sample length.
 */

MIN_LENGTH = 10;

/**
 * The maximum distance to add when a given trigram does
 * not exist in a trigram dictionary.
 */

MAX_DIFFERENCE = 300;

/**
 * Deep regular sort on the number at `1` in both objects.
 *
 * @example
 *   > [[0, 20], [0, 1], [0, 5]].sort(sort);
 *   // [[0, 1], [0, 5], [0, 20]]
 *
 * @param {{1: number}} a
 * @param {{1: number}} b
 */

function sort(a, b) {
    return a[1] - b[1];
}

/**
 * Get the distance between an array of trigram--count tuples,
 * and a language dictionary.
 *
 * @param {Array.<Array.<string, number>>} trigrams - An
 *   array containing trigram--count tuples.
 * @param {Object.<string, number>} model - Object
 *   containing weighted trigrams.
 * @return {number} - The distance between the two.
 */

function getDistance(trigrams, model) {
    var distance,
        index,
        trigram,
        difference;

    distance = 0;
    index = trigrams.length;

    while (index--) {
        trigram = trigrams[index];

        if (trigram[0] in model) {
            difference = trigram[1] - model[trigram[0]];

            if (difference < 0) {
                difference = -difference;
            }
        } else {
            difference = MAX_DIFFERENCE;
        }

        distance += difference;
    }

    return distance;
}

/**
 * Get the distance between an array of trigram--count tuples,
 * and multiple trigram dictionaries.
 *
 * @param {Array.<Array.<string, number>>} trigrams - An
 *   array containing trigram--count tuples.
 * @param {Object.<string, Object>} languages - multiple
 *   trigrams to test against.
 * @return {Array.<Array.<string, number>>} An array
 *   containing language--distance tuples.
 */

function getDistances(trigrams, languages) {
    var distances,
        language;

    distances = [];

    for (language in languages) {
        distances.push([
            language,
            getDistance(trigrams, languages[language])
        ]);
    }

    return distances.sort(sort);
}

/**
 * Get the occurrence ratio of `expression` for
 * `value`.
 *
 * @param {string} value
 * @param {RegExp} expression
 * @return {number} Float between 0 and 1.
 */

function getOccurrence(value, expression) {
    var count;

    count = value.match(expression);

    return (count ? count.length : 0) / value.length || 0;
}

/**
 * From `scripts`, get the most occurring expression for
 * `value`.
 *
 * @param {string} value
 * @param {Object.<string, RegExp>} scripts
 * @return {{0: string, 1: number} Top script and its
 *   occurrence percentage.
 */

function getTopScript(value, scripts) {
    var topCount,
        topScript,
        script,
        count,
        length,
        selection,
        subvalue,
        index;

    subvalue = value.substr(0, 50);
    selection = [];

    for (script in scripts) {
        if (getOccurrence(subvalue, scripts[script]) > 0) {
            selection.push(script);
        }
    }

    length = selection.length;

    if (length === 1) {
        topScript = selection[0];
        topCount = getOccurrence(value, scripts[selection[0]]);
    } else if (length > 1) {
        topCount = -1;
        index = -1;

        while (++index < length) {
            count = getOccurrence(value, scripts[selection[index]]);

            if (count > topCount) {
                topCount = count;
                topScript = selection[index];
            }
        }
    }

    return [topScript, topCount];
}

/**
 * Create a single tuple as a list of tuples from a given
 * language code.
 *
 * @param {Array.<string, number>} An single
 *   language--distance tuple.
 * @return {Array.<Array.<string, number>>} An array
 *   containing a single language--distance.
 */

function singleLanguageTuples(language) {
    return [[language, 1]];
}

/**
 * Get a list of probable languages the given value is
 * written in.
 *
 * @param {string} value - The value to test.
 * @return {Array.<Array.<string, number>>} An array
 *   containing language--distance tuples.
 */

function detectAll(value) {
    var script;

    if (!value || value.length < MIN_LENGTH) {
        return singleLanguageTuples('und');
    }

    value = value.substr(0, MAX_LENGTH);

    /**
     * If value contains more than 60% of a certain
     * unique script, return its corresponding language.
     */

    script = getTopScript(value, singletons);

    if (script[1] > 0.6) {
        return singleLanguageTuples(script[0]);
    }

    /**
     * Get the script which characters occur the most
     * in `value`.
     */

    script = getTopScript(value, expressions);

    /**
     * Get all distances for a given script.
     */

    return getDistances(utilities.asTuples(value), data[script[0]]);
}

/**
 * Get the most probable language for the given value.
 *
 * @param {string} value - The value to test.
 * @return {string} The most probable language.
 */

function detect(value) {
    return detectAll(value)[0][0];
}

/**
 * Expose `detectAll` on `franc`.
 */

detect.all = detectAll;

/**
 * Expose `franc`.
 */

module.exports = detect;
