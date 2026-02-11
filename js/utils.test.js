const { test, describe } = require('node:test');
const assert = require('node:assert');
const { getInitials, stringToColor } = require('./utils.js');

describe('getInitials', () => {
    test('should return initials for two names', () => {
        assert.strictEqual(getInitials('John Doe'), 'JD');
    });

    test('should return initials for a single name', () => {
        assert.strictEqual(getInitials('John'), 'J');
    });

    test('should return initials for three names, truncated to 2', () => {
        assert.strictEqual(getInitials('John Doe Smith'), 'JD');
    });

    test('should handle lowercase names and return uppercase initials', () => {
        assert.strictEqual(getInitials('john doe'), 'JD');
    });

    test('should handle multiple spaces between names', () => {
        assert.strictEqual(getInitials('John  Doe'), 'JD');
    });

    test('should return empty string for empty input', () => {
        assert.strictEqual(getInitials(''), '');
    });

    test('should return empty string for space-only input', () => {
        assert.strictEqual(getInitials(' '), '');
    });

    test('should return single initial for single letter name', () => {
        assert.strictEqual(getInitials('J'), 'J');
    });

    test('should handle accented characters correctly', () => {
        assert.strictEqual(getInitials('Álvaro Antunes'), 'ÁA');
    });
});

describe('stringToColor', () => {
    test('should return a valid HSL string', () => {
        const color = stringToColor('test');
        assert.match(color, /^hsl\(\d+, 65%, 85%\)$/);
    });

    test('should return deterministic color for same string', () => {
        const str = 'test string';
        const color1 = stringToColor(str);
        const color2 = stringToColor(str);
        assert.strictEqual(color1, color2);
    });

    test('should return different colors for different strings', () => {
        // Note: Hash collisions are possible, but unlikely for these simple strings
        const color1 = stringToColor('abc');
        const color2 = stringToColor('xyz');
        assert.notStrictEqual(color1, color2);
    });

    test('should handle empty string', () => {
        const color = stringToColor('');
        // hash of empty string is 0 -> hsl(0, 65%, 85%)
        assert.strictEqual(color, 'hsl(0, 65%, 85%)');
    });

    test('should handle special characters', () => {
        const color = stringToColor('!@#$%^&*()');
        assert.match(color, /^hsl\(\d+, 65%, 85%\)$/);
    });

    test('should handle long strings', () => {
        const longStr = 'a'.repeat(1000);
        const color = stringToColor(longStr);
        assert.match(color, /^hsl\(\d+, 65%, 85%\)$/);
    });
});
