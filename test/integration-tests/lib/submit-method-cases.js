const submitMethodCases = {
  submitBitcoinBlock: {
    extractSubmitParameters: (block) => [block.toHex()],
    
    // this invalid block should have a hash/id beginning with 0xFFF...
    extractInvalidSubmitParameters: (block) => ["010000000349ca8058b4a6def7f83a0cc827768c521296716481dfafecf4f974518b7dd38cbeee6296b6488b2e102d3b085ece7e35ebf8c8b799ad03ff7215467ceff517000000000d504917000000000102000000010000000000000000000000000000000000000000000000000000000000000000ffffffff28897496b6eae37c6f6f6e312f50726f6a65637420425443506f6f6c2f010000000000000000000000ffffffff03c862a804000000001976a914c0174e89bd93eacd1d5a1af4ba1802d412afc08688ac0000000000000000266a24aa21a9edf315b8139d4920109434e248fd6b58d5623b2bde1617816df4f27cbe460eaf6500000000000000002952534b424c4f434b3acf7268b58f7132613ed09844cf393952b10ce08f9d06f07c0ee889ed7029c52100000000"]
  },

  submitBitcoinBlockTransactions: {
    extractSubmitParameters: (block) => [block.getId(),
                                        block.toHex(true),
                                        block.transactions[0].toHex(),
                                        block.transactions[0].getId()],
                                        
    extractInvalidSubmitParameters: (block) => [block.getId(),
                                                block.toHex(true),
                                                block.transactions[0].toHex(),
                                                ''] // invalid parameter
  },

  submitBitcoinBlockPartialMerkle: {
    extractSubmitParameters: (block) => [block.getId(),
                                        block.toHex(true),
                                        block.transactions[0].toHex(),
                                        block.transactions[0].getHash().toString('hex'),
                                        1],

    extractInvalidSubmitParameters: (block) => [block.getId(),
                                                block.toHex(true),
                                                block.transactions[0].toHex(),
                                                '', // invalid parameter
                                                1]
  }
}

module.exports = {
  submitMethodCases
}