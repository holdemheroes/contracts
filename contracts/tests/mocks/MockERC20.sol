// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MockERC20 is ERC20 {
    constructor() ERC20("MockERC20", "MOCK") {
        uint256 value = 10**10 * (10**18);
        _mint(msg.sender, value);
    }
}
