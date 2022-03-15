// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;


// inspired by https://medium.com/coinmonks/value-arrays-in-solidity-32ca65135d5b
library uint8a5 { // provides the equivalent of uint8[5]
    uint constant bits = 8;
    uint constant elements = 5;
    // must ensure that bits * elements <= 256

    uint constant range = 1 << bits;
    uint constant max = range - 1;
    // get function
    function get(uint va, uint index) internal pure returns (uint) {
        require(index < elements);
        return (va >> (bits * index)) & max;
    }

    // set function
    function set(uint va, uint index, uint ev) internal pure
    returns (uint) {
        require(index < elements);
        require(ev < range);
        index *= bits;
        return (va & ~(max << index)) | (ev << index);
    }
}
