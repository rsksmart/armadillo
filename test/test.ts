import { expect } from 'chai';
import 'mocha';
import { ForkDetectionData } from '../src/common/fork-detection-data';

describe('Hello function', () => {

  it('check fork data detection object', () => {
    expect('Hello world!').to.equal('Hello world!');

    let rskTag = '0xb361640849792b80c93c706c2257e821e7e07367b8b897311e8f33263e6af26d'

    let data : ForkDetectionData = new ForkDetectionData(rskTag);

    
    expect(data.BN).to.equal();
    expect(data.BN).to.equal();
    expect(data.BN).to.equal();
    expect(data.BN).to.equal();


  });
});