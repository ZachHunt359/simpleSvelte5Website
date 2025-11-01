const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","inquiries.json","panels/chapter-1/mobile/Gina Falls.gif","panels/chapter-1/mobile/Gina Pulls.gif","panels/chapter-1/mobile/Jose Jog.gif","panels/chapter-1/mobile/Spread 20.1.a.png","panels/chapter-1/mobile/Spread 20.1.b.png","panels/chapter-1/mobile/Spread 20.1.c.png","panels/chapter-1/mobile/Spread 20.2.a.png","panels/chapter-1/mobile/Spread 20.2.b.png","panels/chapter-1/mobile/Spread 20.2.c.png","panels/chapter-1/mobile/Spread 20.3.png","panels/chapter-1/mobile/Spread 20.4.png","panels/chapter-1/mobile/Spread 20.5.png","panels/chapter-1/mobile/Spread 20.6.a.png","panels/chapter-1/mobile/Spread 20.6.b.png","panels/chapter-1/mobile/Spread1.1.a.png","panels/chapter-1/mobile/Spread1.2.a.png","panels/chapter-1/mobile/Spread1.2.b.png","panels/chapter-1/mobile/Spread1.2.c.png","panels/chapter-1/mobile/Spread1.3.a.png","panels/chapter-1/mobile/Spread1.3.b.png","panels/chapter-1/mobile/Spread1.4.a.png","panels/chapter-1/mobile/Spread1.4.b.png","panels/chapter-1/mobile/Spread1.4.c.png","panels/chapter-1/mobile/Spread10.1.png","panels/chapter-1/mobile/Spread10.2.png","panels/chapter-1/mobile/Spread10.3.png","panels/chapter-1/mobile/Spread10.4.a.png","panels/chapter-1/mobile/Spread10.4.b.png","panels/chapter-1/mobile/Spread10.4.png","panels/chapter-1/mobile/Spread11.1.png","panels/chapter-1/mobile/Spread11.2.a.png","panels/chapter-1/mobile/Spread11.2.b.png","panels/chapter-1/mobile/Spread11.3.png","panels/chapter-1/mobile/Spread11.4.png","panels/chapter-1/mobile/Spread11.5.a.png","panels/chapter-1/mobile/Spread11.5.b.png","panels/chapter-1/mobile/Spread11.5.c.png","panels/chapter-1/mobile/Spread11.5.d.png","panels/chapter-1/mobile/Spread11.6.a.png","panels/chapter-1/mobile/Spread11.6.b.png","panels/chapter-1/mobile/Spread11.6.c.png","panels/chapter-1/mobile/Spread11.7.a.png","panels/chapter-1/mobile/Spread11.7.b.png","panels/chapter-1/mobile/Spread11.7.c.png","panels/chapter-1/mobile/Spread11.7.d.png","panels/chapter-1/mobile/Spread12.1.a.png","panels/chapter-1/mobile/Spread12.1.b.png","panels/chapter-1/mobile/Spread12.1.c.png","panels/chapter-1/mobile/Spread12.1.d.png","panels/chapter-1/mobile/Spread12.2.png","panels/chapter-1/mobile/Spread12.3.png","panels/chapter-1/mobile/Spread12.4.png","panels/chapter-1/mobile/Spread13.1.png","panels/chapter-1/mobile/Spread13.10.png","panels/chapter-1/mobile/Spread13.11.a.png","panels/chapter-1/mobile/Spread13.11.b.png","panels/chapter-1/mobile/Spread13.2.png","panels/chapter-1/mobile/Spread13.3.png","panels/chapter-1/mobile/Spread13.4.png","panels/chapter-1/mobile/Spread13.5.png","panels/chapter-1/mobile/Spread13.6.png","panels/chapter-1/mobile/Spread13.7.a.png","panels/chapter-1/mobile/Spread13.7.b.png","panels/chapter-1/mobile/Spread13.8.png","panels/chapter-1/mobile/Spread13.9.png","panels/chapter-1/mobile/Spread14.1.png","panels/chapter-1/mobile/Spread14.10.a.png","panels/chapter-1/mobile/Spread14.10.b.png","panels/chapter-1/mobile/Spread14.2.a.png","panels/chapter-1/mobile/Spread14.2.b.png","panels/chapter-1/mobile/Spread14.2.c.png","panels/chapter-1/mobile/Spread14.3.png","panels/chapter-1/mobile/Spread14.4.png","panels/chapter-1/mobile/Spread14.5.png","panels/chapter-1/mobile/Spread14.6.png","panels/chapter-1/mobile/Spread14.7.png","panels/chapter-1/mobile/Spread14.8.png","panels/chapter-1/mobile/Spread14.9.png","panels/chapter-1/mobile/Spread15.1.png","panels/chapter-1/mobile/Spread15.2.png","panels/chapter-1/mobile/Spread15.3.png","panels/chapter-1/mobile/Spread15.4.png","panels/chapter-1/mobile/Spread15.5.a.png","panels/chapter-1/mobile/Spread15.5.b.png","panels/chapter-1/mobile/Spread15.6.a.png","panels/chapter-1/mobile/Spread15.6.b.png","panels/chapter-1/mobile/Spread15.7.a.png","panels/chapter-1/mobile/Spread15.7.b.png","panels/chapter-1/mobile/Spread15.7.c.png","panels/chapter-1/mobile/Spread15.8.a.png","panels/chapter-1/mobile/Spread15.8.b.png","panels/chapter-1/mobile/Spread16.1.png","panels/chapter-1/mobile/Spread16.2.png","panels/chapter-1/mobile/Spread16.3.png","panels/chapter-1/mobile/Spread16.4.a.png","panels/chapter-1/mobile/Spread16.4.b.png","panels/chapter-1/mobile/Spread16.5.png","panels/chapter-1/mobile/Spread16.6.png","panels/chapter-1/mobile/Spread17.1.png","panels/chapter-1/mobile/Spread17.2.png","panels/chapter-1/mobile/Spread17.3.png","panels/chapter-1/mobile/Spread17.4.png","panels/chapter-1/mobile/Spread18.1.a.png","panels/chapter-1/mobile/Spread18.1.b.png","panels/chapter-1/mobile/Spread18.2.a.png","panels/chapter-1/mobile/Spread18.2.b.png","panels/chapter-1/mobile/Spread18.2.c.png","panels/chapter-1/mobile/Spread18.3.png","panels/chapter-1/mobile/Spread19.1.png","panels/chapter-1/mobile/Spread19.2.png","panels/chapter-1/mobile/Spread19.3.a.png","panels/chapter-1/mobile/Spread19.3.b.png","panels/chapter-1/mobile/Spread19.4.png","panels/chapter-1/mobile/Spread19.5.png","panels/chapter-1/mobile/Spread19.6.png","panels/chapter-1/mobile/Spread19.7.png","panels/chapter-1/mobile/Spread19.8.png","panels/chapter-1/mobile/Spread2.1.png","panels/chapter-1/mobile/Spread2.2a.png","panels/chapter-1/mobile/Spread2.2b.png","panels/chapter-1/mobile/Spread2.3.gif","panels/chapter-1/mobile/Spread21.1.png","panels/chapter-1/mobile/Spread21.2.png","panels/chapter-1/mobile/Spread21.3.a.png","panels/chapter-1/mobile/Spread21.3.b.png","panels/chapter-1/mobile/Spread21.3.c.png","panels/chapter-1/mobile/Spread21.3.d.png","panels/chapter-1/mobile/Spread21.3.e.png","panels/chapter-1/mobile/Spread21.3.f.png","panels/chapter-1/mobile/Spread21.4.png","panels/chapter-1/mobile/Spread21.5.png","panels/chapter-1/mobile/Spread22.1.png","panels/chapter-1/mobile/Spread22.2.png","panels/chapter-1/mobile/Spread22.3.a.png","panels/chapter-1/mobile/Spread22.3.b.png","panels/chapter-1/mobile/Spread22.3.c.png","panels/chapter-1/mobile/Spread22.4.png","panels/chapter-1/mobile/Spread22.5.png","panels/chapter-1/mobile/Spread22.6.a.png","panels/chapter-1/mobile/Spread22.7.png","panels/chapter-1/mobile/Spread22.8.a.png","panels/chapter-1/mobile/Spread22.8.b.png","panels/chapter-1/mobile/Spread22.9.png","panels/chapter-1/mobile/Spread23.1.a.png","panels/chapter-1/mobile/Spread23.1.b.png","panels/chapter-1/mobile/Spread23.1.c.png","panels/chapter-1/mobile/Spread23.2.png","panels/chapter-1/mobile/Spread23.3.a.png","panels/chapter-1/mobile/Spread23.3.b.png","panels/chapter-1/mobile/Spread23.3.c.png","panels/chapter-1/mobile/Spread23.3.d.png","panels/chapter-1/mobile/Spread23.3.e.png","panels/chapter-1/mobile/Spread24.1.a.png","panels/chapter-1/mobile/Spread24.1.b.png","panels/chapter-1/mobile/Spread24.1.c.png","panels/chapter-1/mobile/Spread24.2.a.png","panels/chapter-1/mobile/Spread24.2.b.png","panels/chapter-1/mobile/Spread24.2.c.png","panels/chapter-1/mobile/Spread24.2.d.png","panels/chapter-1/mobile/Spread24.2.e.png","panels/chapter-1/mobile/Spread24.2.f.png","panels/chapter-1/mobile/Spread24.3.png","panels/chapter-1/mobile/Spread24.4.a.png","panels/chapter-1/mobile/Spread24.4.b.png","panels/chapter-1/mobile/Spread24.4.c.png","panels/chapter-1/mobile/Spread25.1.b.png","panels/chapter-1/mobile/Spread25.1.png","panels/chapter-1/mobile/Spread25.2.b.png","panels/chapter-1/mobile/Spread25.2.c.png","panels/chapter-1/mobile/Spread25.2.d.png","panels/chapter-1/mobile/Spread25.2.e.png","panels/chapter-1/mobile/Spread25.2.png","panels/chapter-1/mobile/Spread25.3.png","panels/chapter-1/mobile/Spread25.4.png","panels/chapter-1/mobile/Spread25.5.b.png","panels/chapter-1/mobile/Spread25.5.c.png","panels/chapter-1/mobile/Spread25.5.png","panels/chapter-1/mobile/Spread26.1.png","panels/chapter-1/mobile/Spread26.2.png","panels/chapter-1/mobile/Spread26.3.png","panels/chapter-1/mobile/Spread26.4.a.png","panels/chapter-1/mobile/Spread26.4.b.png","panels/chapter-1/mobile/Spread26.4.c.png","panels/chapter-1/mobile/Spread26.4.d.png","panels/chapter-1/mobile/Spread26.4.e.png","panels/chapter-1/mobile/Spread26.4.f.png","panels/chapter-1/mobile/Spread26.5.png","panels/chapter-1/mobile/Spread27.1.png","panels/chapter-1/mobile/Spread27.10.png","panels/chapter-1/mobile/Spread27.2.png","panels/chapter-1/mobile/Spread27.3.png","panels/chapter-1/mobile/Spread27.4.png","panels/chapter-1/mobile/Spread27.5.png","panels/chapter-1/mobile/Spread27.6.a.png","panels/chapter-1/mobile/Spread27.6.b.png","panels/chapter-1/mobile/Spread27.6.c.png","panels/chapter-1/mobile/Spread27.7.png","panels/chapter-1/mobile/Spread27.8.png","panels/chapter-1/mobile/Spread27.9.png","panels/chapter-1/mobile/Spread3.1.png","panels/chapter-1/mobile/Spread3.2.png","panels/chapter-1/mobile/Spread3.3.png","panels/chapter-1/mobile/Spread3.4.png","panels/chapter-1/mobile/Spread3.5.gif","panels/chapter-1/mobile/Spread4.1.a.png","panels/chapter-1/mobile/Spread4.1.b.png","panels/chapter-1/mobile/Spread4.1.c.png","panels/chapter-1/mobile/Spread4.1.d.gif","panels/chapter-1/mobile/Spread4.2.png","panels/chapter-1/mobile/Spread4.3.gif","panels/chapter-1/mobile/Spread4.4.png","panels/chapter-1/mobile/Spread4.5.png","panels/chapter-1/mobile/Spread4.6.png","panels/chapter-1/mobile/Spread4.7.png","panels/chapter-1/mobile/Spread5.1.a.png","panels/chapter-1/mobile/Spread5.1.b.gif","panels/chapter-1/mobile/Spread5.1.c.png","panels/chapter-1/mobile/Spread5.1.d.png","panels/chapter-1/mobile/Spread5.1.e.png","panels/chapter-1/mobile/Spread5.2.png","panels/chapter-1/mobile/Spread5.3.png","panels/chapter-1/mobile/Spread5.4.a.png","panels/chapter-1/mobile/Spread5.4.b.png","panels/chapter-1/mobile/Spread5.4.c.png","panels/chapter-1/mobile/Spread5.5.png","panels/chapter-1/mobile/Spread5.6.png","panels/chapter-1/mobile/Spread6.1.a.png","panels/chapter-1/mobile/Spread6.1.b.png","panels/chapter-1/mobile/Spread6.1.c.png","panels/chapter-1/mobile/Spread6.2.png","panels/chapter-1/mobile/Spread6.3.a.png","panels/chapter-1/mobile/Spread6.3.b.png","panels/chapter-1/mobile/Spread6.4.png","panels/chapter-1/mobile/Spread6.5.png","panels/chapter-1/mobile/Spread6.6.a.png","panels/chapter-1/mobile/Spread6.6.b.png","panels/chapter-1/mobile/Spread6.7.png","panels/chapter-1/mobile/Spread6.8.a.png","panels/chapter-1/mobile/Spread6.8.b.png","panels/chapter-1/mobile/Spread6.8.c.png","panels/chapter-1/mobile/Spread6.9.png","panels/chapter-1/mobile/Spread7.1.a.png","panels/chapter-1/mobile/Spread7.1.b.png","panels/chapter-1/mobile/Spread7.2.a.png","panels/chapter-1/mobile/Spread7.2.b.png","panels/chapter-1/mobile/Spread7.2.c.png","panels/chapter-1/mobile/Spread7.3.b.png","panels/chapter-1/mobile/Spread7.3.png","panels/chapter-1/mobile/Spread7.4.png","panels/chapter-1/mobile/Spread7.5.png","panels/chapter-1/mobile/Spread7.6.png","panels/chapter-1/mobile/Spread8.1.a.png","panels/chapter-1/mobile/Spread8.1.b.png","panels/chapter-1/mobile/Spread8.2.png","panels/chapter-1/mobile/Spread8.3.png","panels/chapter-1/mobile/Spread8.4.png","panels/chapter-1/mobile/Spread8.5.png","panels/chapter-1/mobile/Spread8.6.png","panels/chapter-1/mobile/Spread8.7.png","panels/chapter-1/mobile/Spread8.8.a.png","panels/chapter-1/mobile/Spread8.8.b.png","panels/chapter-1/mobile/Spread9.1.png","panels/chapter-1/mobile/Spread9.2.a.png","panels/chapter-1/mobile/Spread9.2.b.png","panels/chapter-1/mobile/Spread9.2.c.png","panels/chapter-1/mobile/Spread9.2.d.png","panels/chapter-1/mobile/Spread9.3.png","panels/_order.json","panels.json"]),
	mimeTypes: {".png":"image/png",".json":"application/json",".gif":"image/gif"},
	_: {
		client: {start:"_app/immutable/entry/start.CTB9PiHa.js",app:"_app/immutable/entry/app.DUpES-jt.js",imports:["_app/immutable/entry/start.CTB9PiHa.js","_app/immutable/chunks/B7g7WC2C.js","_app/immutable/chunks/BD0fH4m7.js","_app/immutable/chunks/6mdTfa_J.js","_app/immutable/chunks/BxjWtLbs.js","_app/immutable/chunks/DfaTXenS.js","_app/immutable/chunks/BvQulXsu.js","_app/immutable/entry/app.DUpES-jt.js","_app/immutable/chunks/D2gFui-Z.js","_app/immutable/chunks/6mdTfa_J.js","_app/immutable/chunks/BxjWtLbs.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/BD0fH4m7.js","_app/immutable/chunks/DfaTXenS.js","_app/immutable/chunks/C_PWTEtt.js","_app/immutable/chunks/DySmmO0B.js","_app/immutable/chunks/o6VXWnCK.js","_app/immutable/chunks/BvQulXsu.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CKce08t2.js')),
			__memo(() => import('./chunks/1-Ddp7hudT.js')),
			__memo(() => import('./chunks/2-d78EJafh.js')),
			__memo(() => import('./chunks/3-edBqKkAV.js')),
			__memo(() => import('./chunks/4-DxJF-j6Z.js')),
			__memo(() => import('./chunks/5-DOc36Muv.js')),
			__memo(() => import('./chunks/6-DkpN6vkR.js')),
			__memo(() => import('./chunks/7-D0YCsv7R.js')),
			__memo(() => import('./chunks/8-D4s0UEdD.js')),
			__memo(() => import('./chunks/9-LfsVED-G.js')),
			__memo(() => import('./chunks/10-CC2UNqMD.js')),
			__memo(() => import('./chunks/11-B2bR_kLc.js')),
			__memo(() => import('./chunks/12-Bo3_XxdU.js')),
			__memo(() => import('./chunks/13-BI0Hjk70.js')),
			__memo(() => import('./chunks/14-DGvf-sg9.js')),
			__memo(() => import('./chunks/15-ETD4m5xc.js')),
			__memo(() => import('./chunks/16-bk0wlziL.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-DbgRo149.js'))
			},
			{
				id: "/api/admin/invites",
				pattern: /^\/api\/admin\/invites\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DAhxvDp5.js'))
			},
			{
				id: "/api/admin/invite",
				pattern: /^\/api\/admin\/invite\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DKJg9p9C.js'))
			},
			{
				id: "/api/admin/invite/delete",
				pattern: /^\/api\/admin\/invite\/delete\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-qOqQP-Ic.js'))
			},
			{
				id: "/api/admin/logs",
				pattern: /^\/api\/admin\/logs\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B6rjAkTh.js'))
			},
			{
				id: "/api/admin/panels/heartbeat",
				pattern: /^\/api\/admin\/panels\/heartbeat\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DKIjp5w7.js'))
			},
			{
				id: "/api/admin/panels/order",
				pattern: /^\/api\/admin\/panels\/order\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-COh8HzzP.js'))
			},
			{
				id: "/api/admin/panels/regenerate",
				pattern: /^\/api\/admin\/panels\/regenerate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D61b9RkV.js'))
			},
			{
				id: "/api/inquiries",
				pattern: /^\/api\/inquiries\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DBfmr8QJ.js'))
			},
			{
				id: "/api/inquiry",
				pattern: /^\/api\/inquiry\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CQ_AA7ZG.js'))
			},
			{
				id: "/api/inquiry/archive",
				pattern: /^\/api\/inquiry\/archive\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Tc_5M3wa.js'))
			},
			{
				id: "/api/inquiry/clear",
				pattern: /^\/api\/inquiry\/clear\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BIbyjnsN.js'))
			},
			{
				id: "/api/inquiry/delete-old",
				pattern: /^\/api\/inquiry\/delete-old\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DX8i-yYr.js'))
			},
			{
				id: "/api/inquiry/delete",
				pattern: /^\/api\/inquiry\/delete\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-P-emP99Q.js'))
			},
			{
				id: "/api/inquiry/reply",
				pattern: /^\/api\/inquiry\/reply\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-hvMaXtk9.js'))
			},
			{
				id: "/api/inquiry/resend",
				pattern: /^\/api\/inquiry\/resend\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Wj8-gmzH.js'))
			},
			{
				id: "/api/inquiry/seen",
				pattern: /^\/api\/inquiry\/seen\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bajw34SQ.js'))
			},
			{
				id: "/api/inquiry/send-email",
				pattern: /^\/api\/inquiry\/send-email\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-O6jpxIyD.js'))
			},
			{
				id: "/api/me",
				pattern: /^\/api\/me\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CuGmPh52.js'))
			},
			{
				id: "/api/panels/list",
				pattern: /^\/api\/panels\/list\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CJcA9SYz.js'))
			},
			{
				id: "/api/panels/upload",
				pattern: /^\/api\/panels\/upload\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-N5XF2Okd.js'))
			},
			{
				id: "/api/panels/upload/finish",
				pattern: /^\/api\/panels\/upload\/finish\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DlzmYuNZ.js'))
			},
			{
				id: "/api/whoami",
				pattern: /^\/api\/whoami\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-NPwknlx4.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-BM8vPnWW.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-WHjOQcZ0.js'))
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
