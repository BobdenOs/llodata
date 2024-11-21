CC ?= clang

all: odata

odata: src/main.c build/odata_parser.bc
	$(CC) -g3 -flto -Os -fvisibility=hidden -Wall -I. build/odata_parser.c src/main.c -o $@

build/odata_parser.bc: src/index.ts
	npx ts-node $<

.PHONY = all
