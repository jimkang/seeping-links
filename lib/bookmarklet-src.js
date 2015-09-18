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
