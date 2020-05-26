export function scrumbleHash(hash) {
    let toReverse = hash;
    const hasPrefix = hash.indexOf('0x') !== -1;
    if (hasPrefix) {
        toReverse = hash.substring(2);
    }
    let toReverseArray = toReverse.split('');
    toReverseArray = toReverseArray.reverse();
    toReverse = toReverseArray.join('');
    if (hasPrefix) {
        return '0x' + toReverse;
    } else {
        return toReverse;
    }
}