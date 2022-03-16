// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "prb-math/contracts/PRBMathSD59x18.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@unification-com/xfund-vor/contracts/VORConsumerBase.sol";
import "./HoldemHeroesBase.sol";


contract HoldemHeroes is Ownable, HoldemHeroesBase, VORConsumerBase  {
    using PRBMathSD59x18 for int256;

    // max number of NFTs allowed per address
    uint256 public MAX_PER_ADDRESS_OR_TX;
    // timestamp for when public sale opens
    uint256 public SALE_START_TIMESTAMP;

    /// ---------------------------
    /// ------- CRISP STATE -------
    /// ---------------------------

    ///@notice block on which last purchase occurred
    uint256 public lastPurchaseBlock;

    ///@notice block on which we start decaying price
    uint256 public priceDecayStartBlock;

    ///@notice Starting EMS, before time decay. 59.18-decimal fixed-point
    int256 public nextPurchaseStartingEMS;

    ///@notice Starting price for next purchase, before time decay. 59.18-decimal fixed-point
    int256 public nextPurchaseStartingPrice;

    /// ---------------------------
    /// ---- CRISP PARAMETERS -----
    /// ---------------------------

    ///@notice EMS target. 59.18-decimal fixed-point
    int256 public immutable targetEMS;

    ///@notice controls decay of sales in EMS. 59.18-decimal fixed-point
    int256 public immutable saleHalflife;

    ///@notice controls upward price movement. 59.18-decimal fixed-point
    int256 public immutable priceSpeed;

    ///@notice controls price decay. 59.18-decimal fixed-point
    int256 public immutable priceHalflife;

    /// ---------------------------------
    /// ------- CRISP ERRORS  -----------
    /// ---------------------------------

    error InsufficientPayment();
    error FailedToSendEther();

    /*
     * EVENTS
     */

    event DistributionBegun(bytes32 requestId, address sender);
    event DistributionResult(bytes32 requestId, uint256 randomness, uint256 startingIndex);

    /**
     * @dev constructor
     * @dev initialises some basic variables.
     *
     * @param _vorCoordinator address - address of VORCoordinator contract
     * @param _xfund address - address of xFUND contract
     * @param _playingCards address - address of Playing Cards contract
     * @param _saleStartTime uint256 - unix timestamp for when pre-reveal sale starts. Allows time for card/rank init
     * @param _revealSeconds uint256 - num seconds after pre-reveal sale starts that cards will be revealed and distributed
     * @param _maxNfts address - max number of NFTs a single wallet address can mint
     * @param _targetBlocksPerSale int256
     * @param _saleHalflife int256
     * @param _priceSpeed int256
     * @param _priceHalflife int256
     * @param _startingPrice int256
     */
    constructor(
        address _vorCoordinator,
        address _xfund,
        address _playingCards,
        uint256 _saleStartTime,
        uint256 _revealSeconds,
        uint256 _maxNfts,
        int256 _targetBlocksPerSale,
        int256 _saleHalflife,
        int256 _priceSpeed,
        int256 _priceHalflife,
        int256 _startingPrice
    )
    VORConsumerBase(_vorCoordinator, _xfund)
    HoldemHeroesBase(_saleStartTime, _revealSeconds, _playingCards)
    {
        if (_saleStartTime >= block.timestamp) {
            SALE_START_TIMESTAMP = _saleStartTime;
        } else {
            SALE_START_TIMESTAMP = block.timestamp;
        }

        MAX_PER_ADDRESS_OR_TX = _maxNfts;

        // CRISP
        lastPurchaseBlock = block.number;
        priceDecayStartBlock = block.number;

        saleHalflife = _saleHalflife;
        priceSpeed = _priceSpeed;
        priceHalflife = _priceHalflife;

        //calculate target EMS from target blocks per sale
        targetEMS = PRBMathSD59x18.fromInt(1).div(
            PRBMathSD59x18.fromInt(1) -
            PRBMathSD59x18.fromInt(2).pow(
                -_targetBlocksPerSale.div(saleHalflife)
            )
        );
        nextPurchaseStartingEMS = targetEMS;

        nextPurchaseStartingPrice = _startingPrice;
    }

    /*
     * CRISP FUNCTIONS
     */

    ///@notice get current EMS based on block number. Returns 59.18-decimal fixed-point
    function getCurrentEMS() public view returns (int256 result) {
        int256 blockInterval = int256(block.number - lastPurchaseBlock);
        blockInterval = blockInterval.fromInt();
        int256 weightOnPrev = PRBMathSD59x18.fromInt(2).pow(
            -blockInterval.div(saleHalflife)
        );
        result = nextPurchaseStartingEMS.mul(weightOnPrev);
    }

    ///@notice get quote for purchasing in current block, decaying price as needed. Returns 59.18-decimal fixed-point
    function getNftPrice() public view returns (int256 result) {
        if (block.number <= priceDecayStartBlock) {
            result = nextPurchaseStartingPrice;
        }
        //decay price if we are past decay start block
        else {
            int256 decayInterval = int256(block.number - priceDecayStartBlock)
            .fromInt();
            int256 decay = (-decayInterval).div(priceHalflife).exp();
            result = nextPurchaseStartingPrice.mul(decay);
        }
    }

    ///@notice Get starting price for next purchase before time decay. Returns 59.18-decimal fixed-point
    function getNextStartingPrice(int256 lastPurchasePrice)
    public
    view
    returns (int256 result)
    {
        int256 mismatchRatio = nextPurchaseStartingEMS.div(targetEMS);
        if (mismatchRatio > PRBMathSD59x18.fromInt(1)) {
            result = lastPurchasePrice.mul(
                PRBMathSD59x18.fromInt(1) + mismatchRatio.mul(priceSpeed)
            );
        } else {
            result = lastPurchasePrice;
        }
    }

    ///@notice Find block in which time based price decay should start
    function getPriceDecayStartBlock() internal view returns (uint256 result) {
        int256 mismatchRatio = nextPurchaseStartingEMS.div(targetEMS);
        //if mismatch ratio above 1, decay should start in future
        if (mismatchRatio > PRBMathSD59x18.fromInt(1)) {
            uint256 decayInterval = uint256(
                saleHalflife.mul(mismatchRatio.log2()).ceil().toInt()
            );
            result = block.number + decayInterval;
        }
        //else decay should start at the current block
        else {
            result = block.number;
        }
    }


    /*
     * MINT & DISTRIBUTION FUNCTIONS
     */

    /**
     * @dev mintNFTPreReveal is a public payable function which any user can call during the pre-reveal
     * @dev sale phase. This allows a user to mint up to MAX_PER_ADDRESS_OR_TX tokens. Tokens are
     * @dev minted sequentially. Mapping of token IDs on to hand IDs (according to provenance) is
     * @dev executed during the reveal & distribution phase, via a call to VOR.
     * @dev Correct ether value is expected to pay for tokens.
     *
     * @param _numberOfNfts uint256 number of NFTs to mint in this Tx
     */
    function mintNFTPreReveal(uint256 _numberOfNfts) external payable {
        uint256 numberOfNfts = (_numberOfNfts > 0) ? _numberOfNfts : 1;
        require(block.timestamp >= SALE_START_TIMESTAMP, "not started");
        require(totalSupply() < MAX_NFT_SUPPLY, "sold out");
        require(block.timestamp < REVEAL_TIMESTAMP, "sale ended");
        require(numberOfNfts <= MAX_PER_ADDRESS_OR_TX, "> max per tx");
        require(balanceOf(msg.sender) + numberOfNfts <= MAX_PER_ADDRESS_OR_TX, "mint limit reached");
        require(totalSupply() + numberOfNfts <= MAX_NFT_SUPPLY, "exceeds supply");

        int256 pricePerNft = getNftPrice();
        uint256 pricePerNftScaled = uint256(pricePerNft.toInt());
        uint256 totalCost = pricePerNftScaled * numberOfNfts;

        if (msg.value < totalCost) {
            revert InsufficientPayment();
        }

        for (uint i = 0; i < numberOfNfts; i++) {
            uint mintIndex = totalSupply();
            _safeMint(msg.sender, mintIndex);
        }

        //update CRISP state
        updateCrispState(pricePerNft);

        //issue refund
        refund(totalCost);
    }

    /**
     * @dev mintNFTPostReveal is a public payable function which any user can call AFTER the pre-reveal
     * @dev sale phase. This allows a user to mint any available token ID that hasn't been sold yet.
     * @dev This function cannot be executed until hands have been revealed and distributed.
     * @dev Correct ether value is expected to pay for token.
     *
     * @param tokenId uint256 NFT Token ID to purchase
     */
    function mintNFTPostReveal(uint256 tokenId) external payable {
        require(REVEALED, "not revealed");
        require(startingIndex > 0, "not distributed");
        require(tokenId >= 0 && tokenId < MAX_NFT_SUPPLY, "invalid tokenId");

        int256 price = getNftPrice();
        uint256 priceScaled = uint256(price.toInt());

        if (msg.value < priceScaled) {
            revert InsufficientPayment();
        }

        _safeMint(msg.sender, tokenId);

        //update CRISP state
        updateCrispState(price);

        //issue refund
        refund(priceScaled);
    }

    /**
     * @dev beginDistribution is called to initiate distribution and makes a VOR request to generate
     * @dev a random value. Can only be called after hands have been revealed according to provenance.
     *
     * @param _keyHash bytes32 key hash of the VOR Oracle that will handle the request
     * @param _fee uint256 xFUND fee to pay the VOR Oracle
     */
    function beginDistribution(bytes32 _keyHash, uint256 _fee) public canDistribute onlyOwner {
        _increaseVorCoordinatorAllowance(_fee);
        bytes32 requestId = requestRandomness(_keyHash, _fee, uint256(blockhash(block.number-10)));
        emit DistributionBegun(requestId, msg.sender);
    }

    /**
     * @dev fallbackDistribution is an emergency fallback function which can be called in the event
     * @dev of the fulfillRandomness function failing. It can only be called by the contract owner
     * @dev and should only be called if beginDistribution failed.
     */
    function fallbackDistribution() public canDistribute onlyOwner {
        uint256 sourceBlock = revealBlock;

        // Just a sanity check (EVM only stores last 256 block hashes)
        if (block.number - revealBlock > 255) {
            sourceBlock = block.number-1;
        }

        uint256 randomness = uint(blockhash(sourceBlock));

        checkAndSetStartIdx(randomness);

        emit DistributionResult(0x0, 0, startingIndex);
    }

    /**
     * @dev checkAndSetStartIdx is an internal function which will take the generated randomness
     * @dev and calculate/set the startingIndex mapping value.
     *
     * @param _randomness uint256 generated randomness value from VOR etc.
     */
    function checkAndSetStartIdx(uint256 _randomness) internal {
        // calculate based on randomness
        startingIndex = _randomness % (MAX_NFT_SUPPLY-1);
        // Prevent default sequence
        if (startingIndex == 0) {
            startingIndex = 1;
        }
        if (startingIndex > 1325) {
            startingIndex = 1325;
        }
    }

    /**
     * @dev fulfillRandomness is called by the VOR Oracle to fulfil the randomness request.
     * @dev The randomness value sent is used to calculate the start array Idx onto which
     * @dev hand IDs are mapped on to the NFT Token IDs.
     * @dev Can only be called by the correct VOR Oracle, and only via the VORCoordinator contract.
     *
     * @param _requestId bytes32 ID of the request fulfilled by the Oracle
     * @param _randomness uint256 the random number generated by the VOR Oracle
     */
    function fulfillRandomness(bytes32 _requestId, uint256 _randomness) internal override {
        require(startingIndex == 0, "already executed");
        checkAndSetStartIdx(_randomness);
        emit DistributionResult(_requestId, _randomness, startingIndex);
    }

    /**
     * @dev updateCrispState updates the CRISP parameters for dynamic pricing
     *
     * @param price int256 current price per NFT paid by user
     */
    function updateCrispState(int256 price) internal {
        nextPurchaseStartingEMS = getCurrentEMS() + PRBMathSD59x18.fromInt(1);
        nextPurchaseStartingPrice = getNextStartingPrice(price);
        priceDecayStartBlock = getPriceDecayStartBlock();
        lastPurchaseBlock = block.number;
    }

    /**
     * @dev refund issues refund if user paid too much
     *
     * @param actualCost uint256 actual price they should have paid
     */
    function refund(uint256 actualCost) internal {
        if(msg.value > actualCost) {
            uint256 refundAmount = msg.value - actualCost;
            (bool sent, ) = msg.sender.call{value: refundAmount}("");
            if (!sent) {
                revert FailedToSendEther();
            }
        }
    }

    /*
     * MODIFIERS
     */

    /**
     * @dev canDistribute checks it's time to distribute
     */
    modifier canDistribute() {
        require(startingIndex == 0, "already executed");
        require(REVEALED, "not revealed");
        _;
    }
}
