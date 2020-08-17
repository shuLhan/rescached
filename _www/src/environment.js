import { writable } from "svelte/store"

export const apiEnvironment = "/api/environment"
export const environment = writable({
	NameServers: [],
	HostsBlocks: [],
	HostsFiles: [],
	MasterFiles: [],
})
export const nanoSeconds = 1000000000

export async function setEnvironment(got) {
	got.PruneDelay = got.PruneDelay / nanoSeconds
	got.PruneThreshold = got.PruneThreshold / nanoSeconds
	for (let x = 0; x < got.HostsFiles.length; x++) {
		got.HostsFiles[x].hosts = []
	}
	environment.set(got)
}
