// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "../HoldemHeroes.sol";


contract HoldemHeroesTestableDistribution is HoldemHeroes {

    string public constant HAND_PROVENANCE_TESTABLE = "0x4bb5099ae2eaeff17f1e3f6d0006b603440d51f55c13697aa505ecef18ff1f10";

    constructor(
        address _vorCoordinator,
        address _xfund,
        address _playingCards,
        uint256 _saleStartTime,
        uint256 _revealSeconds,
        uint256 _whitelistSeconds,
        uint256 _maxNfts)
    HoldemHeroes(_vorCoordinator, _xfund, _playingCards, _saleStartTime, _revealSeconds, _whitelistSeconds, _maxNfts) {}

    /**
     * @dev beginDistributionTestable is used during unit tests to simulate the beginDistribution function
     * @dev and allow for reproducible distribution by also simulating results for fulfillRandomness.
     *
     * @param _startingIndex uint256 start value for the token Idx -> hand Ids mapping. Simulates fulfillRandomness.
     */
    function beginDistributionTestable(uint256 _startingIndex) public {
        startingIndex = _startingIndex;
    }
}
