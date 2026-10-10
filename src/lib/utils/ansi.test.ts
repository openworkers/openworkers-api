import { describe, test, expect } from 'bun:test';
import { parseAnsi, stripAnsi } from './ansi';

describe('parseAnsi', () => {
  test('plain text is a single unstyled segment', () => {
    expect(parseAnsi('hello world')).toEqual([{ text: 'hello world' }]);
  });

  test('empty input has no segments', () => {
    expect(parseAnsi('')).toEqual([]);
  });

  test('applies and resets foreground colors', () => {
    expect(parseAnsi('a \x1b[31mred\x1b[0m b')).toEqual([
      { text: 'a ' },
      { text: 'red', fg: '#ef4444' },
      { text: ' b' }
    ]);
  });

  test('combines attributes in one sequence', () => {
    expect(parseAnsi('\x1b[1;4;92mok')).toEqual([{ text: 'ok', bold: true, underline: true, fg: '#4ade80' }]);
  });

  test('bare ESC[m resets', () => {
    expect(parseAnsi('\x1b[33mwarn\x1b[m done')).toEqual([{ text: 'warn', fg: '#eab308' }, { text: ' done' }]);
  });

  test('256-color and truecolor', () => {
    expect(parseAnsi('\x1b[38;5;196mx')).toEqual([{ text: 'x', fg: 'rgb(255, 0, 0)' }]);
    expect(parseAnsi('\x1b[48;2;1;2;3mx')).toEqual([{ text: 'x', bg: 'rgb(1, 2, 3)' }]);
  });

  test('drops non-SGR control sequences', () => {
    expect(parseAnsi('\x1b[2K\x1b[1Gline\x1b]0;title\x07')).toEqual([{ text: 'line' }]);
  });

  test('keeps HTML as plain text', () => {
    expect(parseAnsi('<img src=x onerror=alert(1)>')).toEqual([{ text: '<img src=x onerror=alert(1)>' }]);
  });
});

describe('stripAnsi', () => {
  test('removes every escape sequence', () => {
    expect(stripAnsi('\x1b[1;31mError:\x1b[0m boom\x1b[2K')).toBe('Error: boom');
  });
});
