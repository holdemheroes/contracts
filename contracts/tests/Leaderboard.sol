// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/IPokerHandEvaluator.sol";


contract Leaderboard {
    using SafeMath for uint256;

    uint8 public constant LEADERBOARD_SIZE = 11; // 1 winner + up to 10 runners up
    uint256 public constant FEE = 0.1 ether;
    uint256 public constant HOUSE_PERC = 25; // 2.5% - we'll div(1000) instead of 100, since solidity has no floats

    struct Player {
        uint256 paidIn; // to track refunds for dead games
        uint256 rank;
    }

    address constant GUARD = address(1);

    struct Game {
        uint256 totalPaidIn;
        mapping(address => Player) players;
        mapping(address => address) nextPlayersInLb;
        uint256 leaderboardSize;
        bool refundable;
    }

    IPokerHandEvaluator public handEvaluator;

    uint256 public houseCut;
    mapping(address => uint256) public userWithdrawables;

    mapping(uint256 => Game) public games;

    event WinningsCalculated(
        uint256 gameId,
        address player,
        uint256 leaderboardPosition,
        bool winner,
        uint256 amount
    );
    event RefundableGame(uint256 gameId);
    event Refunded(uint256 gameId, address player, uint256 amount);
    event GameDeleted(uint256 gameId);

    constructor(address _handEvaluator){
        handEvaluator = IPokerHandEvaluator(_handEvaluator);
        games[1].nextPlayersInLb[GUARD] = GUARD;
    }

    // simulate fees & ranks recorded on leaderboard
    function mockPlayFinalHand(uint256 _gameId, uint256 _rank) external payable {
        require(msg.value == FEE);

        games[_gameId].totalPaidIn = games[_gameId].totalPaidIn.add(msg.value);
        games[_gameId].players[msg.sender].paidIn = games[_gameId].players[msg.sender].paidIn.add(msg.value);

        recordRankOnLeaderboard(_gameId, _rank);
    }

    // simulate endgame - refund = true to simulate refunds for stale games
    function endGame(uint256 _gameId, bool _refund) external {
        if (_refund) {
            games[_gameId].refundable = true;
            emit RefundableGame(_gameId);
        } else {
            calculateWinnings(_gameId);
        }

        cleanupGame(_gameId, false);
    }

    // if game is stale, users can claim refund
    function claimRefund(uint256 _gameId) external {
        require(games[_gameId].refundable, "game not refundable!");
        uint256 paidIn = games[_gameId].players[msg.sender].paidIn;
        require(paidIn > 0, "nothing paid in");
        require(games[_gameId].totalPaidIn.sub(paidIn) >= 0, "not enough in totalPaidIn");
        require(address(this).balance.sub(paidIn) >= 0, "not enough balance");

        userWithdrawables[msg.sender] = userWithdrawables[msg.sender].add(paidIn);
        games[_gameId].players[msg.sender].paidIn = 0;
        games[_gameId].totalPaidIn = games[_gameId].totalPaidIn.sub(paidIn);

        emit Refunded(_gameId, msg.sender, paidIn);

        if (games[_gameId].totalPaidIn == 0) {
            cleanupGame(_gameId, true);
        }
    }

    function calculateWinnings(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        require(game.totalPaidIn > 0, "nothing in totalPaidIn");
        require(!game.refundable, "game refundable!");

        // calculate winnings from claimPot
        (uint8 numWinners, uint256 claimPot, uint256 jackpotSplit, uint256 houseClaim, uint256 runnerUpShare) = getPotSplit(_gameId);

        // payout
        payout(_gameId, numWinners, claimPot, jackpotSplit, houseClaim, runnerUpShare);

    }

    function payout(
        uint256 _gameId,
        uint8 _numWinners,
        uint256 _claimPot,
        uint256 _jackpotSplit,
        uint256 _houseClaim,
        uint256 _runnerUpShare
    ) private {
        Game storage game = games[_gameId];

        uint256 top = (LEADERBOARD_SIZE <= game.leaderboardSize) ? LEADERBOARD_SIZE : game.leaderboardSize;

        address currentAddress = game.nextPlayersInLb[GUARD];
        for (uint256 i = 0; i < top; ++i) {
            address claimant = currentAddress;
            uint256 amount;
            if (i < _numWinners) {
                amount = _jackpotSplit;
            } else {
                amount = _runnerUpShare;
                _claimPot = _claimPot.sub(_runnerUpShare);
            }
            userWithdrawables[claimant] = userWithdrawables[claimant].add(amount);
            emit WinningsCalculated(_gameId, claimant, i, (i < _numWinners), amount);
            currentAddress = game.nextPlayersInLb[claimant];
        }

        // also move any tiny wei remainder after division to house
        houseCut = houseCut.add(_houseClaim.add(_claimPot));
    }

    function getPotSplit(
        uint256 _gameId) private view returns(uint8 numWinners, uint256 claimPot, uint256 jackpotSplit, uint256 houseClaim, uint256 runnerUpShare) {

        Game storage game = games[_gameId];
        // calculate house's 2.5 %
        houseClaim = game.totalPaidIn.mul(HOUSE_PERC).div(1000);
        // subtract house 2.5% first to make the final claim pot
        claimPot = game.totalPaidIn.sub(houseClaim);

        numWinners = 1;
        uint256 jackpotPerc = 60;

        address p1 = games[_gameId].nextPlayersInLb[GUARD];
        address p2 = games[_gameId].nextPlayersInLb[p1];

        if (game.players[p1].rank == game.players[p2].rank) {
            // joint winners. Scale total jackpot share
            numWinners = 2;
            jackpotPerc = 70;
            // rare edge cases: <= 3 total players
            if (game.leaderboardSize == 3) {
                // each of the two winners gets 40%, runner up gets 20%
                jackpotPerc = 80;
            }
            if (game.leaderboardSize == 2) {
                // only 2 players = 50/50 split
                jackpotPerc = 100;
            }
        }
        // 60% to 100% jackpot for winner(s), depending on leaderboard size
        // and number of winners. reduce claimpot by this amount, and
        // calculate how much each winner gets
        uint256 jackpot = claimPot.mul(jackpotPerc).div(100);
        jackpotSplit = jackpot.div(numWinners);
        claimPot = claimPot.sub(jackpot);

        // rest of claimPot to be split amongst up to nn runners up
        runnerUpShare = (game.leaderboardSize - numWinners > 0) ? claimPot.div(game.leaderboardSize - numWinners) : 0;
    }

    function cleanupGame(uint256 _gameId, bool deleteGame) internal {
        if (deleteGame) {
            delete games[_gameId];
            emit GameDeleted(_gameId);
        }
    }

    // inspired by https://gist.github.com/taobun/198cb6b2d620f687cacf665a791375cc
    function recordRankOnLeaderboard(uint256 _gameId, uint256 _rank) public {
        address index = _findIndex(_gameId, _rank);
        games[_gameId].players[msg.sender].rank = _rank;
        games[_gameId].nextPlayersInLb[msg.sender] = games[_gameId].nextPlayersInLb[index];
        games[_gameId].nextPlayersInLb[index] = msg.sender;
        games[_gameId].leaderboardSize++;
    }

    function getTopPlayersInGame(uint256 _gameId, uint256 k) public view returns(address[] memory) {
        uint256 top = (k <= games[_gameId].leaderboardSize) ? k : games[_gameId].leaderboardSize;
        address[] memory topPlayers = new address[](top);
        address currentAddress = games[_gameId].nextPlayersInLb[GUARD];
        for (uint256 i = 0; i < top; ++i) {
            topPlayers[i] = currentAddress;
            currentAddress = games[_gameId].nextPlayersInLb[currentAddress];
        }
        return topPlayers;
    }

    function getRank(uint256 _gameId, address _player) public view returns(uint256) {
        return games[_gameId].players[_player].rank;
    }

    function getPlayerLeaderboardPosition(uint256 _gameId, address _player) public view returns(int8) {
        address[] memory topPlayers = getTopPlayersInGame(_gameId, LEADERBOARD_SIZE);
        for (uint8 i = 0; i < topPlayers.length; i += 1) {
            if (topPlayers[i] == _player) {
                return int8(i);
            }
        }
        return -1;
    }

    function getLeaderboardAtPosition(uint256 _gameId, uint256 _pos) external view returns(address player, uint256 rank, IPokerHandEvaluator.RankNames rankId) {
        uint256 top = (LEADERBOARD_SIZE <= games[_gameId].leaderboardSize) ? LEADERBOARD_SIZE : games[_gameId].leaderboardSize;
        address[] memory topPlayers = getTopPlayersInGame(_gameId, top);
        player = topPlayers[_pos];
        rank = games[_gameId].players[player].rank;
        rankId = getRankId(rank);
    }

    function getRankId(uint256 value) public view returns (IPokerHandEvaluator.RankNames) {
        return handEvaluator.getRankId(value);
    }

    function _verifyIndex(uint256 _gameId, address _prevPlayer, uint256 _rank, address _nextPlayer)
    internal
    view
    returns(bool)
    {
        return (_prevPlayer == GUARD || games[_gameId].players[_prevPlayer].rank <= _rank) &&
        (_nextPlayer == GUARD || _rank < games[_gameId].players[_nextPlayer].rank);
    }

    function _findIndex(uint256 _gameId, uint256 _newRank) internal view returns(address) {
        address candidateAddress = GUARD;
        while (true) {
            if (_verifyIndex(_gameId, candidateAddress, _newRank, games[_gameId].nextPlayersInLb[candidateAddress]))
                return candidateAddress;
            candidateAddress = games[_gameId].nextPlayersInLb[candidateAddress];
        }
        return GUARD;
    }

    function _isPrevPlayer(uint256 _gameId, address _player, address _prevPlayer) internal view returns(bool) {
        return games[_gameId].nextPlayersInLb[_prevPlayer] == _player;
    }

    function _findPrevPlayer(uint256 _gameId, address _player) internal view returns(address) {
        address currentAddress = GUARD;
        while (games[_gameId].nextPlayersInLb[currentAddress] != GUARD) {
            if (_isPrevPlayer(_gameId, _player, currentAddress))
                return currentAddress;
            currentAddress = games[_gameId].nextPlayersInLb[currentAddress];
        }
        return address(0);
    }
}
