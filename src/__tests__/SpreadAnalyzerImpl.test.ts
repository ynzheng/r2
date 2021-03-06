import 'reflect-metadata';
import SpreadAnalyzerImpl from '../SpreadAnalyzerImpl';
import { Broker, QuoteSide, ConfigStore } from '../types';
import * as _ from 'lodash';
import Quote from '../Quote';

const config = require('./config_test.json');
config.maxSize = 0.5;
const configStore = { config } as ConfigStore;
const positionMap = {
  Coincheck: {
    allowedLongSize: 10,
    allowedShortSize: 10,
    longAllowed: true,
    shortAllowed: true
  },
  Quoine: {
    allowedLongSize: 10,
    allowedShortSize: 10,
    longAllowed: true,
    shortAllowed: true
  }
};

let quotes = [
  new Quote(Broker.Coincheck, QuoteSide.Ask, 3, 1),
  new Quote(Broker.Coincheck, QuoteSide.Bid, 2, 2),
  new Quote(Broker.Quoine, QuoteSide.Ask, 3.5, 3),
  new Quote(Broker.Quoine, QuoteSide.Bid, 2.5, 4)
];

describe('Spread Analyzer', () => {
  test('analyze', async () => {
    const target = new SpreadAnalyzerImpl(configStore);
    const result = await target.analyze(quotes, positionMap);
    expect(result.bestAsk.broker).toBe(Broker.Coincheck);
    expect(result.bestAsk.price).toBe(3);
    expect(result.bestAsk.volume).toBe(1);
    expect(result.bestBid.broker).toBe(Broker.Quoine);
    expect(result.bestBid.price).toBe(2.5);
    expect(result.bestBid.volume).toBe(4);
    expect(result.invertedSpread).toBe(-0.5);
    expect(result.targetVolume).toBe(0.5);
    expect(result.targetProfit).toBe(0);
  });

  test('analyze positive profit', async () => {
    quotes = [
      new Quote(Broker.Coincheck, QuoteSide.Ask, 300000, 1),
      new Quote(Broker.Coincheck, QuoteSide.Bid, 200000, 2),
      new Quote(Broker.Quoine, QuoteSide.Ask, 350000, 3),
      new Quote(Broker.Quoine, QuoteSide.Bid, 360000, 4)
    ];
    const target = new SpreadAnalyzerImpl(configStore);
    const result = await target.analyze(quotes, positionMap);
    expect(result.bestAsk.broker).toBe(Broker.Coincheck);
    expect(result.bestAsk.price).toBe(300000);
    expect(result.bestAsk.volume).toBe(1);
    expect(result.bestBid.broker).toBe(Broker.Quoine);
    expect(result.bestBid.price).toBe(360000);
    expect(result.bestBid.volume).toBe(4);
    expect(result.invertedSpread).toBe(60000);
    expect(result.targetVolume).toBe(0.5);
    expect(result.targetProfit).toBe(30000);
  });

  test('analyze positive profit with too small quotes', async () => {
    quotes = [
      new Quote(Broker.Coincheck, QuoteSide.Ask, 300000, 1),
      new Quote(Broker.Coincheck, QuoteSide.Bid, 200000, 2),
      new Quote(Broker.Coincheck, QuoteSide.Ask, 100000, 0.0099),
      new Quote(Broker.Quoine, QuoteSide.Ask, 350000, 3),
      new Quote(Broker.Quoine, QuoteSide.Bid, 360000, 4)
    ];
    const target = new SpreadAnalyzerImpl(configStore);
    const result = await target.analyze(quotes, positionMap);
    expect(result.bestAsk.broker).toBe(Broker.Coincheck);
    expect(result.bestAsk.price).toBe(300000);
    expect(result.bestAsk.volume).toBe(1);
    expect(result.bestBid.broker).toBe(Broker.Quoine);
    expect(result.bestBid.price).toBe(360000);
    expect(result.bestBid.volume).toBe(4);
    expect(result.invertedSpread).toBe(60000);
    expect(result.targetVolume).toBe(0.5);
    expect(result.targetProfit).toBe(30000);
  });

  test('analyze positive profit with commission', async () => {
    config.brokers[2].commissionPercent = 0.05;
    quotes = [
      new Quote(Broker.Coincheck, QuoteSide.Ask, 300000, 1),
      new Quote(Broker.Coincheck, QuoteSide.Bid, 200000, 2),
      new Quote(Broker.Quoine, QuoteSide.Ask, 350000, 3),
      new Quote(Broker.Quoine, QuoteSide.Bid, 360000, 4)
    ];
    const target = new SpreadAnalyzerImpl(configStore);
    const result = await target.analyze(quotes, positionMap);
    expect(result.bestAsk.broker).toBe(Broker.Coincheck);
    expect(result.bestAsk.price).toBe(300000);
    expect(result.bestAsk.volume).toBe(1);
    expect(result.bestBid.broker).toBe(Broker.Quoine);
    expect(result.bestBid.price).toBe(360000);
    expect(result.bestBid.volume).toBe(4);
    expect(result.invertedSpread).toBe(60000);
    expect(result.targetVolume).toBe(0.5);
    expect(result.targetProfit).toBe(29910);
  });

  test('analyze with no position map', async () => {
    const target = new SpreadAnalyzerImpl(configStore);
    try {
      const result = await target.analyze(quotes, {});
    } catch (ex) {
      expect(ex.message).toBe('Position map is empty.');
      return;
    }
    throw new Error();
  });

  test('analyze with no best bid', async () => {
    quotes = [
      new Quote(Broker.Coincheck, QuoteSide.Ask, 3, 1),
      new Quote(Broker.Quoine, QuoteSide.Ask, 3.5, 3)
    ];
    const target = new SpreadAnalyzerImpl(configStore);
    try {
      const result = await target.analyze(quotes, positionMap);
    } catch (ex) {
      expect(ex.message).toBe('No best bid was found.');
      return;
    }
    throw new Error();
  });

  test('analyze with no best ask', async () => {
    quotes = [
      new Quote(Broker.Coincheck, QuoteSide.Bid, 3, 1),
      new Quote(Broker.Quoine, QuoteSide.Bid, 3.5, 3)
    ];
    const target = new SpreadAnalyzerImpl(configStore);
    try {
      const result = await target.analyze(quotes, positionMap);
    } catch (ex) {
      expect(ex.message).toBe('No best ask was found.');
      return;
    }
    throw new Error();
  });
});