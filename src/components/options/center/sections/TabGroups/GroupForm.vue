<template>
	<h3 class="font-bold text-lg flex justify-between">
		<span v-if="isEditMode">Edit group</span>
		<span v-else>Add a new group</span>

		<HelpSwap v-model="showHelp" />
	</h3>

	<div class="flex flex-col gap-2 mt-2">
		<div class="form-control w-full flex-1">
			<label class="label">
				<span class="label-text text-sm">Title</span>
			</label>
			<input
				ref="currentGroupTitleInput"
				v-model="currentGroup.title"
				class="input input-xs w-full"
				placeholder="e.g. Google"
				required
				type="text"
				autofocus
			/>
			<div v-if="showHelp" class="label opacity-80">You can set a title for your tab</div>
		</div>

		<div class="form-control w-full flex-1">
			<div class="label">
				<span class="label-text text-sm">Color</span>
			</div>
			<div class="flex gap-2">
				<CustomSelect v-model="currentGroup.color" :items="availableGroupColors" />
			</div>
			<div v-if="showHelp" class="label">
				<span class="text-xs label-text-alt opacity-80">You can set a color for your group</span>
			</div>

			<div class="form-control mt-4">
				<label class="cursor-pointer label">
					<span class="label-text text-sm">Collapsed</span>
					<input
						v-model="currentGroup.collapsed"
						checked
						class="toggle toggle-sm toggle-primary"
						type="checkbox"
					/>
				</label>
			</div>
		</div>

		<div class="form-control w-full flex-1">
			<label class="cursor-pointer label">
				<span class="label-text text-sm">Close extra tabs</span>
				<input
					v-model="limitTabs"
					class="toggle toggle-sm toggle-primary"
					type="checkbox"
					@change="onLimitTabsToggle"
				/>
			</label>
			<div v-if="limitTabs" class="flex items-center gap-2">
				<span class="text-sm opacity-80">Keep at most</span>
				<input
					v-model.number="currentGroup.max_tabs"
					aria-describedby="group-max-tabs-hint"
					aria-label="Number of tabs to keep"
					class="input input-xs w-20"
					min="1"
					type="number"
				/>
				<span class="text-sm opacity-80">tabs</span>
			</div>
			<div v-if="limitTabs" id="group-max-tabs-hint" class="label">
				<span class="text-xs label-text-alt opacity-80"
					>Opening a tab beyond this limit closes the least recently used tabs in this group.</span
				>
			</div>
		</div>

		<div class="modal-action items-center">
			<p v-if="showHelp" class="py-4 opacity-80">Remember refresh your tabs after saving</p>
			<form method="dialog">
				<button class="btn btn-sm">Close <kbd v-if="showHelp" class="kbd kbd-xs">esc</kbd></button>
			</form>
			<button
				:disabled="currentGroup.title.trim() === ''"
				class="btn btn-sm btn-outline btn-primary ml-4 group"
				@click="save"
			>
				Save
			</button>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { useRulesStore } from '../../../../../stores/rules.store.ts';
import { computed, inject, onMounted, ref, watch } from 'vue';
import CustomSelect from '../../../../global/CustomSelect.vue';
import { _clone, _groupColors } from '../../../../../common/helpers.ts';
import { GLOBAL_EVENTS, Group } from '../../../../../common/types.ts';
import HelpSwap from '../../../../global/HelpSwap.vue';

const emitter: any = inject('emitter');
const rulesStore = useRulesStore();

const isEditMode = computed(() => !!rulesStore.currentGroup);

const defaultGroup: Partial<Group> = {
	title: '',
	color: 'grey',
	collapsed: false,
	max_tabs: 0,
};

const showHelp = ref(false);
const currentGroup = ref(_clone(rulesStore.currentGroup ?? defaultGroup));

const availableGroupColors = _groupColors();

// own state, so clearing the number field does not hide it
const limitTabs = ref((currentGroup.value.max_tabs ?? 0) > 0);
const onLimitTabsToggle = () => {
	currentGroup.value.max_tabs = limitTabs.value ? 5 : 0;
};

watch(
	() => rulesStore.currentGroup,
	(newGroup) => {
		currentGroup.value = newGroup ?? defaultGroup;
		limitTabs.value = (currentGroup.value.max_tabs ?? 0) > 0;
	}
);

const save = async () => {
	// empty or invalid input means no limit
	currentGroup.value.max_tabs = Math.max(0, Math.floor(Number(currentGroup.value.max_tabs) || 0));
	if (isEditMode.value) {
		await rulesStore.updateGroup(currentGroup.value);
	} else {
		await rulesStore.addGroup(currentGroup.value);
	}

	emitter.emit(GLOBAL_EVENTS.CLOSE_ADD_GROUP_MODAL);

	emitter.emit(GLOBAL_EVENTS.SHOW_TOAST, {
		type: 'success',
		message: 'Saved successfully!',
	});
};

const currentGroupTitleInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
	if (currentGroupTitleInput.value) {
		currentGroupTitleInput.value.focus();
	}
});
</script>
