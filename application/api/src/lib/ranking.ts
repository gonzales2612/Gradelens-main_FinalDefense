/**
 * Compute ranks for items based on `percentage` (descending).
 * Tied percentages receive a consecutive rank range (e.g., 1-2) and the same rank numbers.
 * Returns a Map from question_number to rank info: { rankNumbers: number[], rankLabel: string }
 */
export function computeRanks(items: Array<{ question_number: number; percentage: number }>) {
    // Sort items by percentage desc, then by question_number asc for deterministic ordering
    const sorted = [...items].sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return a.question_number - b.question_number;
    });

    const map = new Map<number, { rankNumbers: number[]; rankLabel: string }>();
    let currentRank = 1;
    let i = 0;

    while (i < sorted.length) {
        const pct = sorted[i].percentage;
        // find all items with same percentage
        let j = i + 1;
        while (j < sorted.length && sorted[j].percentage === pct) j++;

        const groupSize = j - i;
        const startRank = currentRank;
        const endRank = currentRank + groupSize - 1;

        const rankNumbers = [] as number[];
        for (let r = startRank; r <= endRank; r++) rankNumbers.push(r);

        const rankLabel = startRank === endRank ? `${startRank}` : `${startRank}-${endRank}`;

        for (let k = i; k < j; k++) {
        map.set(sorted[k].question_number, { rankNumbers: [...rankNumbers], rankLabel });
        }

        currentRank += groupSize;
        i = j;
    }

    return map;
}

export default computeRanks;
