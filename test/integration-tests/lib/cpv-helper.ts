export function getStartHeightMainchainForCPVDiff(forkItemHeight: number, cpvDiff: number): number {
    if (cpvDiff === 7) {
        return 1;
    }
    return forkItemHeight - 1 - ((forkItemHeight - 1) % 64) - cpvDiff * 64;
}

export function getEndHeightMainchainForCPVDiff(forkItemHeight: number, cpvDiff: number, bestBlockHeight: number): number {
    if (cpvDiff <= 0) {
        if (forkItemHeight <= bestBlockHeight) {
            return forkItemHeight;
        } else {
            return bestBlockHeight;
        }
    } else {
        const endCandidate = forkItemHeight - ((forkItemHeight - 1) % 64) - (cpvDiff - 1) * 64 - 1;
        if (endCandidate > bestBlockHeight) {
            return bestBlockHeight;
        } else {
            return endCandidate;
        }
    }
}
