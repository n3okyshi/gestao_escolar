const { test, describe } = require('node:test');
const assert = require('node:assert');
const { getInitials, getRandomColor } = require('./utils.js');

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

describe('getRandomColor', () => {
    test('should return a string', () => {
        assert.strictEqual(typeof getRandomColor(), 'string');
    });

    test('should return a valid hex color code', () => {
        const color = getRandomColor();
        assert.match(color, /^#[0-9a-fA-F]{6}$/);
    });

    test('should return one of the predefined colors', () => {
        const expectedColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
        const color = getRandomColor();
        assert.ok(expectedColors.includes(color));
    });
});
