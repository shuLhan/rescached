import { writable } from "svelte/store"

export const apiEnvironment = "/api/environment"
export const environment = writable({
	NameServers: [],
	HostsBlocks: [],
	HostsFiles: {},
	ZoneFiles: [],
})
export const nanoSeconds = 1000000000

export async function setEnvironment(got) {
	got.PruneDelay = got.PruneDelay / nanoSeconds
	got.PruneThreshold = got.PruneThreshold / nanoSeconds
	for (const [key, value] of Object.entries(got.HostsFiles)) {
		got.HostsFiles[key].Records = []
	}
	environment.set(got)
}
