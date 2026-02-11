const { test, describe } = require('node:test');
const assert = require('node:assert');
const { getInitials, escapeHTML } = require('./utils.js');

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
    test('should return empty string for null', () => {
        assert.strictEqual(escapeHTML(null), '');
    });

    test('should return empty string for undefined', () => {
        assert.strictEqual(escapeHTML(undefined), '');
    });

    test('should return same string if no special characters', () => {
        assert.strictEqual(escapeHTML('hello world'), 'hello world');
    });

    test('should escape &', () => {
        assert.strictEqual(escapeHTML('Tom & Jerry'), 'Tom &amp; Jerry');
    });

    test('should escape < and >', () => {
        assert.strictEqual(escapeHTML('<script>'), '&lt;script&gt;');
    });

    test('should escape quotes', () => {
        assert.strictEqual(escapeHTML('It\'s "quote"'), 'It&#39;s &quot;quote&quot;');
    });

    test('should not escape /', () => {
        assert.strictEqual(escapeHTML('a/b'), 'a/b');
    });
});
