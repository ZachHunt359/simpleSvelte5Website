const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","inquiries.json","panels/chapter-1/chapter-1.thumb.jpg","panels/chapter-1/desktop/Story1.png","panels/chapter-1/desktop/Story2.png","panels/chapter-1/desktop/Story3.png","panels/chapter-1/desktop/Story4gif.png","panels/chapter-1/desktop/Story5.png","panels/chapter-1/desktop/Story6gif.png","panels/chapter-1/desktop/Story7.png","panels/chapter-1/desktop/Story8.png","panels/chapter-1/desktop/Story9gif.png","panels/chapter-1/mobile/Story1.png","panels/chapter-1/mobile/Story2.png","panels/chapter-1/mobile/Story3.png","panels/chapter-1/mobile/Story4.webm","panels/chapter-1/mobile/Story5.png","panels/chapter-1/mobile/Story6.webm","panels/chapter-1/mobile/Story7.png","panels/chapter-1/mobile/Story8.png","panels/chapter-1/mobile/Story9.webm","panels.json"]),
	mimeTypes: {".png":"image/png",".json":"application/json",".jpg":"image/jpeg",".webm":"video/webm"},
	_: {
		client: {start:"_app/immutable/entry/start.Nj6eVYqP.js",app:"_app/immutable/entry/app.DVqygO7a.js",imports:["_app/immutable/entry/start.Nj6eVYqP.js","_app/immutable/chunks/CgXUoIGW.js","_app/immutable/chunks/DzUKuoAr.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/EyRQZfWT.js","_app/immutable/chunks/Ujwe2Jf3.js","_app/immutable/entry/app.DVqygO7a.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/DzUKuoAr.js","_app/immutable/chunks/EyRQZfWT.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/CZiUtPWM.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-Brn0bH5Y.js')),
			__memo(() => import('./chunks/1-Cu3yG602.js')),
			__memo(() => import('./chunks/2-Dz-8NITR.js')),
			__memo(() => import('./chunks/3-W4amSKk6.js')),
			__memo(() => import('./chunks/4-D9zlShGN.js')),
			__memo(() => import('./chunks/5-BO6N77gE.js')),
			__memo(() => import('./chunks/6-7COmIPlQ.js')),
			__memo(() => import('./chunks/7-Cw7Pl4NH.js')),
			__memo(() => import('./chunks/8-BLntcYJ2.js')),
			__memo(() => import('./chunks/9-DobhLLJp.js')),
			__memo(() => import('./chunks/10-BfU-6TBL.js')),
			__memo(() => import('./chunks/11-B8BeFed6.js')),
			__memo(() => import('./chunks/12-eyCfEpYk.js')),
			__memo(() => import('./chunks/13-DPeN61R_.js')),
			__memo(() => import('./chunks/14-BZrzO1VO.js')),
			__memo(() => import('./chunks/15-DncvxGxl.js')),
			__memo(() => import('./chunks/16-Dy7uG1_M.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/(authenticated)/admin/invite",
				pattern: /^\/admin\/invite\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(authenticated)/admin/logs",
				pattern: /^\/admin\/logs\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(authenticated)/admin/migrations",
				pattern: /^\/admin\/migrations\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 7 },
				endpoint: __memo(() => import('./chunks/_server.ts-Cf2h9iQQ.js'))
			},
			{
				id: "/api/admin/invites",
				pattern: /^\/api\/admin\/invites\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BSc8OCVj.js'))
			},
			{
				id: "/api/admin/invite",
				pattern: /^\/api\/admin\/invite\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BlJGFKHk.js'))
			},
			{
				id: "/api/admin/invite/delete",
				pattern: /^\/api\/admin\/invite\/delete\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Btaoffiw.js'))
			},
			{
				id: "/api/admin/logs",
				pattern: /^\/api\/admin\/logs\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CO8Wz_bj.js'))
			},
			{
				id: "/api/admin/panels/regenerate",
				pattern: /^\/api\/admin\/panels\/regenerate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DNd9MJCK.js'))
			},
			{
				id: "/api/inquiries",
				pattern: /^\/api\/inquiries\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DdXDf-T4.js'))
			},
			{
				id: "/api/inquiry",
				pattern: /^\/api\/inquiry\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CzzojBsE.js'))
			},
			{
				id: "/api/inquiry/archive",
				pattern: /^\/api\/inquiry\/archive\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DFIPhnFu.js'))
			},
			{
				id: "/api/inquiry/clear",
				pattern: /^\/api\/inquiry\/clear\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-GrIpuyqB.js'))
			},
			{
				id: "/api/inquiry/delete-old",
				pattern: /^\/api\/inquiry\/delete-old\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-1EFtEYsN.js'))
			},
			{
				id: "/api/inquiry/delete",
				pattern: /^\/api\/inquiry\/delete\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Dtf2nBLG.js'))
			},
			{
				id: "/api/inquiry/reply",
				pattern: /^\/api\/inquiry\/reply\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cks9rWEU.js'))
			},
			{
				id: "/api/inquiry/resend",
				pattern: /^\/api\/inquiry\/resend\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DO5Sewgz.js'))
			},
			{
				id: "/api/inquiry/seen",
				pattern: /^\/api\/inquiry\/seen\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CsjayAig.js'))
			},
			{
				id: "/api/inquiry/send-email",
				pattern: /^\/api\/inquiry\/send-email\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-gxUal1nc.js'))
			},
			{
				id: "/api/me",
				pattern: /^\/api\/me\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CrHN1wJb.js'))
			},
			{
				id: "/api/panels/list",
				pattern: /^\/api\/panels\/list\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bk0RPhGY.js'))
			},
			{
				id: "/api/panels/upload",
				pattern: /^\/api\/panels\/upload\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DSTptxwk.js'))
			},
			{
				id: "/api/whoami",
				pattern: /^\/api\/whoami\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BXzK6Ovg.js'))
			},
			{
				id: "/(authenticated)/archive",
				pattern: /^\/archive\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(authenticated)/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/endpoints/api/whoami",
				pattern: /^\/endpoints\/api\/whoami\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CmdpCJCW.js'))
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/panels.json",
				pattern: /^\/panels\.json\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BcxUfjT-.js'))
			},
			{
				id: "/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/(authenticated)/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/signup",
				pattern: /^\/signup\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/(authenticated)/upload",
				pattern: /^\/upload\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/[chapter]/[panel]",
				pattern: /^\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"chapter","optional":false,"rest":false,"chained":false},{"name":"panel","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 16 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
