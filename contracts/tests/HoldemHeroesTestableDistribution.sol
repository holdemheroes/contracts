// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "../HoldemHeroes.sol";


contract HoldemHeroesTestableDistribution is HoldemHeroes {

    bytes32 public constant HAND_PROVENANCE_TESTABLE = 0x4bb5099ae2eaeff17f1e3f6d0006b603440d51f55c13697aa505ecef18ff1f10;

    constructor(
        address _vorCoordinator,
        address _xfund,
        address _playingCards,
        uint256 _saleStartTime,
        uint256 _revealTimestamp,
        uint256 _maxNfts,
        int256 _targetBlocksPerSale,
        int256 _saleHalflife,
        int256 _priceSpeed,
        int256 _priceHalflife,
        int256 _startingPrice)
    HoldemHeroes(
        _vorCoordinator,
        _xfund,
        _playingCards,
        _saleStartTime,
        _revealTimestamp,
        _maxNfts,
        _targetBlocksPerSale,
        _saleHalflife,
        _priceSpeed,
        _priceHalflife,
        _startingPrice
    ){}

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
