import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TabGroupsService } from '../TabGroupsService';
import type { Rule, TabModifierSettings } from '../../common/types';

/**
 * Stateful fake of the tab groups API. Every call answers on a later tick, and a new
 * group has no title until tabGroups.update() lands, like in Chrome.
 */
type FakeGroup = { id: number; windowId: number; title: string; color: string };
let groups: FakeGroup[] = [];
let tabGroupOf: Record<number, number> = {};
let nextGroupId = 100;

const later = (fn: () => void) => setTimeout(fn, 0);

const mockChrome = {
	tabs: {
		get: vi.fn(async (tabId: number) => ({ id: tabId, groupId: tabGroupOf[tabId] ?? -1 })),
		// lastAccessed = tab id, so a lower id is an older tab
		query: vi.fn(async (info: any) =>
			Object.keys(tabGroupOf)
				.map(Number)
				.filter((id) => tabGroupOf[id] === info.groupId)
				.map((id) => ({ id, active: id === activeTab, lastAccessed: id }))
		),
		remove: vi.fn(async (ids: number[]) => ids.forEach((id) => delete tabGroupOf[id])),
		group: vi.fn((options: any, callback: any) => {
			later(() => {
				const tabId = options.tabIds[0];
				let groupId = options.groupId;
				if (groupId === undefined) {
					groupId = nextGroupId++;
					groups.push({ id: groupId, windowId: windowOf[tabId], title: '', color: 'grey' });
				}
				tabGroupOf[tabId] = groupId;
				callback(groupId);
			});
		}),
		ungroup: vi.fn(),
	},
	tabGroups: {
		get: vi.fn(),
		query: vi.fn((info: any, callback: any) => {
			const result = groups.filter(
				(g) => g.title === info.title && g.color === info.color && g.windowId === info.windowId
			);
			later(() => callback(result.map((g) => ({ ...g }))));
		}),
		update: vi.fn((groupId: number, props: any, callback: any) => {
			later(() => {
				const g = groups.find((x) => x.id === groupId)!;
				g.title = props.title;
				g.color = props.color;
				callback?.();
			});
		}),
	},
	runtime: {
		lastError: undefined,
	},
};

// @ts-expect-error - partial mock of the chrome global
global.chrome = mockChrome;

vi.mock('../../common/storage', () => ({
	_getStorageAsync: vi.fn(),
}));

let windowOf: Record<number, number> = {};
let activeTab = -1;

const tabModifier = {
	rules: [],
	groups: [{ id: 'local', title: 'Localhost', color: 'blue', collapsed: false }],
	settings: {},
} as unknown as TabModifierSettings;

const ruleFor = (id: string) =>
	({ id, name: id, tab: { group_id: 'local' }, is_enabled: true }) as unknown as Rule;

const tab = (id: number, windowId = 1) => {
	windowOf[id] = windowId;
	return { id, windowId, url: `http://localhost:${4800 + id}` } as chrome.tabs.Tab;
};

describe('TabGroupsService - parallel tabs of the same group (#556)', () => {
	let service: TabGroupsService;

	beforeEach(() => {
		service = new TabGroupsService();
		vi.clearAllMocks();
		groups = [];
		tabGroupOf = {};
		windowOf = {};
		activeTab = -1;
		nextGroupId = 100;
	});

	it('2 tabs matching different rules of the same group -> 1 group with both tabs', async () => {
		const a = tab(1);
		const b = tab(2);

		await Promise.all([
			service.applyGroupRuleToTab(ruleFor('contains-localhost'), a, tabModifier),
			service.applyGroupRuleToTab(ruleFor('regex-localhost-port'), b, tabModifier),
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0].title).toBe('Localhost');
		expect(tabGroupOf[1]).toBe(groups[0].id);
		expect(tabGroupOf[2]).toBe(groups[0].id);
	});

	it('5 tabs loading at the same time -> still 1 group', async () => {
		const tabs = [1, 2, 3, 4, 5].map((id) => tab(id));

		await Promise.all(
			tabs.map((t, i) => service.applyGroupRuleToTab(ruleFor(`rule-${i}`), t, tabModifier))
		);

		expect(groups).toHaveLength(1);
		expect(new Set(Object.values(tabGroupOf))).toEqual(new Set([groups[0].id]));
	});

	it('tabs in different windows -> one group per window', async () => {
		await Promise.all([
			service.applyGroupRuleToTab(ruleFor('a'), tab(1, 1), tabModifier),
			service.applyGroupRuleToTab(ruleFor('b'), tab(2, 2), tabModifier),
		]);

		expect(groups.map((g) => g.windowId).sort()).toEqual([1, 2]);
	});

	it('6th tab in a group of max 5 -> oldest non-active tab closed', async () => {
		activeTab = 1;
		const max5 = {
			...tabModifier,
			groups: [{ ...tabModifier.groups[0], max_tabs: 5 }],
		} as TabModifierSettings;
		for (const id of [1, 2, 3, 4, 5, 6]) {
			await service.applyGroupRuleToTab(ruleFor('a'), tab(id), max5);
		}

		expect(mockChrome.tabs.remove).toHaveBeenCalledTimes(1);
		expect(mockChrome.tabs.remove).toHaveBeenCalledWith([2]);
	});

	it.each([
		['max_tabs 0', 0],
		['max_tabs missing (existing groups)', undefined],
	])('%s -> unlimited', async (_label, max_tabs) => {
		const unlimited = {
			...tabModifier,
			groups: [{ ...tabModifier.groups[0], max_tabs }],
		} as TabModifierSettings;
		for (const id of [1, 2, 3, 4, 5, 6]) {
			await service.applyGroupRuleToTab(ruleFor('a'), tab(id), unlimited);
		}

		expect(mockChrome.tabs.remove).not.toHaveBeenCalled();
	});
});
