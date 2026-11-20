import { describe, it, expect } from 'vitest';
import { _maxTabsChoice } from '../helpers';

describe('_maxTabsChoice', () => {
	it.each([
		[undefined, 0],
		[0, 0],
		[1, 1],
		[5, 5],
		[6, 'more'],
		[20, 'more'],
	])('max_tabs %s -> %s', (maxTabs, expected) => {
		expect(_maxTabsChoice(maxTabs)).toBe(expected);
	});
});
