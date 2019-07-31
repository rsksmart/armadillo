import { expect } from 'chai';
import 'mocha';
import { ForkDetectionData } from '../src/common/fork-detection-data';

describe('For detection tag', () => {

  it('well form with 0x', () => {
    let rskTag = '0x9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0d89d8bf4d2e43400000004c9'

    let data: ForkDetectionData = new ForkDetectionData(rskTag);

    expect(data.prefixHash).to.equal('9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0');
    expect(data.CPV).to.equal('d89d8bf4d2e434');
    expect(data.NU).to.equal(0);
    expect(data.BN).to.equal(1225);

  });

  it('well form', () => {
    let rskTag = '9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0d89d8bf4d2e43400000004c9'

    let data: ForkDetectionData = new ForkDetectionData(rskTag);

    expect(data.prefixHash).to.equal('9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0');
    expect(data.CPV).to.equal('d89d8bf4d2e434');
    expect(data.NU).to.equal(0);
    expect(data.BN).to.equal(1225);
  });
});

describe('Overlap CPV', () => {

  it('cpv match with differents lengh', () => {
    const prefix = '9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0';
    const cpv = 'd89d8bf4d2e434'; //["d8", "9d", "8b", "f4", "d2", "e4", "34"]
    const nu = '00';
    const bn = '000004c9';

    let forkData = new ForkDetectionData(prefix + cpv + nu + bn);

    //match with "d2", "e4", "34"
    let cpv1 = 'd89d8bf4d2e434';
    let overlapped = forkData.overlapCPV(cpv1, 1);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 2);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 4);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 5);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 6);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 7);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 8);
    expect(overlapped).to.equal(false);
  });

  it('cpv match 3 lengh', () => {
    const prefix = '9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0';
    const cpv = 'd89d8bf4d2e434'; //["d8", "9d", "8b", "f4", "d2", "e4", "34"]
    const nu = '00';
    const bn = '000004c9';

    let forkData = new ForkDetectionData(prefix + cpv + nu + bn);

    //match with "d2", "e4", "34"
    let cpv1 = 'd2e43411223344'; //["d2", "e4", "34", "11", "22", "33", "44"]
    let overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(true);

    //match with "e4", "34"
    cpv1 = 'e4341122334455'; //["e4", "34", "11", "22", "33", "44", "55"]
    overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(false);

    //match with "34"
    cpv1 = '34112233445566'; //["34", "11", "22", "33", "44", "55", "66"]
    overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(false);

    //doesn't match match anything
    cpv1 = '34112233445566'; //["11", "22", "33", "44", "55", "66", "77"]
    overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(false);
  });
});