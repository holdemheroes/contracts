// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;


interface IPokerHandEvaluator {
    enum RankNames {
        ROYAL_FLUSH, STRAIGHT_FLUSH, FOUR_OF_A_KIND, FULL_HOUSE, FLUSH, STRAIGHT, THREE_OF_A_KIND, TWO_PAIR, ONE_PAIR, HIGH_CARD
    }

    function subscribe() external payable;
    function calculateHandRank(uint8[5] memory hand) external view returns(uint256);
    function getRankId(uint256 value) external view returns (RankNames);
    function getRankName(RankNames rank) external view returns (string memory);
}
