// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "../../interfaces/IPokerHandEvaluator.sol";


contract PokerHandEvaluatorSubscriber {

    IPokerHandEvaluator public handEvaluator;

    constructor(address _handEvaluator) {
        handEvaluator = IPokerHandEvaluator(_handEvaluator);
    }

    function calculateHandRank(uint8[5] memory hand) external view returns(uint256) {
        return handEvaluator.calculateHandRank(hand);
    }
}
