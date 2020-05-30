import { writable } from "svelte/store"

export const apiEnvironment = "/api/environment"
export const environment = writable({})
export const nanoSeconds = 1000000000
