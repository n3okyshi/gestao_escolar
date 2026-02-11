const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
    getInitials,
    escapeHTML,
    stringToColor,
    getContrastYIQ,
    getRandomColor
} = require('./utils.js');

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

describe('escapeHTML', () => {
    test('should return empty string for null or undefined', () => {
        assert.strictEqual(escapeHTML(null), '');
        assert.strictEqual(escapeHTML(undefined), '');
    });

    test('should escape special characters', () => {
        const input = '<script>alert("xss")</script>';
        const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
        assert.strictEqual(escapeHTML(input), expected);
    });

    test('should escape ampersand', () => {
        assert.strictEqual(escapeHTML('Tom & Jerry'), 'Tom &amp; Jerry');
    });

    test('should escape single quotes', () => {
        assert.strictEqual(escapeHTML("'hello'"), '&#39;hello&#39;');
    });

    test('should return original string if no special characters', () => {
        assert.strictEqual(escapeHTML('Hello World'), 'Hello World');
    });
});

describe('stringToColor', () => {
    test('should return a valid HSL string', () => {
        const color = stringToColor('test');
        assert.match(color, /^hsl\(\d+, 65%, 85%\)$/);
    });

    test('should return deterministic color for same input', () => {
        assert.strictEqual(stringToColor('test'), stringToColor('test'));
    });

    test('should return different colors for different inputs', () => {
        assert.notStrictEqual(stringToColor('test1'), stringToColor('test2'));
    });
});

describe('getContrastYIQ', () => {
    test('should return default dark color', () => {
        assert.strictEqual(getContrastYIQ('#ffffff'), '#1e293b');
        assert.strictEqual(getContrastYIQ('hsl(0, 0%, 0%)'), '#1e293b');
    });
});

describe('getRandomColor', () => {
    test('should return a valid hex color from the list', () => {
        const color = getRandomColor();
        assert.match(color, /^#[0-9a-f]{6}$/);
    });

    test('should return a color from the predefined list', () => {
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
        const color = getRandomColor();
        assert.ok(colors.includes(color));
    });
});
