NAME = pandora
MAIN = ./pandora.js
DIR = ./dist

DEST = $(DIR)/$(NAME)

BUILD = @./node_modules/.bin/webmake --name $(NAME) $(MAIN)
MINIFY = @./node_modules/.bin/uglifyjs $(DEST).js -c -m 
COMPRESS = @gzip -9 $(DEST).min.js -c

dist: commonjs amd
	
commonjs:
	@echo "Building CommonJS module"
	$(BUILD) $(DEST).js
	@echo "Minifying"	
	$(MINIFY) > $(DEST).min.js
	@echo "Compressing"
	$(COMPRESS) > $(DEST).js.gz

amd: 
	@echo "Building AMD module"
	$(BUILD) --amd $(DEST)-amd.js
	@echo "Minifying"
	$(MINIFY) > $(DEST)-amd.min.js
	@echo "Compressing"
	$(COMPRESS) > $(DEST)-amd.js.gz

.PHONY: dist