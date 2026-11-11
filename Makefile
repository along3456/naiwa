.PHONY: build verify preview check install restore
build:
	python3 scripts/build.py
verify:
	python3 scripts/build.py --verify-release
preview: build
	python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
check: build
	node tests/player.cjs
install:
	python3 scripts/install.py install
restore:
	python3 scripts/install.py restore
