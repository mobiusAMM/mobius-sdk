import JSBI from 'jsbi'

// exports for external consumption
export type BigintIsh = JSBI | bigint | string

export enum ChainId {
  MAINNET = 42220,
  ALFAJORES = 44787,
  BAKLAVA = 62320
}

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP
}

type PoolInfo = {
  name: string
  address: string
  lpToken: string
  tokens: string[]
}

export const FACTORY_ADDRESS = '0x62d5b84bE28a183aBB507E125B384122D2C25fAE'

export const INIT_CODE_HASH = '0xb3b8ff62960acea3a88039ebcf80699f15786f1b17cebd82802f7375827a339c'

export const USD_POOL_ADDRESSES = {
  [ChainId.MAINNET]: null,
  [ChainId.ALFAJORES]: '0xe83e3750eeE33218586015Cf3a34c6783C0F63Ac',
  [ChainId.BAKLAVA]: null
}

export const POOLS_TO_TOKENS: { [c: number]: PoolInfo[] } = {
  [ChainId.MAINNET]: [],
  [ChainId.ALFAJORES]: [
    {
      name: 'Staked Celo Pool',
      tokens: ['0xf194afdf50b03e69bd7d057c1aa9e10c9954e4c9', '0xBDeedCDA79BAbc4Eb509aB689895a3054461691e'],
      address: '',
      lpToken: ''
    },
    {
      name: 'US Dollar Pool',
      address: '0xe83e3750eeE33218586015Cf3a34c6783C0F63Ac',
      tokens: [
        '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
        '0x695218A22c805Bab9C6941546CF5395F169Ad871',
        '0x4DA9471c101e0cac906E52DF4f00943b21863efF'
      ],
      lpToken: '0x751c70e8f062071bDE19597e2766a5078709FCb9'
    }
  ]
}

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const TWO = JSBI.BigInt(2)
export const THREE = JSBI.BigInt(3)
export const FIVE = JSBI.BigInt(5)
export const TEN = JSBI.BigInt(10)
export const _100 = JSBI.BigInt(100)
export const _997 = JSBI.BigInt(997)
export const _1000 = JSBI.BigInt(1000)

export enum SolidityType {
  uint8 = 'uint8',
  uint256 = 'uint256'
}

export const SOLIDITY_TYPE_MAXIMA = {
  [SolidityType.uint8]: JSBI.BigInt('0xff'),
  [SolidityType.uint256]: JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
}

interface ChainInfo {
  name: string
  fornoURL: string
  blockscoutURL: string
}

export const CHAIN_INFO: { [K in ChainId]: ChainInfo } = {
  [ChainId.ALFAJORES]: {
    name: 'Alfajores',
    fornoURL: 'https://alfajores-forno.celo-testnet.org',
    blockscoutURL: 'https://alfajores-blockscout.celo-testnet.org'
  },
  [ChainId.BAKLAVA]: {
    name: 'Baklava',
    fornoURL: 'https://baklava-forno.celo-testnet.org',
    blockscoutURL: 'https://baklava-blockscout.celo-testnet.org'
  },
  [ChainId.MAINNET]: {
    name: 'Mainnet',
    fornoURL: 'https://forno.celo.org',
    blockscoutURL: 'https://explorer.celo.org'
  }
}
