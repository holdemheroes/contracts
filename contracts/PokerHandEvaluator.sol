// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";


/**
* Ported from https://github.com/thlorenz/phe
*/
contract PokerHandEvaluator is Ownable {
    using Address for address;

    enum RankNames {
        ROYAL_FLUSH, STRAIGHT_FLUSH, FOUR_OF_A_KIND, FULL_HOUSE, FLUSH, STRAIGHT, THREE_OF_A_KIND, TWO_PAIR, ONE_PAIR, HIGH_CARD
    }

    uint256 public subscriptionFee;
    mapping(address => bool) public subscribers;

    // lookup tables
    uint16[52] binaries = [
        0x1,  0x1,  0x1,  0x1,
        0x2,  0x2,  0x2,  0x2,
        0x4,  0x4,  0x4,  0x4,
        0x8,  0x8,  0x8,  0x8,
        0x10, 0x10, 0x10, 0x10,
        0x20, 0x20, 0x20, 0x20,
        0x40, 0x40, 0x40, 0x40,
        0x80, 0x80, 0x80, 0x80,
        0x100,  0x100,  0x100,  0x100,
        0x200,  0x200,  0x200,  0x200,
        0x400,  0x400,  0x400,  0x400,
        0x800,  0x800,  0x800,  0x800,
        0x1000, 0x1000, 0x1000, 0x1000
    ];

    uint16[52] suitBits = [
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200,
        0x1,  0x8,  0x40, 0x200
    ];

    uint8[4096] public suits;
    uint16[6175] public noFlush;
    uint16[8192] public flush;
    uint32[8][14][5] public dp;

    uint8 public nextExpectedNoFlushBatchId = 0;
    uint8 public nextExpectedFlushBatchId = 0;
    uint8 public nextExpectedDpBatchId = 0;

    bool public suitsSet = false;
    bool public noFlushSet = false;
    bool public flushSet = false;
    bool public dpSet = false;

    event SubscriptionFeeSet(address setBy, uint256 oldValue, uint256 newValue);
    event Subscribed(address sender, address subscriber, uint256 fee);
    event EthWithdrawn(address recipient, uint256 amount);

    constructor(uint256 _subscriptionFee) Ownable() {
        subscriptionFee = _subscriptionFee;
        emit SubscriptionFeeSet(msg.sender, 0, _subscriptionFee);
    }

    function setSubscriptionFee(uint256 _subscriptionFee) external onlyOwner {
        uint256 old = subscriptionFee;
        subscriptionFee = _subscriptionFee;
        emit SubscriptionFeeSet(msg.sender, old, _subscriptionFee);
    }

    /**
     * @dev withdrawETH allows contract owner to withdraw ether
     */
    function withdrawETH() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "noting to withdraw");
        emit EthWithdrawn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }

    function ownerAddSubscriber(address subscriber) external onlyOwner {
        require(!subscribers[subscriber], "already subscribed");
        require(address(subscriber).isContract(), "can only subscribe for contract");
        emit Subscribed(msg.sender, subscriber, 0);
        subscribers[subscriber] = true;
    }

    function subscribe(address subscriber) external payable {
        require(!subscribers[subscriber], "already subscribed");
        require(address(subscriber).isContract(), "can only subscribe for contract");
        if (subscriptionFee > 0) {
            require(msg.value == subscriptionFee, "incorrect reg fee");
        }
        emit Subscribed(msg.sender, subscriber, msg.value);
        subscribers[subscriber] = true;
    }

    function setSuits(uint16[] memory idxs, uint8[] memory values) external onlyOwner {
        require(!suitsSet, "suits already set");
        for (uint i = 0; i < idxs.length; i++) {
            suits[idxs[i]] = values[i];
        }
        suitsSet = true;
    }

    function setNoFlushBatch(uint16[] memory idxs, uint16[] memory values, uint8 batchId) external onlyOwner {
        require(!noFlushSet, "noFlush already set");
        require(batchId == nextExpectedNoFlushBatchId, "batch sequence incorrect");
        for (uint i = 0; i < idxs.length; i++) {
            noFlush[idxs[i]] = values[i];
        }
        if (idxs[idxs.length - 1] == 6174) {
            noFlushSet = true;
        } else {
            nextExpectedNoFlushBatchId = nextExpectedNoFlushBatchId + 1;
        }
    }

    function setFlushBatch(uint16[] memory idxs, uint16[] memory values, uint8 batchId) external onlyOwner {
        require(!flushSet, "flush already set");
        require(batchId == nextExpectedFlushBatchId, "batch sequence incorrect");
        for (uint i = 0; i < idxs.length; i++) {
            flush[idxs[i]] = values[i];
        }
        if (idxs[idxs.length - 1] == 8128) {
            flushSet = true;
        } else {
            nextExpectedFlushBatchId = nextExpectedFlushBatchId + 1;
        }
    }

    function setDpBatch(uint32[8][] memory values, uint8 idx, uint8 batchId) external onlyOwner {
        require(!dpSet, "dp already set");
        require(batchId == nextExpectedDpBatchId, "batch sequence incorrect");
        for (uint i = 0; i < values.length; i++) {
            for (uint j = 0; j < 8; j++) {
                if (values[i][j] > 0) {
                    dp[idx][i][j] = values[i][j];
                }
            }
        }
        if (idx == 4) {
            dpSet = true;
        } else {
            nextExpectedDpBatchId = nextExpectedDpBatchId + 1;
        }
    }

    /**
     * Ported from https://github.com/thlorenz/phe/blob/master/lib/evaluator5.js
     * Lower is better!
     */
    function calculateHandRank(uint8[5] memory hand) external view returns(uint256) {
        require(subscribers[msg.sender], "not subscribed");
        uint256 suitHash = 0;
        uint[] memory suitBinary = new uint[](4);
        uint[] memory quinary = new uint[](13);
        uint256 hash;

        suitHash += suitBits[hand[0]];
        quinary[(hand[0] >> 2)]++;
        suitHash += suitBits[hand[1]];
        quinary[(hand[1] >> 2)]++;
        suitHash += suitBits[hand[2]];
        quinary[(hand[2] >> 2)]++;
        suitHash += suitBits[hand[3]];
        quinary[(hand[3] >> 2)]++;
        suitHash += suitBits[hand[4]];
        quinary[(hand[4] >> 2)]++;

        if (suits[suitHash] > 0) {
            suitBinary[hand[0] & 0x3] |= binaries[hand[0]];
            suitBinary[hand[1] & 0x3] |= binaries[hand[1]];
            suitBinary[hand[2] & 0x3] |= binaries[hand[2]];
            suitBinary[hand[3] & 0x3] |= binaries[hand[3]];
            suitBinary[hand[4] & 0x3] |= binaries[hand[4]];

            return flush[suitBinary[suits[suitHash] - 1]];
        }

        hash = hashQuinary(quinary, 13, 5);

        return noFlush[hash];
    }

    /**
     * Ported from https://github.com/thlorenz/phe/blob/master/lib/hash.js
     */
    function hashQuinary(uint[] memory q, uint8 len, uint256 k) private view returns(uint256) {
        uint sum = 0;

        for (uint8 i = 0; i < len; i++) {
            sum += dp[q[i]][len - i - 1][k];
            k -= q[i];

            if (k <= 0) {
                break;
            }
        }

        return sum;
    }

    /**
     * Ported from https://github.com/thlorenz/phe/blob/master/lib/hand-rank.js
     */
    function getRankId(uint256 value) public pure returns (RankNames) {
        if (value > 6185) return RankNames.HIGH_CARD;       // 1277 high card ranks
        if (value > 3325) return RankNames.ONE_PAIR;        // 2860 one pair ranks
        if (value > 2467) return RankNames.TWO_PAIR;        //  858 two pair ranks
        if (value > 1609) return RankNames.THREE_OF_A_KIND; //  858 three-kind ranks
        if (value > 1599) return RankNames.STRAIGHT;        //   10 straights ranks
        if (value > 322)  return RankNames.FLUSH;           // 1277 flushes ranks
        if (value > 166)  return RankNames.FULL_HOUSE;      //  156 full house ranks
        if (value > 10)   return RankNames.FOUR_OF_A_KIND;  //  156 four-kind ranks
        if (value > 1)    return RankNames.STRAIGHT_FLUSH;  //    9 straight-flushes ranks
        return RankNames.ROYAL_FLUSH;                       //    1 royal-flush rank
    }

    /**
     * Ported from https://github.com/thlorenz/phe/blob/master/lib/hand-rank.js
     */
    function getRankName(RankNames rank) public pure returns (string memory) {
        if (rank == RankNames.HIGH_CARD) return "High Card";
        if (rank == RankNames.ONE_PAIR) return "Pair";
        if (rank == RankNames.TWO_PAIR) return "Two Pairs";
        if (rank == RankNames.THREE_OF_A_KIND) return "Three of a Kind";
        if (rank == RankNames.STRAIGHT) return "Straight";
        if (rank == RankNames.FLUSH) return "Flush";
        if (rank == RankNames.FULL_HOUSE) return "Full House";
        if (rank == RankNames.FOUR_OF_A_KIND) return "Four of a Kind";
        if (rank == RankNames.STRAIGHT_FLUSH) return "Straight Flush";
        if (rank == RankNames.ROYAL_FLUSH) return "Royal Flush";
        return "";
    }
}
