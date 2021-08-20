import { Price } from './fractions/price'
import { TokenAmount } from './fractions/tokenAmount'
import invariant from 'tiny-invariant'
import JSBI from 'jsbi'
import StableSwap from '../abis/StableSwap.json'
import { Contract } from '@ethersproject/contracts'
import { getNetwork } from '@ethersproject/networks'
import { getDefaultProvider } from '@ethersproject/providers'

import { BigintIsh, ZERO, FIVE, _997, _1000, ChainId, POOLS_TO_TOKENS } from '../constants'
import { sqrt, parseBigintIsh } from '../utils'
import { InsufficientReservesError, InsufficientInputAmountError } from '../errors'
import { Token } from './token'

let PAIR_ADDRESS_CACHE: { [token0Address: string]: { [token1Address: string]: string } } = {}

export class MobiPair {
  public readonly poolAddress: string
  public readonly liquidityToken: Token
  private readonly tokenAmounts: [TokenAmount, TokenAmount] | [TokenAmount, TokenAmount, TokenAmount]
  private readonly poolContract: Contract

  public static async getAddress(tokenA: Token, tokenB: Token, tokenC?: Token): Promise<string> {
    const chainId = tokenA.chainId
    const [poolAddress] = MobiPair.getPoolInfo(tokenA, tokenB, tokenC)
    const provider = getDefaultProvider(getNetwork(chainId))
    const contract = new Contract(poolAddress, StableSwap.abi, provider)

    const lpToken = await contract.token()
    return lpToken
  }

  public static getPoolInfo(tokenA: Token, tokenB: Token, tokenC?: Token): [string, string, string[]] {
    const chainId = tokenA.chainId
    const possiblePools = POOLS_TO_TOKENS[chainId].filter(
      ({ tokens }) =>
        tokens.includes(tokenA.address) &&
        tokens.includes(tokenB.address) &&
        (!tokenC || tokens.includes(tokenC.address))
    )
    return [possiblePools[0].address, possiblePools[0].lpToken, possiblePools[0].tokens]
  }

  public constructor(tokenAmountA: TokenAmount, tokenAmountB: TokenAmount, tokenAmountC?: TokenAmount) {
    const chainId = tokenAmountA.token.chainId
    const provider = getDefaultProvider(getNetwork(chainId))

    const [poolAddress, lpToken, tokenOrder] = MobiPair.getPoolInfo(
      tokenAmountA.token,
      tokenAmountB.token,
      tokenAmountC?.token
    )

    this.poolAddress = poolAddress
    this.poolContract = new Contract(this.poolAddress, StableSwap.abi, provider)
    const tokenAmounts = tokenOrder.map(address => {
      switch (address) {
        case tokenAmountA.token.address:
          return tokenAmountA

        case tokenAmountB.token.address:
          return tokenAmountB

        case tokenAmountC?.token.address:
          return tokenAmountC || tokenAmountA
        default:
          return tokenAmountA
      }
    })

    this.liquidityToken = new Token(tokenAmounts[0].token.chainId, lpToken, 18, 'Mobi-V2', 'Mobius V2')
    if (tokenAmounts.length === 3) {
      this.tokenAmounts = tokenAmounts as [TokenAmount, TokenAmount, TokenAmount]
    } else {
      this.tokenAmounts = tokenAmounts as [TokenAmount, TokenAmount]
    }
  }

  /**
   * Returns true if the token is either token0 or token1
   * @param token to check
   */
  public involvesToken(token: Token): boolean {
    return token.equals(this.token0) || token.equals(this.token1) || (!!this.token2 && token.equals(this.token2))
  }

  /**
   * Returns the current mid price of the pair in terms of token0, i.e. the ratio of reserve1 to reserve0
   */
  public get token0Price(): Price {
    return new Price(this.token0, this.token1, this.tokenAmounts[0].raw, this.tokenAmounts[1].raw)
  }

  /**
   * Returns the current mid price of the pair in terms of token1, i.e. the ratio of reserve0 to reserve1
   */
  public get token1Price(): Price {
    return new Price(this.token1, this.token0, this.tokenAmounts[1].raw, this.tokenAmounts[0].raw)
  }

  /**
   * Return the price of the given token in terms of the other token in the pair.
   * @param token token to return price of
   */
  public priceOf(token: Token): Price {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.token0Price : this.token1Price
  }

  /**
   * Returns the chain ID of the tokens in the pair.
   */
  public get chainId(): ChainId {
    return this.token0.chainId
  }

  public get token0(): Token {
    return this.tokenAmounts[0].token
  }

  public get token1(): Token {
    return this.tokenAmounts[1].token
  }

  public get token2(): Token | undefined {
    return this.tokenAmounts[2]?.token
  }

  public get reserve0(): TokenAmount {
    return this.tokenAmounts[0]
  }

  public get reserve1(): TokenAmount {
    return this.tokenAmounts[1]
  }

  public get reserve2(): TokenAmount | undefined {
    return this.tokenAmounts[2]
  }

  public reserveOf(token: Token): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0)
      ? this.reserve0
      : token.equals(this.token1)
      ? this.reserve1
      : this.reserve2 || this.reserve0
  }

  public async getOutputAmount(inputAmount: TokenAmount, outputToken: Token): Promise<TokenAmount> {
    invariant(this.involvesToken(inputAmount.token), 'TOKEN')
    if (JSBI.equal(this.reserve0.raw, ZERO) || JSBI.equal(this.reserve1.raw, ZERO)) {
      throw new InsufficientReservesError()
    }
    const contract = this.poolContract
    const i = this.tokenAmounts.findIndex(({ token }) => token.address === inputAmount.token.address)
    const j = this.tokenAmounts.findIndex(({ token }) => token.address === outputToken.address)
    const expectedOut = contract.get_dy(i, j, inputAmount.raw)

    const outputAmount = new TokenAmount(outputToken, expectedOut)
    if (JSBI.equal(outputAmount.raw, ZERO)) {
      throw new InsufficientInputAmountError()
    }
    return outputAmount
  }

  public async getLiquidityMinted(
    totalSupply: TokenAmount,
    tokenAmountA: TokenAmount,
    tokenAmountB: TokenAmount,
    tokenAmountC?: TokenAmount
  ): Promise<TokenAmount> {
    invariant(totalSupply.token.equals(this.liquidityToken), 'LIQUIDITY')

    const tokenMap = {
      [tokenAmountA.token.address]: tokenAmountA,
      [tokenAmountB.token.address]: tokenAmountB,
      [tokenAmountC?.token.address || '0x000']: tokenAmountC || tokenAmountA
    }

    const tokenAmounts = this.tokenAmounts.map(({ token }) => tokenMap[token.address])
    invariant(tokenAmounts[0].token.equals(this.token0) && tokenAmounts[1].token.equals(this.token1), 'TOKEN')

    let liquidity: JSBI
    const contract = this.poolContract
    liquidity = await contract.calc_token_amount(
      tokenAmounts.map(({ raw }) => raw),
      true
    )
    if (!JSBI.greaterThan(liquidity, ZERO)) {
      throw new InsufficientInputAmountError()
    }
    return new TokenAmount(this.liquidityToken, liquidity)
  }

  public getLiquidityValue(
    token: Token,
    totalSupply: TokenAmount,
    liquidity: TokenAmount,
    feeOn: boolean = false,
    kLast?: BigintIsh
  ): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN')
    invariant(totalSupply.token.equals(this.liquidityToken), 'TOTAL_SUPPLY')
    invariant(liquidity.token.equals(this.liquidityToken), 'LIQUIDITY')
    invariant(JSBI.lessThanOrEqual(liquidity.raw, totalSupply.raw), 'LIQUIDITY')

    let totalSupplyAdjusted: TokenAmount
    if (!feeOn) {
      totalSupplyAdjusted = totalSupply
    } else {
      invariant(!!kLast, 'K_LAST')
      const kLastParsed = parseBigintIsh(kLast)
      if (!JSBI.equal(kLastParsed, ZERO)) {
        const rootK = sqrt(JSBI.multiply(this.reserve0.raw, this.reserve1.raw))
        const rootKLast = sqrt(kLastParsed)
        if (JSBI.greaterThan(rootK, rootKLast)) {
          const numerator = JSBI.multiply(totalSupply.raw, JSBI.subtract(rootK, rootKLast))
          const denominator = JSBI.add(JSBI.multiply(rootK, FIVE), rootKLast)
          const feeLiquidity = JSBI.divide(numerator, denominator)
          totalSupplyAdjusted = totalSupply.add(new TokenAmount(this.liquidityToken, feeLiquidity))
        } else {
          totalSupplyAdjusted = totalSupply
        }
      } else {
        totalSupplyAdjusted = totalSupply
      }
    }

    return new TokenAmount(
      token,
      JSBI.divide(JSBI.multiply(liquidity.raw, this.reserveOf(token).raw), totalSupplyAdjusted.raw)
    )
  }
}
