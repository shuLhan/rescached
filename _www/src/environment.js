import { writable } from "svelte/store"

export const apiEnvironment = "/api/environment"
export const environment = writable({
	NameServers: [],
	HostsBlocks: [],
	HostsFiles: [],
})
export const nanoSeconds = 1000000000
