import { describe, expect, it } from 'vitest';
import { describeUserAgent } from './sessions';

describe('describeUserAgent', () => {
    const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

    it('describes an ordinary browser session as before', () => {
        expect(describeUserAgent(CHROME_WIN)).toBe('Chrome on Windows');
        expect(describeUserAgent(null)).toBe('Unknown device');
    });

    it('marks an extension session, keeping the browser it runs in', () => {
        expect(describeUserAgent(`ApexOps-extension/0.1.0 ${CHROME_WIN}`)).toBe('ApexOps extension · Chrome on Windows');
    });

    it('still says "extension" when the browser cannot be identified', () => {
        expect(describeUserAgent('ApexOps-extension/0.1.0')).toBe('ApexOps extension');
        expect(describeUserAgent('ApexOps-extension/0.1.0 something-odd')).toBe('ApexOps extension');
    });
});
