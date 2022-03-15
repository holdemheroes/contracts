vor-up:
	docker-compose -f docker-compose.yml down --remove-orphans
	docker-compose -f docker-compose.yml up --build

vor-down:
	docker-compose -f docker-compose.yml down --remove-orphans

vor-deploy:
	npx truffle exec scripts/VORDEV_ONLY/vordev_deterministic.js --network=vordev
	npx truffle exec scripts/VORDEV_ONLY/vordev_deterministic_handeval.js --network=vordev
	npx truffle exec scripts/VORDEV_ONLY/vordev_deterministic_mint_all.js --network=vordev
	npx truffle exec scripts/VORDEV_ONLY/vordev_deterministic_texasholdem.js --network=vordev

vor-data-dump:
	npx truffle exec scripts/VORDEV_ONLY/vordev_deterministic.js --network=vordev
	npx truffle exec scripts/queries/get_svgs.js --network=vordev
	npx truffle exec scripts/queries/get_nft.js --network=vordev

.PHONY: vor-up vor-down vor-deploy
