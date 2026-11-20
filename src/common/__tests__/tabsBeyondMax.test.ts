import { describe, it, expect } from 'vitest';
import { _tabsBeyondMax } from '../helpers';

const tab = (id: number, active = false) => ({ id, active, lastAccessed: id }) as chrome.tabs.Tab;

describe('_tabsBeyondMax', () => {
	it('closes the least recently accessed tabs beyond max', () => {
		expect(_tabsBeyondMax([tab(3), tab(1), tab(2), tab(4)], 2)).toEqual([1, 2]);
	});

	it('never closes the active tab or the kept tab', () => {
		expect(_tabsBeyondMax([tab(1, true), tab(2), tab(3), tab(4)], 2, 2)).toEqual([3, 4]);
	});

	it.each([0, 4, 5])('max %s with 4 tabs -> nothing', (max) => {
		expect(_tabsBeyondMax([tab(1), tab(2), tab(3), tab(4)], max)).toEqual([]);
	});
});
