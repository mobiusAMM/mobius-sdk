import { CELO as _CGLD, ChainId, cUSD as _cUSD, MobiPair, Price, Token, TokenAmount } from '../src'

describe('MobiPair', () => {
  const cUSD = new Token(ChainId.MAINNET, _cUSD[ChainId.MAINNET].address, 18, 'cUSD', 'Celo USD')
  const CGLD = new Token(ChainId.MAINNET, _CGLD[ChainId.MAINNET].address, 18, 'CGLD', 'Celo')

  describe('constructor', () => {
    it('cannot be used for tokens on different chains', () => {
      expect(
        () => new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(_CGLD[ChainId.ALFAJORES], '100'))
      ).toThrow('CHAIN_IDS')
    })
  })

  describe('#getAddress', () => {
    it('returns the correct address', () => {
      expect(MobiPair.getAddress(cUSD, CGLD)).toEqual('0x1E593F1FE7B61c53874B54EC0c59FD0d5eb8621e')
    })
  })

  describe('#token0', () => {
    it('always is the token that sorts before', () => {
      expect(new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '100')).token0).toEqual(CGLD)
      expect(new MobiPair(new TokenAmount(CGLD, '100'), new TokenAmount(cUSD, '100')).token0).toEqual(CGLD)
    })
  })
  describe('#token1', () => {
    it('always is the token that sorts after', () => {
      expect(new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '100')).token1).toEqual(cUSD)
      expect(new MobiPair(new TokenAmount(CGLD, '100'), new TokenAmount(cUSD, '100')).token1).toEqual(cUSD)
    })
  })
  describe('#reserve0', () => {
    it('always comes from the token that sorts before', () => {
      expect(new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '101')).reserve0).toEqual(
        new TokenAmount(CGLD, '101')
      )
      expect(new MobiPair(new TokenAmount(CGLD, '101'), new TokenAmount(cUSD, '100')).reserve0).toEqual(
        new TokenAmount(CGLD, '101')
      )
    })
  })
  describe('#reserve1', () => {
    it('always comes from the token that sorts after', () => {
      expect(new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '101')).reserve1).toEqual(
        new TokenAmount(cUSD, '100')
      )
      expect(new MobiPair(new TokenAmount(CGLD, '101'), new TokenAmount(cUSD, '100')).reserve1).toEqual(
        new TokenAmount(cUSD, '100')
      )
    })
  })

  describe('#token0Price', () => {
    it('returns price of token0 in terms of token1', () => {
      expect(new MobiPair(new TokenAmount(cUSD, '101'), new TokenAmount(CGLD, '100')).token0Price).toEqual(
        new Price(CGLD, cUSD, '100', '101')
      )
      expect(new MobiPair(new TokenAmount(CGLD, '100'), new TokenAmount(cUSD, '101')).token0Price).toEqual(
        new Price(CGLD, cUSD, '100', '101')
      )
    })
  })

  describe('#token1Price', () => {
    it('returns price of token1 in terms of token0', () => {
      expect(new MobiPair(new TokenAmount(cUSD, '101'), new TokenAmount(CGLD, '100')).token1Price).toEqual(
        new Price(cUSD, CGLD, '101', '100')
      )
      expect(new MobiPair(new TokenAmount(CGLD, '100'), new TokenAmount(cUSD, '101')).token1Price).toEqual(
        new Price(cUSD, CGLD, '101', '100')
      )
    })
  })

  describe('#priceOf', () => {
    const pair = new MobiPair(new TokenAmount(cUSD, '101'), new TokenAmount(CGLD, '100'))
    it('returns price of token in terms of other token', () => {
      expect(pair.priceOf(CGLD)).toEqual(pair.token0Price)
      expect(pair.priceOf(cUSD)).toEqual(pair.token1Price)
    })

    it('throws if invalid token', () => {
      expect(() => pair.priceOf(_CGLD[ChainId.ALFAJORES])).toThrow('TOKEN')
    })
  })

  describe('#reserveOf', () => {
    it('returns reserves of the given token', () => {
      expect(new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '101')).reserveOf(cUSD)).toEqual(
        new TokenAmount(cUSD, '100')
      )
      expect(new MobiPair(new TokenAmount(CGLD, '101'), new TokenAmount(cUSD, '100')).reserveOf(cUSD)).toEqual(
        new TokenAmount(cUSD, '100')
      )
    })

    it('throws if not in the pair', () => {
      expect(() =>
        new MobiPair(new TokenAmount(CGLD, '101'), new TokenAmount(cUSD, '100')).reserveOf(_CGLD[ChainId.ALFAJORES])
      ).toThrow('TOKEN')
    })
  })

  describe('#chainId', () => {
    it('returns the token0 chainId', () => {
      expect(new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '100')).chainId).toEqual(ChainId.MAINNET)
      expect(new MobiPair(new TokenAmount(CGLD, '100'), new TokenAmount(cUSD, '100')).chainId).toEqual(ChainId.MAINNET)
    })
  })
  describe('#involvesToken', () => {
    expect(new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '100')).involvesToken(cUSD)).toEqual(true)
    expect(new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '100')).involvesToken(CGLD)).toEqual(true)
    expect(
      new MobiPair(new TokenAmount(cUSD, '100'), new TokenAmount(CGLD, '100')).involvesToken(_CGLD[ChainId.ALFAJORES])
    ).toEqual(false)
  })
})
