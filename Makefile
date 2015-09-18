BROWSERIFY = node_modules/.bin/browserify
UGLIFY = node_modules/.bin/uglifyjs

build:
	$(BROWSERIFY) lib/bookmarklet-src.js | $(UGLIFY) -c -m -o chrome/bookmarklet.js

build-dev:
	$(BROWSERIFY) -d lib/bookmarklet-src.js > chrome/bookmarklet.js

pushall:
	git push origin master && npm publish

ifndef PROJECTNAME
init-project:
	$(error PROJECTNAME is not set. Usage: make init-project PROJECTNAME=your-name)
else
init-project:
	rm -rf .git
	find . -type f -print0 | xargs -0 sed -i '' 's/seeping-links/$(PROJECTNAME)/g'
	git init
endif
