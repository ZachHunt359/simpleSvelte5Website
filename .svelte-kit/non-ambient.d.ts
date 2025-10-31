
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/(authenticated)" | "/" | "/(authenticated)/admin" | "/(authenticated)/admin/invite" | "/(authenticated)/admin/logs" | "/(authenticated)/admin/migrations" | "/api" | "/api/admin" | "/api/admin/invites" | "/api/admin/invite" | "/api/admin/invite/delete" | "/api/admin/logs" | "/api/admin/panels" | "/api/admin/panels/regenerate" | "/api/inquiries" | "/api/inquiry" | "/api/inquiry/archive" | "/api/inquiry/clear" | "/api/inquiry/delete-old" | "/api/inquiry/delete" | "/api/inquiry/reply" | "/api/inquiry/resend" | "/api/inquiry/seen" | "/api/inquiry/send-email" | "/api/me" | "/api/panels" | "/api/panels/list" | "/api/panels/upload" | "/api/whoami" | "/(authenticated)/archive" | "/(authenticated)/dashboard" | "/endpoints" | "/endpoints/api" | "/endpoints/api/whoami" | "/login" | "/logout" | "/panels.json" | "/register" | "/(authenticated)/settings" | "/signup" | "/(authenticated)/upload" | "/[chapter]" | "/[chapter]/[panel]";
		RouteParams(): {
			"/[chapter]": { chapter: string };
			"/[chapter]/[panel]": { chapter: string; panel: string }
		};
		LayoutParams(): {
			"/(authenticated)": Record<string, never>;
			"/": { chapter?: string; panel?: string };
			"/(authenticated)/admin": Record<string, never>;
			"/(authenticated)/admin/invite": Record<string, never>;
			"/(authenticated)/admin/logs": Record<string, never>;
			"/(authenticated)/admin/migrations": Record<string, never>;
			"/api": Record<string, never>;
			"/api/admin": Record<string, never>;
			"/api/admin/invites": Record<string, never>;
			"/api/admin/invite": Record<string, never>;
			"/api/admin/invite/delete": Record<string, never>;
			"/api/admin/logs": Record<string, never>;
			"/api/admin/panels": Record<string, never>;
			"/api/admin/panels/regenerate": Record<string, never>;
			"/api/inquiries": Record<string, never>;
			"/api/inquiry": Record<string, never>;
			"/api/inquiry/archive": Record<string, never>;
			"/api/inquiry/clear": Record<string, never>;
			"/api/inquiry/delete-old": Record<string, never>;
			"/api/inquiry/delete": Record<string, never>;
			"/api/inquiry/reply": Record<string, never>;
			"/api/inquiry/resend": Record<string, never>;
			"/api/inquiry/seen": Record<string, never>;
			"/api/inquiry/send-email": Record<string, never>;
			"/api/me": Record<string, never>;
			"/api/panels": Record<string, never>;
			"/api/panels/list": Record<string, never>;
			"/api/panels/upload": Record<string, never>;
			"/api/whoami": Record<string, never>;
			"/(authenticated)/archive": Record<string, never>;
			"/(authenticated)/dashboard": Record<string, never>;
			"/endpoints": Record<string, never>;
			"/endpoints/api": Record<string, never>;
			"/endpoints/api/whoami": Record<string, never>;
			"/login": Record<string, never>;
			"/logout": Record<string, never>;
			"/panels.json": Record<string, never>;
			"/register": Record<string, never>;
			"/(authenticated)/settings": Record<string, never>;
			"/signup": Record<string, never>;
			"/(authenticated)/upload": Record<string, never>;
			"/[chapter]": { chapter: string; panel?: string };
			"/[chapter]/[panel]": { chapter: string; panel: string }
		};
		Pathname(): "/" | "/admin" | "/admin/" | "/admin/invite" | "/admin/invite/" | "/admin/logs" | "/admin/logs/" | "/admin/migrations" | "/admin/migrations/" | "/api" | "/api/" | "/api/admin" | "/api/admin/" | "/api/admin/invites" | "/api/admin/invites/" | "/api/admin/invite" | "/api/admin/invite/" | "/api/admin/invite/delete" | "/api/admin/invite/delete/" | "/api/admin/logs" | "/api/admin/logs/" | "/api/admin/panels" | "/api/admin/panels/" | "/api/admin/panels/regenerate" | "/api/admin/panels/regenerate/" | "/api/inquiries" | "/api/inquiries/" | "/api/inquiry" | "/api/inquiry/" | "/api/inquiry/archive" | "/api/inquiry/archive/" | "/api/inquiry/clear" | "/api/inquiry/clear/" | "/api/inquiry/delete-old" | "/api/inquiry/delete-old/" | "/api/inquiry/delete" | "/api/inquiry/delete/" | "/api/inquiry/reply" | "/api/inquiry/reply/" | "/api/inquiry/resend" | "/api/inquiry/resend/" | "/api/inquiry/seen" | "/api/inquiry/seen/" | "/api/inquiry/send-email" | "/api/inquiry/send-email/" | "/api/me" | "/api/me/" | "/api/panels" | "/api/panels/" | "/api/panels/list" | "/api/panels/list/" | "/api/panels/upload" | "/api/panels/upload/" | "/api/whoami" | "/api/whoami/" | "/archive" | "/archive/" | "/dashboard" | "/dashboard/" | "/endpoints" | "/endpoints/" | "/endpoints/api" | "/endpoints/api/" | "/endpoints/api/whoami" | "/endpoints/api/whoami/" | "/login" | "/login/" | "/logout" | "/logout/" | "/panels.json" | "/panels.json/" | "/register" | "/register/" | "/settings" | "/settings/" | "/signup" | "/signup/" | "/upload" | "/upload/" | `/${string}` & {} | `/${string}/` & {} | `/${string}/${string}` & {} | `/${string}/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/inquiries.json" | "/panels/chapter-1/chapter-1.thumb.jpg" | "/panels/chapter-1/desktop/Story1.png" | "/panels/chapter-1/desktop/Story2.png" | "/panels/chapter-1/desktop/Story3.png" | "/panels/chapter-1/desktop/Story4gif.png" | "/panels/chapter-1/desktop/Story5.png" | "/panels/chapter-1/desktop/Story6gif.png" | "/panels/chapter-1/desktop/Story7.png" | "/panels/chapter-1/desktop/Story8.png" | "/panels/chapter-1/desktop/Story9gif.png" | "/panels/chapter-1/mobile/Story1.png" | "/panels/chapter-1/mobile/Story2.png" | "/panels/chapter-1/mobile/Story3.png" | "/panels/chapter-1/mobile/Story4.webm" | "/panels/chapter-1/mobile/Story5.png" | "/panels/chapter-1/mobile/Story6.webm" | "/panels/chapter-1/mobile/Story7.png" | "/panels/chapter-1/mobile/Story8.png" | "/panels/chapter-1/mobile/Story9.webm" | "/panels.json" | string & {};
	}
}