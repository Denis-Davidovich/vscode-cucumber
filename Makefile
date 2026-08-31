.PHONY: help install package reinstall

NPM ?= npm
ARGS ?=

help:
	@echo "Available targets:"
	@echo "  make install    Build and install the extension"
	@echo "  make reinstall  Build and cleanly reinstall the extension"
	@echo "  make package    Build the VSIX package"
	@echo ""
	@echo "Pass installer options with ARGS, for example:"
	@echo "  make reinstall ARGS='--profile \"Cucumber Behat\"'"

install:
	$(NPM) run extension:install -- $(ARGS)

reinstall:
	$(NPM) run extension:reinstall -- $(ARGS)

package:
	$(NPM) run package
