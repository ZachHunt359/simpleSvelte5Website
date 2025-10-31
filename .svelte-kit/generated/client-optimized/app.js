export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16')
];

export const server_loads = [0,2,3];

export const dictionary = {
		"/": [4],
		"/(authenticated)/admin/invite": [~5,[2,3]],
		"/(authenticated)/admin/logs": [~6,[2,3]],
		"/(authenticated)/admin/migrations": [~7,[2,3]],
		"/(authenticated)/archive": [~8,[2]],
		"/(authenticated)/dashboard": [~9,[2]],
		"/login": [12],
		"/logout": [~13],
		"/register": [~14],
		"/(authenticated)/settings": [10,[2]],
		"/signup": [15],
		"/(authenticated)/upload": [11,[2]],
		"/[chapter]/[panel]": [16]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';