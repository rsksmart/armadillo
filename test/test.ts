import { expect } from 'chai';
import 'mocha';
import { hello } from '../src/monitor-runner';

describe('Hello function', () => {

  it('should return hello world', () => {
    const result = hello();
    expect(result).to.equal('Hello world!');
  });
});