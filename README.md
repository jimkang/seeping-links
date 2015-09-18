seeping-links
==================

A Chrome extension that smashes holes into web pages, letting link contents seep in and gradually dominate the window.

Installation
------------

1. Clone this repo.
2. Run `npm install && make build` to build bookmarklet.js.
3. Go to Extensions in Chrome.
4. Check "Developer mode".
5. Hit "Load unpacked extension" and point to the `chrome` directory in this repo.

Structure
---------

__background.js__, in a Chrome extension, waits around in the (wait for it) background to respond to the user hitting the extension's button. When that happens, it loads bookmarklet.js to be executed in the context of the page in the current tab.

__bookmarklet.js__ then does stuff with the loaded DOM.

License
-------

The MIT License (MIT)

Copyright (c) 2015 Jim Kang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
