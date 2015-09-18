(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var replaceLinkWithIframe = require('./replace-link-with-iframe');
var probable = require('probable');

// var aNodes = probable.shuffle(document.querySelectorAll('a'));
var aNodes = document.querySelectorAll('a');
var counter = 0;

for (var i = 0; i < aNodes.length; ++i) {
  queueReplacement(aNodes[i]);
}

function queueReplacement(aNode) {
  var href = aNode.getAttribute('href');

  if (href && href.indexOf('#') !== 0 &&
    targetIsOKFromLocation(document.location, href, aNode.hostname)) {

    setTimeout(callReplaceLinkWithIframe, counter * 1000);
    counter += 1;
  }

  function callReplaceLinkWithIframe() {
    replaceLinkWithIframe(aNode);
  }
}

function targetIsOKFromLocation(location, targetHref, targetDomain) {
  var isOK = false;

  if (targetDomain && targetDomain !== location.hostname) {
    if (location.protocol === 'https:') {
      if (targetHref.indexOf('https:') === 0 || targetHref.indexOf('//') === 0) {
        isOK = true;
      }
    }
    else {
      isOK = true;
    }
  }

  return isOK;
}

},{"./replace-link-with-iframe":2,"probable":3}],2:[function(require,module,exports){
var rollDie = require('probable').rollDie;

function replaceLinkWithIframe(linkNode) {
  var iframe = document.createElement('iframe');
  iframe.src = linkNode.getAttribute('href');
  iframe.height = 0;
  var finalHeight = 320 + rollDie(10) * 64;
  iframe.width = '100%';
  linkNode.parentElement.appendChild(iframe);

  iframe.onload = resizeIframe;

  function resizeIframe() {
    iframe.height = 320;
    setTimeout(growIframe, 1000);
  }

  function growIframe() {
    iframe.height = parseInt(iframe.height, 10) + 64;
    if (iframe.height < finalHeight) {
      setTimeout(growIframe, 1000);
    }
  }
}

module.exports = replaceLinkWithIframe;

},{"probable":3}],3:[function(require,module,exports){
function createProbable(opts) {
  var random = Math.random;

  if (opts && opts.random) {
    random = opts.random;
  }

  // Rolls a die.
  // ~~ is faster than Math.floor but doesn't work as a floor with very high 
  // numbers.
  function roll(sides) {
    return Math.floor(random() * sides);
  }

  // This is like `roll`, but it is 1-based, like traditional dice.
  function rollDie(sides) {
    if (sides === 0) {
      return 0;
    }
    else {
      return roll(sides) + 1;
    }
  }

  // Makes a table that maps probability ranges to outcomes.
  // 
  // rangesAndOutcomePairs should look like this:
  // [
  //  [[0, 80], 'a'],
  //  [[81, 95], 'b'],
  //  [[96, 100], 'c']
  // ]
  // 
  function createRangeTable(rangesAndOutcomePairs) {
    var rangesAndOutcomes = rangesAndOutcomePairs;
    var length = rangesAndOutcomes[rangesAndOutcomes.length - 1][0][1]
      - rangesAndOutcomes[0][0][0] + 1;

    function curriedOutcomeAtIndex(index) {
      return outcomeAtIndex(rangesAndOutcomes, index);
    }

    function rollOnTable() {
      var outcome = curriedOutcomeAtIndex(roll(length));
      if (typeof outcome === 'function') {
        return outcome();
      }
      else {
        return outcome;
      }
    }

    return {
      outcomeAtIndex: curriedOutcomeAtIndex,
      roll: rollOnTable,
      length: length
    };
  }

  // Looks up what outcome corresponds to the given index. Returns undefined 
  // if the index is not inside any range.
  function outcomeAtIndex(rangesAndOutcomes, index) {
    index = (+index);

    for (var i = 0; i < rangesAndOutcomes.length; ++i) {
      var rangeOutcomePair = rangesAndOutcomes[i];
      var range = rangeOutcomePair[0];
      if (index >= range[0] && index <= range[1]) {
        return rangeOutcomePair[1];
      }
    }
  }

  // A shorthand way to create a range table object. Given a hash of outcomes 
  // and the *size* of the probability range that they occupy, this function 
  // generates the ranges for createRangeTable.
  // It's handy, but if you're doing this a lot, keep in mind that it's much 
  // slower than createRangeTable.

  function createRangeTableFromDict(outcomesAndLikelihoods) {
    return createRangeTable(
      convertDictToRangesAndOutcomePairs(outcomesAndLikelihoods)
    );
  }

  // outcomesAndLikelihoods format: 
  // {
  //   failure: 30,
  //   success: 20,
  //   doover: 5
  // }
  //
  // Returns an array in this kind of format:
  // [
  //  [[0, 29], 'failure'],
  //  [[30, 49], 'success'],
  //  [[50, 54], 'doover']
  // ]

  function convertDictToRangesAndOutcomePairs(outcomesAndLikelihoods) {
    var rangesAndOutcomes = [];
    var endOfLastUsedRange = -1;

    var loArray = convertOLPairDictToLOArray(outcomesAndLikelihoods);
    loArray = loArray.sort(compareLikelihoodSizeInPairsDesc);

    loArray.forEach(function addRangeOutcomePair(loPair) {
      var likelihood = loPair[0];
      var outcome = loPair[1];
      var start = endOfLastUsedRange + 1;
      var endOfNewRange = start + likelihood - 1;
      rangesAndOutcomes.push([[start, endOfNewRange], outcome]);

      endOfLastUsedRange = endOfNewRange;
    });

    return rangesAndOutcomes;
  }

  function convertOLPairDictToLOArray(outcomesAndLikelihoods) {
    var loArray = [];

    for (var key in outcomesAndLikelihoods) {
      var probability = outcomesAndLikelihoods[key];
      loArray.push([probability, key]);
    }

    return loArray;
  }

  function compareLikelihoodSizeInPairsDesc(pairA, pairB) {
    return pairA[0] > pairB[0] ? -1 : 1;
  }

  //  [[0, 80], 'a'],
  //  [[81, 95], 'b'],
  //  [[96, 100], 'c']

  // Table defs will be objects like this:
  // {
  //   '0-24': 'Bulbasaur',
  //   '25-66': 'Squirtle',
  //   '67-99': 'Charmander'
  // }
  // The values can be other other objects, in which case those outcomes are
  // considered recursive rolls. e.g.
  //
  // {
  //   '0-39': {
  //     '0-24': 'Bulbasaur',
  //     '25-66': 'Squirtle',
  //     '67-99': 'Charmander'
  //   },
  //   '40-55': 'Human',
  //   '56-99': 'Rock'
  // }
  //
  // When 0-39 is rolled on the outer table, another roll is made on that inner
  // table.
  //
  // It will not detect cycles.

  function createTableFromDef(def) {
    var rangeOutcomePairs = rangeOutcomePairsFromDef(def);
    return createRangeTable(rangeOutcomePairs);
  }

  function rangeOutcomePairsFromDef(def) {
    var rangeOutcomePairs = [];
    for (var rangeString in def) {
      var range = rangeStringToRange(rangeString);
      var outcome = def[rangeString];
      if (typeof outcome === 'object') {
        if (Array.isArray(outcome)) {
          outcome = createCustomPickFromArray(outcome);
        }
        else {
          // Recurse.
          var subtable = createTableFromDef(outcome);
          if (typeof subtable.roll == 'function') {
            outcome = subtable.roll;
          }
        }
      }
      rangeOutcomePairs.push([range, outcome]);
    }
    return rangeOutcomePairs;    
  }

  function rangeStringToRange(s) {
    var bounds = s.split('-');
    if (bounds.length > 2) {
      return undefined;
    }
    else {
      return [+bounds[0], +bounds[1]];
    }
  }

  // Picks randomly from an array.
  function pickFromArray(array, emptyArrayDefault) {
    if (!array || typeof array.length !== 'number' || array.length < 1) {
      return emptyArrayDefault;
    }
    else {
      return array[roll(array.length)];
    }
  }

  function createCustomPickFromArray(array, emptyArrayDefault) {
    return function pick() {
      return pickFromArray(array, emptyArrayDefault);
    };
  }

  // Combines every element in A with every element in B.
  function crossArrays(arrayA, arrayB) {
    var combos = [];
    arrayA.forEach(function combineElementWithArrayB(aElement) {
      arrayB.forEach(function combineBElementWithAElement(bElement) {
        if (Array.isArray(aElement) || Array.isArray(bElement)) {
          combos.push(aElement.concat(bElement));
        }
        else {
          combos.push([aElement, bElement]);
        }
      });
    });
    return combos;
  }

  function getCartesianProduct(arrays) {
    return arrays.slice(1).reduce(crossArrays, arrays[0]);
  }

  // From Underscore.js, except we are using the random function specified in 
  // our constructor instead of Math.random, necessarily.
  function shuffle(array) {
    var length = array.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = roll(index + 1);
      if (rand !== index) {
        shuffled[index] = shuffled[rand];
      }
      shuffled[rand] = array[index];
    }
    return shuffled;
  }

  function sample(array, sampleSize) {
    return shuffle(array).slice(0, sampleSize);
  }

  return {
    roll: roll,
    rollDie: rollDie,
    createRangeTable: createRangeTable,
    createRangeTableFromDict: createRangeTableFromDict,
    createTableFromDef: createTableFromDef,
    convertDictToRangesAndOutcomePairs: convertDictToRangesAndOutcomePairs,
    pickFromArray: pickFromArray,
    crossArrays: crossArrays,
    getCartesianProduct: getCartesianProduct,
    shuffle: shuffle,
    sample: sample
  };
}

var probable = createProbable();

if (typeof module === 'object') {
  module.exports = probable;
  module.exports.createProbable = createProbable;
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYm9va21hcmtsZXQtc3JjLmpzIiwibGliL3JlcGxhY2UtbGluay13aXRoLWlmcmFtZS5qcyIsIm5vZGVfbW9kdWxlcy9wcm9iYWJsZS9wcm9iYWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcmVwbGFjZUxpbmtXaXRoSWZyYW1lID0gcmVxdWlyZSgnLi9yZXBsYWNlLWxpbmstd2l0aC1pZnJhbWUnKTtcbnZhciBwcm9iYWJsZSA9IHJlcXVpcmUoJ3Byb2JhYmxlJyk7XG5cbi8vIHZhciBhTm9kZXMgPSBwcm9iYWJsZS5zaHVmZmxlKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2EnKSk7XG52YXIgYU5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnYScpO1xudmFyIGNvdW50ZXIgPSAwO1xuXG5mb3IgKHZhciBpID0gMDsgaSA8IGFOb2Rlcy5sZW5ndGg7ICsraSkge1xuICBxdWV1ZVJlcGxhY2VtZW50KGFOb2Rlc1tpXSk7XG59XG5cbmZ1bmN0aW9uIHF1ZXVlUmVwbGFjZW1lbnQoYU5vZGUpIHtcbiAgdmFyIGhyZWYgPSBhTm9kZS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcblxuICBpZiAoaHJlZiAmJiBocmVmLmluZGV4T2YoJyMnKSAhPT0gMCAmJlxuICAgIHRhcmdldElzT0tGcm9tTG9jYXRpb24oZG9jdW1lbnQubG9jYXRpb24sIGhyZWYsIGFOb2RlLmhvc3RuYW1lKSkge1xuXG4gICAgc2V0VGltZW91dChjYWxsUmVwbGFjZUxpbmtXaXRoSWZyYW1lLCBjb3VudGVyICogMTAwMCk7XG4gICAgY291bnRlciArPSAxO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FsbFJlcGxhY2VMaW5rV2l0aElmcmFtZSgpIHtcbiAgICByZXBsYWNlTGlua1dpdGhJZnJhbWUoYU5vZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRhcmdldElzT0tGcm9tTG9jYXRpb24obG9jYXRpb24sIHRhcmdldEhyZWYsIHRhcmdldERvbWFpbikge1xuICB2YXIgaXNPSyA9IGZhbHNlO1xuXG4gIGlmICh0YXJnZXREb21haW4gJiYgdGFyZ2V0RG9tYWluICE9PSBsb2NhdGlvbi5ob3N0bmFtZSkge1xuICAgIGlmIChsb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicpIHtcbiAgICAgIGlmICh0YXJnZXRIcmVmLmluZGV4T2YoJ2h0dHBzOicpID09PSAwIHx8IHRhcmdldEhyZWYuaW5kZXhPZignLy8nKSA9PT0gMCkge1xuICAgICAgICBpc09LID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpc09LID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaXNPSztcbn1cbiIsInZhciByb2xsRGllID0gcmVxdWlyZSgncHJvYmFibGUnKS5yb2xsRGllO1xuXG5mdW5jdGlvbiByZXBsYWNlTGlua1dpdGhJZnJhbWUobGlua05vZGUpIHtcbiAgdmFyIGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICBpZnJhbWUuc3JjID0gbGlua05vZGUuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gIGlmcmFtZS5oZWlnaHQgPSAwO1xuICB2YXIgZmluYWxIZWlnaHQgPSAzMjAgKyByb2xsRGllKDEwKSAqIDY0O1xuICBpZnJhbWUud2lkdGggPSAnMTAwJSc7XG4gIGxpbmtOb2RlLnBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcblxuICBpZnJhbWUub25sb2FkID0gcmVzaXplSWZyYW1lO1xuXG4gIGZ1bmN0aW9uIHJlc2l6ZUlmcmFtZSgpIHtcbiAgICBpZnJhbWUuaGVpZ2h0ID0gMzIwO1xuICAgIHNldFRpbWVvdXQoZ3Jvd0lmcmFtZSwgMTAwMCk7XG4gIH1cblxuICBmdW5jdGlvbiBncm93SWZyYW1lKCkge1xuICAgIGlmcmFtZS5oZWlnaHQgPSBwYXJzZUludChpZnJhbWUuaGVpZ2h0LCAxMCkgKyA2NDtcbiAgICBpZiAoaWZyYW1lLmhlaWdodCA8IGZpbmFsSGVpZ2h0KSB7XG4gICAgICBzZXRUaW1lb3V0KGdyb3dJZnJhbWUsIDEwMDApO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcGxhY2VMaW5rV2l0aElmcmFtZTtcbiIsImZ1bmN0aW9uIGNyZWF0ZVByb2JhYmxlKG9wdHMpIHtcbiAgdmFyIHJhbmRvbSA9IE1hdGgucmFuZG9tO1xuXG4gIGlmIChvcHRzICYmIG9wdHMucmFuZG9tKSB7XG4gICAgcmFuZG9tID0gb3B0cy5yYW5kb207XG4gIH1cblxuICAvLyBSb2xscyBhIGRpZS5cbiAgLy8gfn4gaXMgZmFzdGVyIHRoYW4gTWF0aC5mbG9vciBidXQgZG9lc24ndCB3b3JrIGFzIGEgZmxvb3Igd2l0aCB2ZXJ5IGhpZ2ggXG4gIC8vIG51bWJlcnMuXG4gIGZ1bmN0aW9uIHJvbGwoc2lkZXMpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihyYW5kb20oKSAqIHNpZGVzKTtcbiAgfVxuXG4gIC8vIFRoaXMgaXMgbGlrZSBgcm9sbGAsIGJ1dCBpdCBpcyAxLWJhc2VkLCBsaWtlIHRyYWRpdGlvbmFsIGRpY2UuXG4gIGZ1bmN0aW9uIHJvbGxEaWUoc2lkZXMpIHtcbiAgICBpZiAoc2lkZXMgPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiByb2xsKHNpZGVzKSArIDE7XG4gICAgfVxuICB9XG5cbiAgLy8gTWFrZXMgYSB0YWJsZSB0aGF0IG1hcHMgcHJvYmFiaWxpdHkgcmFuZ2VzIHRvIG91dGNvbWVzLlxuICAvLyBcbiAgLy8gcmFuZ2VzQW5kT3V0Y29tZVBhaXJzIHNob3VsZCBsb29rIGxpa2UgdGhpczpcbiAgLy8gW1xuICAvLyAgW1swLCA4MF0sICdhJ10sXG4gIC8vICBbWzgxLCA5NV0sICdiJ10sXG4gIC8vICBbWzk2LCAxMDBdLCAnYyddXG4gIC8vIF1cbiAgLy8gXG4gIGZ1bmN0aW9uIGNyZWF0ZVJhbmdlVGFibGUocmFuZ2VzQW5kT3V0Y29tZVBhaXJzKSB7XG4gICAgdmFyIHJhbmdlc0FuZE91dGNvbWVzID0gcmFuZ2VzQW5kT3V0Y29tZVBhaXJzO1xuICAgIHZhciBsZW5ndGggPSByYW5nZXNBbmRPdXRjb21lc1tyYW5nZXNBbmRPdXRjb21lcy5sZW5ndGggLSAxXVswXVsxXVxuICAgICAgLSByYW5nZXNBbmRPdXRjb21lc1swXVswXVswXSArIDE7XG5cbiAgICBmdW5jdGlvbiBjdXJyaWVkT3V0Y29tZUF0SW5kZXgoaW5kZXgpIHtcbiAgICAgIHJldHVybiBvdXRjb21lQXRJbmRleChyYW5nZXNBbmRPdXRjb21lcywgaW5kZXgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJvbGxPblRhYmxlKCkge1xuICAgICAgdmFyIG91dGNvbWUgPSBjdXJyaWVkT3V0Y29tZUF0SW5kZXgocm9sbChsZW5ndGgpKTtcbiAgICAgIGlmICh0eXBlb2Ygb3V0Y29tZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gb3V0Y29tZSgpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBvdXRjb21lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBvdXRjb21lQXRJbmRleDogY3VycmllZE91dGNvbWVBdEluZGV4LFxuICAgICAgcm9sbDogcm9sbE9uVGFibGUsXG4gICAgICBsZW5ndGg6IGxlbmd0aFxuICAgIH07XG4gIH1cblxuICAvLyBMb29rcyB1cCB3aGF0IG91dGNvbWUgY29ycmVzcG9uZHMgdG8gdGhlIGdpdmVuIGluZGV4LiBSZXR1cm5zIHVuZGVmaW5lZCBcbiAgLy8gaWYgdGhlIGluZGV4IGlzIG5vdCBpbnNpZGUgYW55IHJhbmdlLlxuICBmdW5jdGlvbiBvdXRjb21lQXRJbmRleChyYW5nZXNBbmRPdXRjb21lcywgaW5kZXgpIHtcbiAgICBpbmRleCA9ICgraW5kZXgpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByYW5nZXNBbmRPdXRjb21lcy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHJhbmdlT3V0Y29tZVBhaXIgPSByYW5nZXNBbmRPdXRjb21lc1tpXTtcbiAgICAgIHZhciByYW5nZSA9IHJhbmdlT3V0Y29tZVBhaXJbMF07XG4gICAgICBpZiAoaW5kZXggPj0gcmFuZ2VbMF0gJiYgaW5kZXggPD0gcmFuZ2VbMV0pIHtcbiAgICAgICAgcmV0dXJuIHJhbmdlT3V0Y29tZVBhaXJbMV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQSBzaG9ydGhhbmQgd2F5IHRvIGNyZWF0ZSBhIHJhbmdlIHRhYmxlIG9iamVjdC4gR2l2ZW4gYSBoYXNoIG9mIG91dGNvbWVzIFxuICAvLyBhbmQgdGhlICpzaXplKiBvZiB0aGUgcHJvYmFiaWxpdHkgcmFuZ2UgdGhhdCB0aGV5IG9jY3VweSwgdGhpcyBmdW5jdGlvbiBcbiAgLy8gZ2VuZXJhdGVzIHRoZSByYW5nZXMgZm9yIGNyZWF0ZVJhbmdlVGFibGUuXG4gIC8vIEl0J3MgaGFuZHksIGJ1dCBpZiB5b3UncmUgZG9pbmcgdGhpcyBhIGxvdCwga2VlcCBpbiBtaW5kIHRoYXQgaXQncyBtdWNoIFxuICAvLyBzbG93ZXIgdGhhbiBjcmVhdGVSYW5nZVRhYmxlLlxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVJhbmdlVGFibGVGcm9tRGljdChvdXRjb21lc0FuZExpa2VsaWhvb2RzKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVJhbmdlVGFibGUoXG4gICAgICBjb252ZXJ0RGljdFRvUmFuZ2VzQW5kT3V0Y29tZVBhaXJzKG91dGNvbWVzQW5kTGlrZWxpaG9vZHMpXG4gICAgKTtcbiAgfVxuXG4gIC8vIG91dGNvbWVzQW5kTGlrZWxpaG9vZHMgZm9ybWF0OiBcbiAgLy8ge1xuICAvLyAgIGZhaWx1cmU6IDMwLFxuICAvLyAgIHN1Y2Nlc3M6IDIwLFxuICAvLyAgIGRvb3ZlcjogNVxuICAvLyB9XG4gIC8vXG4gIC8vIFJldHVybnMgYW4gYXJyYXkgaW4gdGhpcyBraW5kIG9mIGZvcm1hdDpcbiAgLy8gW1xuICAvLyAgW1swLCAyOV0sICdmYWlsdXJlJ10sXG4gIC8vICBbWzMwLCA0OV0sICdzdWNjZXNzJ10sXG4gIC8vICBbWzUwLCA1NF0sICdkb292ZXInXVxuICAvLyBdXG5cbiAgZnVuY3Rpb24gY29udmVydERpY3RUb1Jhbmdlc0FuZE91dGNvbWVQYWlycyhvdXRjb21lc0FuZExpa2VsaWhvb2RzKSB7XG4gICAgdmFyIHJhbmdlc0FuZE91dGNvbWVzID0gW107XG4gICAgdmFyIGVuZE9mTGFzdFVzZWRSYW5nZSA9IC0xO1xuXG4gICAgdmFyIGxvQXJyYXkgPSBjb252ZXJ0T0xQYWlyRGljdFRvTE9BcnJheShvdXRjb21lc0FuZExpa2VsaWhvb2RzKTtcbiAgICBsb0FycmF5ID0gbG9BcnJheS5zb3J0KGNvbXBhcmVMaWtlbGlob29kU2l6ZUluUGFpcnNEZXNjKTtcblxuICAgIGxvQXJyYXkuZm9yRWFjaChmdW5jdGlvbiBhZGRSYW5nZU91dGNvbWVQYWlyKGxvUGFpcikge1xuICAgICAgdmFyIGxpa2VsaWhvb2QgPSBsb1BhaXJbMF07XG4gICAgICB2YXIgb3V0Y29tZSA9IGxvUGFpclsxXTtcbiAgICAgIHZhciBzdGFydCA9IGVuZE9mTGFzdFVzZWRSYW5nZSArIDE7XG4gICAgICB2YXIgZW5kT2ZOZXdSYW5nZSA9IHN0YXJ0ICsgbGlrZWxpaG9vZCAtIDE7XG4gICAgICByYW5nZXNBbmRPdXRjb21lcy5wdXNoKFtbc3RhcnQsIGVuZE9mTmV3UmFuZ2VdLCBvdXRjb21lXSk7XG5cbiAgICAgIGVuZE9mTGFzdFVzZWRSYW5nZSA9IGVuZE9mTmV3UmFuZ2U7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmFuZ2VzQW5kT3V0Y29tZXM7XG4gIH1cblxuICBmdW5jdGlvbiBjb252ZXJ0T0xQYWlyRGljdFRvTE9BcnJheShvdXRjb21lc0FuZExpa2VsaWhvb2RzKSB7XG4gICAgdmFyIGxvQXJyYXkgPSBbXTtcblxuICAgIGZvciAodmFyIGtleSBpbiBvdXRjb21lc0FuZExpa2VsaWhvb2RzKSB7XG4gICAgICB2YXIgcHJvYmFiaWxpdHkgPSBvdXRjb21lc0FuZExpa2VsaWhvb2RzW2tleV07XG4gICAgICBsb0FycmF5LnB1c2goW3Byb2JhYmlsaXR5LCBrZXldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9BcnJheTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBhcmVMaWtlbGlob29kU2l6ZUluUGFpcnNEZXNjKHBhaXJBLCBwYWlyQikge1xuICAgIHJldHVybiBwYWlyQVswXSA+IHBhaXJCWzBdID8gLTEgOiAxO1xuICB9XG5cbiAgLy8gIFtbMCwgODBdLCAnYSddLFxuICAvLyAgW1s4MSwgOTVdLCAnYiddLFxuICAvLyAgW1s5NiwgMTAwXSwgJ2MnXVxuXG4gIC8vIFRhYmxlIGRlZnMgd2lsbCBiZSBvYmplY3RzIGxpa2UgdGhpczpcbiAgLy8ge1xuICAvLyAgICcwLTI0JzogJ0J1bGJhc2F1cicsXG4gIC8vICAgJzI1LTY2JzogJ1NxdWlydGxlJyxcbiAgLy8gICAnNjctOTknOiAnQ2hhcm1hbmRlcidcbiAgLy8gfVxuICAvLyBUaGUgdmFsdWVzIGNhbiBiZSBvdGhlciBvdGhlciBvYmplY3RzLCBpbiB3aGljaCBjYXNlIHRob3NlIG91dGNvbWVzIGFyZVxuICAvLyBjb25zaWRlcmVkIHJlY3Vyc2l2ZSByb2xscy4gZS5nLlxuICAvL1xuICAvLyB7XG4gIC8vICAgJzAtMzknOiB7XG4gIC8vICAgICAnMC0yNCc6ICdCdWxiYXNhdXInLFxuICAvLyAgICAgJzI1LTY2JzogJ1NxdWlydGxlJyxcbiAgLy8gICAgICc2Ny05OSc6ICdDaGFybWFuZGVyJ1xuICAvLyAgIH0sXG4gIC8vICAgJzQwLTU1JzogJ0h1bWFuJyxcbiAgLy8gICAnNTYtOTknOiAnUm9jaydcbiAgLy8gfVxuICAvL1xuICAvLyBXaGVuIDAtMzkgaXMgcm9sbGVkIG9uIHRoZSBvdXRlciB0YWJsZSwgYW5vdGhlciByb2xsIGlzIG1hZGUgb24gdGhhdCBpbm5lclxuICAvLyB0YWJsZS5cbiAgLy9cbiAgLy8gSXQgd2lsbCBub3QgZGV0ZWN0IGN5Y2xlcy5cblxuICBmdW5jdGlvbiBjcmVhdGVUYWJsZUZyb21EZWYoZGVmKSB7XG4gICAgdmFyIHJhbmdlT3V0Y29tZVBhaXJzID0gcmFuZ2VPdXRjb21lUGFpcnNGcm9tRGVmKGRlZik7XG4gICAgcmV0dXJuIGNyZWF0ZVJhbmdlVGFibGUocmFuZ2VPdXRjb21lUGFpcnMpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmFuZ2VPdXRjb21lUGFpcnNGcm9tRGVmKGRlZikge1xuICAgIHZhciByYW5nZU91dGNvbWVQYWlycyA9IFtdO1xuICAgIGZvciAodmFyIHJhbmdlU3RyaW5nIGluIGRlZikge1xuICAgICAgdmFyIHJhbmdlID0gcmFuZ2VTdHJpbmdUb1JhbmdlKHJhbmdlU3RyaW5nKTtcbiAgICAgIHZhciBvdXRjb21lID0gZGVmW3JhbmdlU3RyaW5nXTtcbiAgICAgIGlmICh0eXBlb2Ygb3V0Y29tZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3V0Y29tZSkpIHtcbiAgICAgICAgICBvdXRjb21lID0gY3JlYXRlQ3VzdG9tUGlja0Zyb21BcnJheShvdXRjb21lKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAvLyBSZWN1cnNlLlxuICAgICAgICAgIHZhciBzdWJ0YWJsZSA9IGNyZWF0ZVRhYmxlRnJvbURlZihvdXRjb21lKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHN1YnRhYmxlLnJvbGwgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgb3V0Y29tZSA9IHN1YnRhYmxlLnJvbGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByYW5nZU91dGNvbWVQYWlycy5wdXNoKFtyYW5nZSwgb3V0Y29tZV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmFuZ2VPdXRjb21lUGFpcnM7ICAgIFxuICB9XG5cbiAgZnVuY3Rpb24gcmFuZ2VTdHJpbmdUb1JhbmdlKHMpIHtcbiAgICB2YXIgYm91bmRzID0gcy5zcGxpdCgnLScpO1xuICAgIGlmIChib3VuZHMubGVuZ3RoID4gMikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gWytib3VuZHNbMF0sICtib3VuZHNbMV1dO1xuICAgIH1cbiAgfVxuXG4gIC8vIFBpY2tzIHJhbmRvbWx5IGZyb20gYW4gYXJyYXkuXG4gIGZ1bmN0aW9uIHBpY2tGcm9tQXJyYXkoYXJyYXksIGVtcHR5QXJyYXlEZWZhdWx0KSB7XG4gICAgaWYgKCFhcnJheSB8fCB0eXBlb2YgYXJyYXkubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBhcnJheS5sZW5ndGggPCAxKSB7XG4gICAgICByZXR1cm4gZW1wdHlBcnJheURlZmF1bHQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIGFycmF5W3JvbGwoYXJyYXkubGVuZ3RoKV07XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlQ3VzdG9tUGlja0Zyb21BcnJheShhcnJheSwgZW1wdHlBcnJheURlZmF1bHQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gcGljaygpIHtcbiAgICAgIHJldHVybiBwaWNrRnJvbUFycmF5KGFycmF5LCBlbXB0eUFycmF5RGVmYXVsdCk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIENvbWJpbmVzIGV2ZXJ5IGVsZW1lbnQgaW4gQSB3aXRoIGV2ZXJ5IGVsZW1lbnQgaW4gQi5cbiAgZnVuY3Rpb24gY3Jvc3NBcnJheXMoYXJyYXlBLCBhcnJheUIpIHtcbiAgICB2YXIgY29tYm9zID0gW107XG4gICAgYXJyYXlBLmZvckVhY2goZnVuY3Rpb24gY29tYmluZUVsZW1lbnRXaXRoQXJyYXlCKGFFbGVtZW50KSB7XG4gICAgICBhcnJheUIuZm9yRWFjaChmdW5jdGlvbiBjb21iaW5lQkVsZW1lbnRXaXRoQUVsZW1lbnQoYkVsZW1lbnQpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYUVsZW1lbnQpIHx8IEFycmF5LmlzQXJyYXkoYkVsZW1lbnQpKSB7XG4gICAgICAgICAgY29tYm9zLnB1c2goYUVsZW1lbnQuY29uY2F0KGJFbGVtZW50KSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY29tYm9zLnB1c2goW2FFbGVtZW50LCBiRWxlbWVudF0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gY29tYm9zO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q2FydGVzaWFuUHJvZHVjdChhcnJheXMpIHtcbiAgICByZXR1cm4gYXJyYXlzLnNsaWNlKDEpLnJlZHVjZShjcm9zc0FycmF5cywgYXJyYXlzWzBdKTtcbiAgfVxuXG4gIC8vIEZyb20gVW5kZXJzY29yZS5qcywgZXhjZXB0IHdlIGFyZSB1c2luZyB0aGUgcmFuZG9tIGZ1bmN0aW9uIHNwZWNpZmllZCBpbiBcbiAgLy8gb3VyIGNvbnN0cnVjdG9yIGluc3RlYWQgb2YgTWF0aC5yYW5kb20sIG5lY2Vzc2FyaWx5LlxuICBmdW5jdGlvbiBzaHVmZmxlKGFycmF5KSB7XG4gICAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICB2YXIgc2h1ZmZsZWQgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMCwgcmFuZDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHJhbmQgPSByb2xsKGluZGV4ICsgMSk7XG4gICAgICBpZiAocmFuZCAhPT0gaW5kZXgpIHtcbiAgICAgICAgc2h1ZmZsZWRbaW5kZXhdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICB9XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IGFycmF5W2luZGV4XTtcbiAgICB9XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9XG5cbiAgZnVuY3Rpb24gc2FtcGxlKGFycmF5LCBzYW1wbGVTaXplKSB7XG4gICAgcmV0dXJuIHNodWZmbGUoYXJyYXkpLnNsaWNlKDAsIHNhbXBsZVNpemUpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByb2xsOiByb2xsLFxuICAgIHJvbGxEaWU6IHJvbGxEaWUsXG4gICAgY3JlYXRlUmFuZ2VUYWJsZTogY3JlYXRlUmFuZ2VUYWJsZSxcbiAgICBjcmVhdGVSYW5nZVRhYmxlRnJvbURpY3Q6IGNyZWF0ZVJhbmdlVGFibGVGcm9tRGljdCxcbiAgICBjcmVhdGVUYWJsZUZyb21EZWY6IGNyZWF0ZVRhYmxlRnJvbURlZixcbiAgICBjb252ZXJ0RGljdFRvUmFuZ2VzQW5kT3V0Y29tZVBhaXJzOiBjb252ZXJ0RGljdFRvUmFuZ2VzQW5kT3V0Y29tZVBhaXJzLFxuICAgIHBpY2tGcm9tQXJyYXk6IHBpY2tGcm9tQXJyYXksXG4gICAgY3Jvc3NBcnJheXM6IGNyb3NzQXJyYXlzLFxuICAgIGdldENhcnRlc2lhblByb2R1Y3Q6IGdldENhcnRlc2lhblByb2R1Y3QsXG4gICAgc2h1ZmZsZTogc2h1ZmZsZSxcbiAgICBzYW1wbGU6IHNhbXBsZVxuICB9O1xufVxuXG52YXIgcHJvYmFibGUgPSBjcmVhdGVQcm9iYWJsZSgpO1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBwcm9iYWJsZTtcbiAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlUHJvYmFibGUgPSBjcmVhdGVQcm9iYWJsZTtcbn1cbiJdfQ==
