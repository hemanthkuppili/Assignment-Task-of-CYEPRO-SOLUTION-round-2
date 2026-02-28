package com.priorityengine.utils;

import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;

public class SimHash {
    private static final int HASH_BITS = 64;

    public static BigInteger generateFingerprint(String text) {
        if (text == null || text.length() < 5) return BigInteger.ZERO;

        int[] v = new int[HASH_BITS];
        String[] words = text.toLowerCase().split("\\W+");

        for (String word : words) {
            if (word.length() <= 2) continue;
            BigInteger hash = hash(word);

            for (int i = 0; i < HASH_BITS; i++) {
                BigInteger bit = hash.shiftRight(i).and(BigInteger.ONE);
                if (bit.equals(BigInteger.ONE)) {
                    v[i]++;
                } else {
                    v[i]--;
                }
            }
        }

        BigInteger fingerprint = BigInteger.ZERO;
        for (int i = 0; i < HASH_BITS; i++) {
            if (v[i] > 0) {
                fingerprint = fingerprint.setBit(i);
            }
        }
        return fingerprint;
    }

    private static BigInteger hash(String word) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] bytes = md.digest(word.getBytes());
            return new BigInteger(1, bytes).mod(BigInteger.ONE.shiftLeft(HASH_BITS));
        } catch (NoSuchAlgorithmException e) {
            return BigInteger.valueOf(word.hashCode());
        }
    }

    public static int hammingDistance(BigInteger h1, BigInteger h2) {
        return h1.xor(h2).bitCount();
    }
}
