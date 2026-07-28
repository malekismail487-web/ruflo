import { describe, it, expect } from 'vitest';
import { NemotronClient } from '../src/core/nemotronClient.js';

describe('NemotronClient', () => {
    it('should initialize with default key when no key or env is provided', () => {
        const originalEnv = process.env.NVIDIA_API_KEY;
        delete process.env.NVIDIA_API_KEY;
        const client = new NemotronClient();
        expect(client).toBeInstanceOf(NemotronClient);
        process.env.NVIDIA_API_KEY = originalEnv;
    });

    it('should initialize successfully with a custom API key', () => {
        const client = new NemotronClient('test-key');
        expect(client).toBeInstanceOf(NemotronClient);
    });
});

