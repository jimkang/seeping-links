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
