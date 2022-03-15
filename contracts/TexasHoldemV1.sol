// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@unification-com/xfund-vor/contracts/VORConsumerBase.sol";
import "./interfaces/IPokerHandEvaluator.sol";
import "./interfaces/IHoldemHeroes.sol";
import "./libs/uint16a4.sol";
import "./libs/uint8a5.sol";


contract TexasHoldemV1 is ReentrancyGuard, AccessControl, Ownable, VORConsumerBase  {
    using SafeMath for uint256;

    uint8 public constant GAME_VERSION = 1;
    bytes32 public constant DEALER_ROLE = keccak256("DEALER_ROLE");
    uint256 public constant DEFAULT_ROUND_1_PRICE = 0.1 ether;
    uint256 public constant DEFAULT_ROUND_2_PRICE = 0.2 ether;
    uint256 public constant HOUSE_PERC = 25; // 2.5% - we'll div(1000) instead of 100, since solidity has no floats
    uint8 public constant LEADERBOARD_SIZE = 11; // 1 winner + 10 runners up
    address constant GUARD = address(1);

    IHoldemHeroes public immutable holdemHeroes;
    IPokerHandEvaluator public handEvaluator;

    enum GameStatus { NOT_EXIST, FLOP_WAIT, FLOP_DEALT, TURN_WAIT, TURN_DEALT, RIVER_WAIT, RIVER_DEALT }

    struct Player {
        mapping(uint256 => bool) flopTokens;
        mapping(uint256 => bool) turnTokens;
        uint256 paidIn; // to track refunds for dead games
        uint256 rank;
        uint finalHand;
        GameStatus lastRoundSubmitted;
    }

    struct Game {
        uint256 totalPaidIn;
        uint256 round1Price;
        uint256 round2Price;
        uint cardsDealt; // store cards dealt
        uint64 roundEndTime;
        uint64 gameStartTime;
        uint32 gameRoundTimeSeconds;
        uint16 numPlayersInRound;
        uint16 leaderboardSize;
        uint8 refundable;
        uint8 numCardsDealt;
        GameStatus status;
        uint8[] deck; // deck of cards
        mapping(address => Player) players;
        mapping(address => address) nextPlayersInLeaderboard;
    }

    event GameStarted(address startedBy, uint256 indexed gameId, bytes32 requestId, uint32 gameRoundTimeSeconds, uint256 round1Price, uint256 round2Price);
    event CardDealRequested(uint256 indexed gameId, bytes32 requestId, GameStatus turnRequested);
    event CardDealt(uint256 indexed gameId, bytes32 requestId, GameStatus round, uint8 cardId);
    event HandAdded(
        address indexed player,
        uint256 indexed gameId,
        GameStatus round,
        uint256 tokenId,
        uint16 handId,
        uint8 card1,
        uint8 card2);

    event FeePaid(
        address indexed player,
        uint256 indexed gameId,
        GameStatus round,
        uint256 amount);

    event FinalHandPlayed(
        address indexed player,
        uint256 indexed gameId,
        uint256 tokenId,
        uint16 handId,
        uint8 card1,
        uint8 card2,
        uint8 card3,
        uint8 card4,
        uint8 card5,
        uint256 rank);

    event Withdrawal(address indexed player, uint256 amount);
    event MaxConcurrentGamesSet(address setBy, uint256 oldValue, uint256 newValue);
    event VorKeyHashSet(address setBy, bytes32 oldValue, bytes32 newValue);
    event VorFeeSet(address setBy, uint256 oldValue, uint256 newValue);
    event VorCoordinatorSet(address setBy, address oldValue, address newValue);
    event HandEvaluatorSet(address setBy, address oldValue, address newValue);
    event HouseCutWithdrawn(address withdrawnBy, uint256 amount);
    event WinningsCalculated(
        uint256 indexed gameId,
        address indexed player,
        uint256 leaderboardPosition,
        bool winner,
        uint256 amount);
    event GameDeleted(uint256 indexed gameId);
    event RefundableGame(uint256 indexed gameId);
    event Refunded(uint256 indexed gameId, address indexed player, uint256 amount);

    bytes32 private vorKeyHash;
    uint256 private vorFee;
    uint256 public maxConcurrentGames;
    uint256 public houseCut;
    uint256 public currentGameId;
    uint32 public defaultGameRoundTimeSeconds;
    uint8[] public standardDeck;
    uint256[] public gamesInProgress;

    mapping(uint256 => Game) public games;

    // used to link randomness requests to a game
    mapping(bytes32 => uint256) private requestIdToGameId;

    mapping(address => uint256) public userWithdrawables;

    constructor(
        address _xfund,
        address _vorCoordinator,
        address _holdemHeroes,
        address _handEvaluator,
        uint256 _maxConcurrentGames,
        uint32 _defaultGameRoundTimeSeconds,
        bytes32 _vorKeyHash,
        uint256 _vorFee)
    Ownable()
    VORConsumerBase(_vorCoordinator, _xfund) {
        require(_defaultGameRoundTimeSeconds <= 86400 && _defaultGameRoundTimeSeconds > 0, "invalid round time");
        holdemHeroes = IHoldemHeroes(_holdemHeroes);
        handEvaluator = IPokerHandEvaluator(_handEvaluator);
        maxConcurrentGames = _maxConcurrentGames;
        defaultGameRoundTimeSeconds = _defaultGameRoundTimeSeconds;
        vorKeyHash = _vorKeyHash;
        vorFee = _vorFee;
        currentGameId = 0;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DEALER_ROLE, msg.sender);
        for(uint8 i = 0; i < 52; i++) {
            standardDeck.push(i);
        }
    }

    function setMaxConcurrentGames(uint256 _maxConcurrentGames) external onlyOwner {
        require(_maxConcurrentGames > 0, "cannot have 0 maxConcurrentGames");
        uint256 old = maxConcurrentGames;
        maxConcurrentGames = _maxConcurrentGames;
        emit MaxConcurrentGamesSet(msg.sender, old, _maxConcurrentGames);
    }

    function setVorKeyHash(bytes32 _vorKeyHash) external onlyOwner {
        bytes32 old = vorKeyHash;
        vorKeyHash = _vorKeyHash;
        emit VorKeyHashSet(msg.sender, old, _vorKeyHash);
    }

    function setVorFee(uint256 _vorFee) external onlyOwner {
        uint256 old = vorFee;
        vorFee = _vorFee;
        emit VorFeeSet(msg.sender, old, _vorFee);
    }

    function setVorCoordinator(address _vorCoordinator) external onlyOwner {
        address old = vorCoordinator;
        _setVORCoordinator(_vorCoordinator);
        emit VorCoordinatorSet(msg.sender, old, _vorCoordinator);
    }

    function setHandEvaluator(address _handEvaluator) external onlyOwner {
        address old = address(handEvaluator);
        handEvaluator = IPokerHandEvaluator(_handEvaluator);
        emit HandEvaluatorSet(msg.sender, old, _handEvaluator);
    }

    function increaseVorCoordinatorAllowance(uint256 _fee) external onlyOwner {
        _increaseVorCoordinatorAllowance(_fee);
    }

    function withdrawXfund() external onlyOwner {
        uint256 balance = xFUND.balanceOf(address(this));
        xFUND.transfer(msg.sender, balance);
    }

    /**
     * @dev withdrawETH allows contract owner to withdraw ether
     */
    function withdrawHouse() external onlyOwner nonReentrant {
        require(houseCut > 0, "nothing to withdraw");
        emit HouseCutWithdrawn(msg.sender, houseCut);
        payable(msg.sender).transfer(houseCut);
        houseCut = 0;
    }

    function withdrawWinnings() external nonReentrant {
        uint256 amount = userWithdrawables[msg.sender];
        require(amount > 0, "nothing to withdraw");
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
        userWithdrawables[msg.sender] = 0;
    }

    function startGame() external {
        // initialise new game with defaults
        startCustomGame(defaultGameRoundTimeSeconds, DEFAULT_ROUND_1_PRICE, DEFAULT_ROUND_2_PRICE);
    }

    function startCustomGame(uint32 _gameRoundTimeSeconds, uint256 _round1Price, uint256 _round2Price) public {
        // initialise new game
        require(gamesInProgress.length < maxConcurrentGames, "wait for another game to end");
        require(_gameRoundTimeSeconds <= 86400 && _gameRoundTimeSeconds > 0, "invalid round time");
        require(_round1Price > 0 && _round2Price > 0, "round bets cannot be 0");
        currentGameId = currentGameId + 1;

        games[currentGameId].deck = standardDeck;

        games[currentGameId].status = GameStatus.FLOP_WAIT;

        games[currentGameId].nextPlayersInLeaderboard[GUARD] = GUARD;
        games[currentGameId].gameRoundTimeSeconds = _gameRoundTimeSeconds;
        games[currentGameId].round1Price = _round1Price;
        games[currentGameId].round2Price = _round2Price;
        games[currentGameId].gameStartTime = uint64(block.timestamp);

        uint256 seed = uint256(block.timestamp);
        bytes32 requestId = requestRandomness(vorKeyHash, vorFee, seed);

        requestIdToGameId[requestId] = currentGameId;

        emit GameStarted(msg.sender, currentGameId, requestId, _gameRoundTimeSeconds, _round1Price, _round2Price);

        gamesInProgress.push(currentGameId);
    }

    function addNFTFlop(uint256 _tokenId, uint256 _gameId) payable public {
        require(games[_gameId].status == GameStatus.FLOP_DEALT, "flop not dealt");
        // check sender owns NFTs being added. Only need to check here as tokens flow through rounds,
        // i.e. cannot be added in Turn round if not added in Flop
        require(msg.sender == holdemHeroes.ownerOf(_tokenId), "you do not own this token");

        if(games[_gameId].players[msg.sender].lastRoundSubmitted == GameStatus.NOT_EXIST) {
            games[_gameId].numPlayersInRound = games[_gameId].numPlayersInRound + 1;
        }

        addNFT(_tokenId, _gameId, GameStatus.FLOP_DEALT, games[_gameId].round1Price);
    }

    function addNFTTurn(uint256 _tokenId, uint256 _gameId) payable public {
        require(games[_gameId].status == GameStatus.TURN_DEALT, "turn not dealt");
        if(games[_gameId].players[msg.sender].lastRoundSubmitted == GameStatus.FLOP_DEALT) {
            games[_gameId].numPlayersInRound = games[_gameId].numPlayersInRound + 1;
        }
        addNFT(_tokenId, _gameId, GameStatus.TURN_DEALT, games[_gameId].round2Price);
    }

    function addNFT(uint256 _tokenId, uint256 _gameId, GameStatus _roundAddingFor, uint256 _expectedFee) private {
        require(block.timestamp < games[_gameId].roundEndTime, "round ended");
        // get hand data from holdemHeroes
        (uint16 handId, uint8 card1, uint8 card2) = getTokenDataWithHandId(_tokenId);

        // ensure cards in hand have not already been dealt - counts for both rounds
        require(!handCardsAlreadyDealt(card1, card2, _gameId), "cannot add cards already dealt");

        require(_expectedFee == msg.value, "eth value incorrect");
        games[_gameId].totalPaidIn = games[_gameId].totalPaidIn.add(msg.value);
        games[_gameId].players[msg.sender].paidIn = games[_gameId].players[msg.sender].paidIn.add(msg.value);
        emit FeePaid(msg.sender, _gameId, _roundAddingFor, msg.value);

        if(games[_gameId].status == GameStatus.FLOP_DEALT) {
            require(!games[_gameId].players[msg.sender].flopTokens[_tokenId], "token already added");
            games[_gameId].players[msg.sender].flopTokens[_tokenId] = true;
        } else if(games[_gameId].status == GameStatus.TURN_DEALT) {
            require(!games[_gameId].players[msg.sender].turnTokens[_tokenId], "token already added");
            // can only add hands already whitelisted in in FLOP_DEALT round
            require(games[_gameId].players[msg.sender].flopTokens[_tokenId], "token not added in flop round");
            // remove to prevent re-adding
            delete games[_gameId].players[msg.sender].flopTokens[_tokenId];
            games[_gameId].players[msg.sender].turnTokens[_tokenId] = true;
        }

        emit HandAdded(msg.sender, _gameId, games[_gameId].status, _tokenId, handId, card1, card2);

        games[_gameId].players[msg.sender].lastRoundSubmitted = _roundAddingFor;
    }

    function playFinalHand(uint256 _tokenId, uint8[] memory cardIds, uint256 _gameId) public {
        // get hand data from holdemHeroes
        (uint16 handId, uint8 card1, uint8 card2) = getTokenDataWithHandId(_tokenId);
        require(cardIds.length == 3, "must submit 3 cards from river");

        require(games[_gameId].status == GameStatus.RIVER_DEALT, "river not dealt");
        require(block.timestamp < games[_gameId].roundEndTime, "round ended");
        require(
            games[_gameId].players[msg.sender].lastRoundSubmitted == GameStatus.TURN_DEALT,
                "final hand already submitted or nothing added to turn");

        require(
            games[_gameId].players[msg.sender].turnTokens[_tokenId],
            "token not added in turn round");

        require(finalRiverCardsAreDealt(cardIds[0], cardIds[1], cardIds[2], _gameId), "submitted river card not in river");

        // ensure cards in hand have not already been dealt
        require(!handCardsAlreadyDealt(card1, card2, _gameId), "cannot add cards already dealt");

        // add player's selected hand to final hand data
        uint finalHand;
        finalHand = uint16a4.set(finalHand, 0, uint16(_tokenId));
        finalHand = uint16a4.set(finalHand, 1, cardIds[0]);
        finalHand = uint16a4.set(finalHand, 2, cardIds[1]);
        finalHand = uint16a4.set(finalHand, 3, cardIds[2]);

        games[_gameId].players[msg.sender].finalHand = finalHand;

        // no longer required
        delete games[_gameId].players[msg.sender].turnTokens[_tokenId];

        // update player status
        games[_gameId].players[msg.sender].lastRoundSubmitted = GameStatus.RIVER_DEALT;

        // calculate hand rank and get rankId
        uint256 rank = calculateHandRank([card1, card2, cardIds[0], cardIds[1], cardIds[2]]);

        recordRankOnLeaderboard(_gameId, rank);

        games[_gameId].numPlayersInRound = games[_gameId].numPlayersInRound + 1;

        emit FinalHandPlayed(
            msg.sender,
            _gameId,
            _tokenId,
            handId,
            card1,
            card2,
            cardIds[0],
            cardIds[1],
            cardIds[2],
            rank);
    }

    function requestDeal(uint256 _gameId) public nonReentrant onlyRole(DEALER_ROLE) {
        // check not currently dealing
        // call VOR
        require(
            games[_gameId].status == GameStatus.FLOP_DEALT ||
            games[_gameId].status == GameStatus.TURN_DEALT, "not time to deal" );

        require(block.timestamp >= games[_gameId].roundEndTime, "cannot request deal yet");

        if(games[_gameId].status == GameStatus.FLOP_DEALT) {
            games[_gameId].status = GameStatus.TURN_WAIT;
        } else if(games[_gameId].status == GameStatus.TURN_DEALT) {
            games[_gameId].status = GameStatus.RIVER_WAIT;
        }

        uint256 seed = uint256(block.timestamp);
        bytes32 requestId = requestRandomness(vorKeyHash, vorFee, seed);

        emit CardDealRequested(_gameId, requestId, games[_gameId].status);

        requestIdToGameId[requestId] = _gameId;
    }

    function endGame(uint256 _gameId) external nonReentrant {
        if(gameIsStale(_gameId)) {
            if(games[_gameId].status == GameStatus.FLOP_WAIT ||
                (games[_gameId].status == GameStatus.FLOP_DEALT &&
                 games[_gameId].numPlayersInRound == 0)) {
                // nothing happened - no players. Just delete game and
                // remove from gamesInProgress array
                cleanupGame(_gameId, true, true);
            } else {
                games[_gameId].refundable = 1;
                emit RefundableGame(_gameId);
                // only remove from gamesInProgress array. The game object
                // is required for users to claim refunds
                cleanupGame(_gameId, false, true);
            }
        } else {
            require(
                games[_gameId].status == GameStatus.RIVER_DEALT &&
                block.timestamp > games[_gameId].roundEndTime, "game not in endable state" );
            calculateWinnings(_gameId);
            // delete game and remove from gamesInProgress array
            cleanupGame(_gameId, true, true);
        }
    }

    // if game is stale, users can claim refund
    function claimRefund(uint256 _gameId) external {
        require(games[_gameId].refundable == 1, "game not refundable!");
        uint256 paidIn = games[_gameId].players[msg.sender].paidIn;
        require(paidIn > 0, "nothing paid in");
        require(games[_gameId].totalPaidIn.sub(paidIn) >= 0, "not enough in totalPaidIn");
        require(address(this).balance.sub(paidIn) >= 0, "not enough balance");

        userWithdrawables[msg.sender] = userWithdrawables[msg.sender].add(paidIn);
        games[_gameId].players[msg.sender].paidIn = 0;
        games[_gameId].totalPaidIn = games[_gameId].totalPaidIn.sub(paidIn);

        emit Refunded(_gameId, msg.sender, paidIn);

        if(games[_gameId].totalPaidIn == 0) {
            // delete game object. Already removed from gamesInProgress array previously
            cleanupGame(_gameId, true, false);
        }
    }

    function calculateWinnings(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        require(game.totalPaidIn > 0, "nothing in totalPaidIn");
        require(game.refundable == 0, "game refundable!");

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

        address currentAddress = game.nextPlayersInLeaderboard[GUARD];
        for(uint256 i = 0; i < top; ++i) {
            address claimant = currentAddress;
            uint256 amount;
            if(i < _numWinners) {
                amount = _jackpotSplit;
            } else {
                amount = _runnerUpShare;
                _claimPot = _claimPot.sub(_runnerUpShare);
            }
            userWithdrawables[claimant] = userWithdrawables[claimant].add(amount);
            emit WinningsCalculated(_gameId, claimant, i, (i < _numWinners), amount);
            currentAddress = game.nextPlayersInLeaderboard[claimant];
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

        address p1 = games[_gameId].nextPlayersInLeaderboard[GUARD];
        address p2 = games[_gameId].nextPlayersInLeaderboard[p1];

        if(game.players[p1].rank == game.players[p2].rank) {
            // joint winners. Scale total jackpot share
            numWinners = 2;
            jackpotPerc = 70;
            // rare edge cases: <= 3 total players
            if(game.leaderboardSize == 3) {
                // each of the two winners gets 40%, runner up gets 20%
                jackpotPerc = 80;
            }
            if(game.leaderboardSize == 2) {
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

    function cleanupGame(uint256 _gameId, bool deleteGame, bool removeFromGamesInProgress) internal {
        if(deleteGame) {
            emit GameDeleted(_gameId);
            delete games[_gameId];
        }
        if(removeFromGamesInProgress) {
            if(gamesInProgress.length > 1) {
                for (uint i = 0; i < gamesInProgress.length; i++){
                    if(gamesInProgress[i] == _gameId) {
                        gamesInProgress[i] = gamesInProgress[gamesInProgress.length-1];
                        break;
                    }
                }
            }
            gamesInProgress.pop();
        }
    }

    function fulfillRandomness(bytes32 _requestId, uint256 _randomness) internal override {
        uint256 gameId = requestIdToGameId[_requestId];
        require(gameId > 0, "gameId not set for this requestId");
        require(
            games[gameId].status == GameStatus.FLOP_WAIT ||
            games[gameId].status == GameStatus.TURN_WAIT ||
            games[gameId].status == GameStatus.RIVER_WAIT, "not waiting for deal" );

        dealCards(gameId, _requestId, _randomness);

        games[gameId].numPlayersInRound = 0;

        // clean up
        delete requestIdToGameId[_requestId];
    }

    function dealCards(uint256 _gameId, bytes32 _requestId, uint256 _randomness) internal {
        if(games[_gameId].status == GameStatus.FLOP_WAIT) {
            dealThree(_gameId, _requestId, _randomness);
            games[_gameId].numCardsDealt = 3;
        } else if (games[_gameId].status == GameStatus.TURN_WAIT) {
            dealOne(_gameId, _requestId, _randomness, GameStatus.TURN_WAIT, 3);
            games[_gameId].numCardsDealt = 4;
        } else if (games[_gameId].status == GameStatus.RIVER_WAIT) {
            dealOne(_gameId, _requestId, _randomness, GameStatus.RIVER_WAIT, 4);
            games[_gameId].numCardsDealt = 5;
        }

        games[_gameId].roundEndTime = uint64(block.timestamp) + games[_gameId].gameRoundTimeSeconds;
    }

    function dealThree(uint256 _gameId, bytes32 _requestId, uint256 _randomness) private {
        // split randomness into 3.
        uint256 r1 = _randomness >> 64*3;
        uint256 r2 = _randomness >> 64*2;
        uint256 r3 = _randomness >> 64*1;
        dealOne(_gameId, _requestId, r1, GameStatus.FLOP_WAIT, 0);
        dealOne(_gameId, _requestId, r2, GameStatus.FLOP_WAIT, 1);
        dealOne(_gameId, _requestId, r3, GameStatus.FLOP_WAIT, 2);
        games[_gameId].status = GameStatus.FLOP_DEALT;
    }

    function dealOne(uint256 _gameId, bytes32 _requestId, uint256 _randomness, GameStatus _currentStatus, uint8 dIdx) private {
        uint8 deckIdx = uint8(_randomness.mod(games[_gameId].deck.length-1));
        uint8 cardDealt = games[_gameId].deck[deckIdx];
        if (_currentStatus == GameStatus.FLOP_WAIT) {
            emit CardDealt(_gameId, _requestId, GameStatus.FLOP_DEALT, cardDealt);
        } else if (_currentStatus == GameStatus.TURN_WAIT) {
            games[_gameId].status = GameStatus.TURN_DEALT;
            emit CardDealt(_gameId, _requestId, GameStatus.TURN_DEALT, cardDealt);
        } else if (_currentStatus == GameStatus.RIVER_WAIT) {
            games[_gameId].status = GameStatus.RIVER_DEALT;
            emit CardDealt(_gameId, _requestId, GameStatus.RIVER_DEALT, cardDealt);
        }
        games[_gameId].cardsDealt = uint8a5.set(games[_gameId].cardsDealt, dIdx, cardDealt);
        if (_currentStatus == GameStatus.RIVER_WAIT) {
            // deck no longer required. Save some gas
            delete games[_gameId].deck;
        } else {
            removeCardFromGameDeck(_gameId, deckIdx);
        }
    }

    function removeCardFromGameDeck(uint256 _gameId, uint8 _deckIdx) private {
        games[_gameId].deck[_deckIdx] = games[_gameId].deck[games[_gameId].deck.length - 1];
        games[_gameId].deck.pop();
    }

    function finalRiverCardsAreDealt(uint8 _cardId1, uint8 _cardId2, uint8 _cardId3, uint256 _gameId) public view returns (bool) {
        uint8 numDealt = 0;
        for(uint8 i = 0; i < games[_gameId].numCardsDealt; i++) {
            if(_cardId1 == uint8a5.get(games[_gameId].cardsDealt, i)) {
                numDealt = numDealt + 1;
            }
            if(_cardId2 == uint8a5.get(games[_gameId].cardsDealt, i)) {
                numDealt = numDealt + 1;
            }
            if(_cardId3 == uint8a5.get(games[_gameId].cardsDealt, i)) {
                numDealt = numDealt + 1;
            }
        }
        return (numDealt == 3);
    }

    function handCardsAlreadyDealt(uint8 _cardId1, uint8 _cardId2, uint256 _gameId) public view returns (bool) {
        for(uint8 i = 0; i < games[_gameId].numCardsDealt; i++) {
            if(_cardId1 == uint8a5.get(games[_gameId].cardsDealt, i) || _cardId2 == uint8a5.get(games[_gameId].cardsDealt, i)) {
                return true;
            }
        }
        return false;
    }

    function cardIsDealt(uint8 _cardId, uint256 _gameId) public view returns (bool) {
        for(uint8 i = 0; i < games[_gameId].numCardsDealt; i++) {
            if(_cardId == uint8a5.get(games[_gameId].cardsDealt, i)) {
                return true;
            }
        }
        return false;
    }

    function tokenAddedInFlop(address player, uint256 _tokenId, uint256 _gameId) public view returns (bool) {
        return games[_gameId].players[player].flopTokens[_tokenId];
    }

    function tokenAddedInTurn(address player, uint256 _tokenId, uint256 _gameId) public view returns (bool) {
        return games[_gameId].players[player].turnTokens[_tokenId];
    }

    function getGameIdsInProgress() public view returns(uint256[] memory) {
        return gamesInProgress;
    }

    function getCardsDealt(uint256 _gameId) external view returns(uint8[] memory) {
        uint8[] memory cardsDealt = new uint8[](games[_gameId].numCardsDealt);

        for(uint8 i = 0; i < games[_gameId].numCardsDealt; i++) {
            cardsDealt[i] = uint8(uint8a5.get(games[_gameId].cardsDealt, i));
        }

        return cardsDealt;
    }

    function getGameDeck(uint256 _gameId) external view returns(uint8[] memory) {
        return games[_gameId].deck;
    }

    function getTokenDataWithHandId(uint256 _tokenId) public view returns (uint16 handId, uint8 card1, uint8 card2) {
        handId = holdemHeroes.tokenIdToHandId(_tokenId);
        (card1, card2) = getTokenDataWithoutHandId(_tokenId);
    }

    function getTokenDataWithoutHandId(uint256 _tokenId) public view returns (uint8 card1, uint8 card2) {
        uint16 handId = holdemHeroes.tokenIdToHandId(_tokenId);
        (card1, card2) = holdemHeroes.getHandAsCardIds(handId);
    }

    function getPlayerLastRoundSubmitted(address _player, uint256 _gameId) external view returns (GameStatus) {
        return games[_gameId].players[_player].lastRoundSubmitted;
    }

    function getPlayerAmountPaidIn(address _player, uint256 _gameId) external view returns (uint256) {
        return games[_gameId].players[_player].paidIn;
    }

    function gameIsStale(uint256 _gameId) public view returns (bool) {
        // covers most cases where cards have been dealt
        if( (games[_gameId].roundEndTime < block.timestamp &&
             games[_gameId].roundEndTime > 0) &&
             games[_gameId].numPlayersInRound <= 1) {
            return true;
        }
        // covers cases where game has started, but flop hasn't been dealt
        if(games[_gameId].status == GameStatus.FLOP_WAIT) {
            // been in limbo for around 200 blocks
            if( block.timestamp - games[_gameId].gameStartTime > 3000) {
                return true;
            }
        }

        // covers cases where Turn and River has been requested, but hasn't been dealt
        if(games[_gameId].status == GameStatus.TURN_WAIT || games[_gameId].status == GameStatus.RIVER_WAIT) {
            // been in limbo for around 200 blocks
            if( block.timestamp - games[_gameId].roundEndTime > 3000) {
                return true;
            }
        }

        return false;
    }

    function getPlayerFinalHand(uint256 _gameId, address player) external view returns(uint256 tokenId, uint16 handId, uint8[5] memory cards, uint256 rank, IPokerHandEvaluator.RankNames rankId) {
        tokenId = uint16a4.get(games[_gameId].players[player].finalHand, 0);
        (uint16 hId, uint8 card1, uint8 card2) = getTokenDataWithHandId(tokenId);
        handId = hId;
        cards[0] = card1;
        cards[1] = card2;
        cards[2] = uint8(uint16a4.get(games[_gameId].players[player].finalHand, 1));
        cards[3] = uint8(uint16a4.get(games[_gameId].players[player].finalHand, 2));
        cards[4] = uint8(uint16a4.get(games[_gameId].players[player].finalHand, 3));
        rank = calculateHandRank(cards);
        rankId = getRankId(rank);
    }

    function roundIsEnded(uint256 _gameId) external view returns(bool) {
        return block.timestamp > games[_gameId].roundEndTime;
    }

    // inspired by https://gist.github.com/taobun/198cb6b2d620f687cacf665a791375cc
    function recordRankOnLeaderboard(uint256 _gameId, uint256 _rank) private {
        address index = _findLeaderboardIndex(_gameId, _rank);
        games[_gameId].players[msg.sender].rank = _rank;
        games[_gameId].nextPlayersInLeaderboard[msg.sender] = games[_gameId].nextPlayersInLeaderboard[index];
        games[_gameId].nextPlayersInLeaderboard[index] = msg.sender;
        games[_gameId].leaderboardSize++;
    }

    function calculateHandRankForPlayer(uint256 _gameId, address player) public view returns(uint256) {
        require(games[_gameId].status == GameStatus.RIVER_DEALT, "river not dealt");
        (uint8 card1, uint8 card2) = getTokenDataWithoutHandId(uint16a4.get(games[_gameId].players[player].finalHand, 0));
        uint8[5] memory finalHand = [
            card1,
            card2,
            uint8(uint16a4.get(games[_gameId].players[player].finalHand, 1)),
            uint8(uint16a4.get(games[_gameId].players[player].finalHand, 2)),
            uint8(uint16a4.get(games[_gameId].players[player].finalHand, 3))
        ];
        return calculateHandRank(finalHand);
    }

    function calculateHandRank(uint8[5] memory hand) public view returns(uint256) {
        return handEvaluator.calculateHandRank(hand);
    }

    function getTopPlayersInGame(uint256 _gameId, uint256 k) public view returns(address[] memory) {
        uint256 top = (k <= games[_gameId].leaderboardSize) ? k : games[_gameId].leaderboardSize;
        address[] memory topPlayers = new address[](top);
        address currentAddress = games[_gameId].nextPlayersInLeaderboard[GUARD];
        for(uint256 i = 0; i < top; ++i) {
            topPlayers[i] = currentAddress;
            currentAddress = games[_gameId].nextPlayersInLeaderboard[currentAddress];
        }
        return topPlayers;
    }

    function getPlayerRank(uint256 _gameId, address _player) public view returns(uint256) {
        return games[_gameId].players[_player].rank;
    }

    function getPlayerLeaderboardPosition(uint256 _gameId, address _player) public view returns(int8) {
        address[] memory topPlayers = getTopPlayersInGame(_gameId, LEADERBOARD_SIZE);
        for (uint8 i = 0; i < topPlayers.length; i += 1) {
            if(topPlayers[i] == _player) {
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

    function getRankName(IPokerHandEvaluator.RankNames rank) public view returns (string memory) {
        return handEvaluator.getRankName(rank);
    }

    function _verifyLeaderboardIndex(uint256 _gameId, address _prevPlayer, uint256 _rank, address _nextPlayer)
    internal
    view
    returns(bool)
    {
        return (_prevPlayer == GUARD || games[_gameId].players[_prevPlayer].rank <= _rank) &&
        (_nextPlayer == GUARD || _rank < games[_gameId].players[_nextPlayer].rank);
    }

    function _findLeaderboardIndex(uint256 _gameId, uint256 _newRank) internal view returns(address) {
        address candidateAddress = GUARD;
        while(true) {
            if(_verifyLeaderboardIndex(_gameId, candidateAddress, _newRank, games[_gameId].nextPlayersInLeaderboard[candidateAddress]))
                return candidateAddress;
            candidateAddress = games[_gameId].nextPlayersInLeaderboard[candidateAddress];
        }
        return GUARD;
    }

    function _isPrevPlayer(uint256 _gameId, address _player, address _prevPlayer) internal view returns(bool) {
        return games[_gameId].nextPlayersInLeaderboard[_prevPlayer] == _player;
    }

    function _findPrevPlayer(uint256 _gameId, address _player) internal view returns(address) {
        address currentAddress = GUARD;
        while(games[_gameId].nextPlayersInLeaderboard[currentAddress] != GUARD) {
            if(_isPrevPlayer(_gameId, _player, currentAddress))
                return currentAddress;
            currentAddress = games[_gameId].nextPlayersInLeaderboard[currentAddress];
        }
        return address(0);
    }
}
