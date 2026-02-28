import crypto from 'crypto';

/**
 * Simple SimHash implementation to detect near-duplicates.
 */
export const generateSimHash = (text) => {
    if (!text || text.length < 5) return 0n; // Exclude short strings

    const v = new Array(64).fill(0);
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);

    for (let word of words) {
        // Generate a 64-bit hash for each word
        const hash = crypto.createHash('sha256').update(word).digest();
        const bHash = BigInt('0x' + hash.slice(0, 8).toString('hex')); // Use first 64 bits

        for (let i = 0; i < 64; i++) {
            const bit = (bHash >> BigInt(i)) & 1n;
            if (bit === 1n) {
                v[i] += 1;
            } else {
                v[i] -= 1;
            }
        }
    }

    let fingerprint = 0n;
    for (let i = 0; i < 64; i++) {
        if (v[i] > 0) {
            fingerprint |= (1n << BigInt(i));
        }
    }

    return fingerprint;
};

/**
 * Calculate Hamming Distance between two 64-bit fingerprints.
 */
export const hammingDistance = (h1, h2) => {
    let x = h1 ^ h2;
    let dist = 0;
    while (x > 0n) {
        dist++;
        x &= (x - 1n);
    }
    return dist;
};
