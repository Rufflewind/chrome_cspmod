build:
	mkdir -p dist
	rm -f dist/dist.zip
	zip dist/dist.zip LICENSE
	cd src && zip -r ../dist/dist.zip *

clean:
	rm -f dist/dist.zip
	rmdir 2>/dev/null dist || true
