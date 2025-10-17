<script lang="ts">
    import TopNav from '$lib/TopNav.svelte';
    import BottomNav from '$lib/BottomNav.svelte';
    import ComicPanel from '$lib/ComicPanel.svelte';
    import { onMount, tick } from 'svelte';
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    // load data (not used directly in this component)

    let chapters: Array<any> = [];
    let panels: string[] = [];
    let currentChapter: number = 0;
    let currentPanel: number = 0;
    let isDesktop: boolean = false; // For image layout
    let isPointerDesktop: boolean = false; // For nav behavior
    let isSaved: boolean = false;

    let lastScroll = 0;

    let showTopNav = false;
    let showBottomNav = false;
    let prevIsDesktop = isDesktop;

    let navTimeout: ReturnType<typeof setTimeout> | null = null;
    let bottomNavTimeout: ReturnType<typeof setTimeout> | null = null;
    let topNavTimeout: ReturnType<typeof setTimeout> | null = null;

    let showChapterModal = false;

    let userReplies: Array<any> = [];
    let hasUnreadReplies = false;
    let showNotifications = false;

    // Params from the page url
    let chapterParam: string = '';
    let panelParam: string = '';

    $: {
    const params = $page.params;
    chapterParam = params.chapter ?? '';
    panelParam = params.panel ?? '';

        //Find out if current panel is saved in localStorage
        if (typeof window !== 'undefined') {
            isSaved = localStorage.getItem('comic-last-url') === window.location.pathname;
        }
    }

    // Fetch panels from the server
    onMount(() => {
        // Device detection
        updateIsDesktop();
        window.addEventListener('resize', updateIsDesktop);
        window.addEventListener('orientationchange', updateIsDesktop);

        // Fetch panels.json asynchronously
        (async () => {
            const res = await fetch('/panels.json');
            chapters = await res.json();
            //console.log('Fetched chapters:', chapters);
        })();

        // Cleanup listeners on destroy
        return () => {
            window.removeEventListener('resize', updateIsDesktop);
            window.removeEventListener('orientationchange', updateIsDesktop);
        };
    });

    // Build panels for the current chapter with graceful fallback: if mobile[i] is missing use desktop[i], and vice-versa.
    function buildPanelsForChapter(chapterIdx: number, desktopMode: boolean) {
        const chap = chapters[chapterIdx] ?? { desktop: [], mobile: [] };
        const desktopArr = chap.desktop ?? [];
        const mobileArr = chap.mobile ?? [];
        const maxLen = Math.max(desktopArr.length, mobileArr.length);
        const out: string[] = [];
        for (let i = 0; i < maxLen; i++) {
            const d = desktopArr[i] ?? null;
            const m = mobileArr[i] ?? null;
            const chosen = desktopMode ? (d ?? m) : (m ?? d);
            if (chosen) out.push(chosen);
        }
        return out;
    }

    $: panels = chapters.length > 0 ? buildPanelsForChapter(currentChapter, isDesktop) : [];
    //$: console.log('Panels:', panels, 'CurrentPanel:', currentPanel);

    //Clamp currentPanel to valid range, in case Mobile or Desktop is shorter than the other
    $: {
        if (panels.length === 0) {
            currentPanel = 0;
        } else if (currentPanel < 0) {
            currentPanel = 0;
        } else if (currentPanel >= panels.length) {
            currentPanel = panels.length - 1;
        }
    }

    function updateIsDesktop() {
        isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 801px)').matches;
        updateIsPointerDesktop();
        console.log('isDesktop:', isDesktop, ' isPointerDesktop:', isPointerDesktop);
    }
    function updateIsPointerDesktop() {
        isPointerDesktop = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    }

    
    function next() {
        if (currentPanel < (panels?.length ?? 0) - 1) {
            lastScroll = window.scrollY;
            currentPanel += 1;
            blurActiveElement();
            return true;
        }
        if (currentChapter < chapters.length - 1) {
            currentChapter += 1;
            currentPanel = 0;
            lastScroll = 0; // Scroll to top at beginning of new chapter. TODO: beginning of new PAGE, separate from chapter
            blurActiveElement();
            return true;
        }
        return false;
    }
    function prev() {
        if (currentPanel > 0) {
            lastScroll = window.scrollY;
            currentPanel -= 1;
            blurActiveElement();
            return true;
        }
            if (currentChapter > 0) {
            currentChapter -= 1;
            const prevPanels = buildPanelsForChapter(currentChapter, isDesktop);
            currentPanel = prevPanels.length - 1;
            lastScroll = 0; // Scroll to top at beginning of new chapter. TODO: beginning of new PAGE, separate from chapter
            blurActiveElement();
            return true;
        }
        return false;
    }
    function first() {
        if (currentPanel !== 0) {
            currentPanel = 0;
            //console.log('Panels:', panels, 'CurrentPanel:', currentPanel);
            lastScroll = 0; // Scroll to top at beginning of new chapter. TODO: beginning of new PAGE, separate from chapter
            blurActiveElement();
            return true;
        }
        return false;
    }

    function showNav(setter: (v: boolean) => void, timeoutVar: 'bottom' | 'top') {
        setter(true);
        if (timeoutVar === 'bottom') {
            if (bottomNavTimeout) clearTimeout(bottomNavTimeout);
            bottomNavTimeout = setTimeout(() => {
                setter(false);
                const nav = document.querySelector('.bottom-nav.show');
                if (nav && nav.contains(document.activeElement)) {
                    (document.activeElement as HTMLElement).blur();
                }
                //('BottomNav auto-hid');
            }, 5000);
        } else {
            if (topNavTimeout) clearTimeout(topNavTimeout);
            topNavTimeout = setTimeout(() => {
                setter(false);
                const nav = document.querySelector('.top-nav.show');
                if (nav && nav.contains(document.activeElement)) {
                    (document.activeElement as HTMLElement).blur();
                }
                //console.log('TopNav auto-hid');
            }, 5000);
        }
    }

    // Swipe handlers for ComicPanel
    function handleSwipeUp() {
        showNav(v => showBottomNav = v, 'bottom');
    }
    function handleSwipeDown() {
        showNav(v => showTopNav = v, 'top');
    }
    function withNavTimer(fn: () => boolean, nav: 'top' | 'bottom') {
        return () => {
            const didChange = fn();
            if (didChange) {
                showNav(
                    nav === 'bottom' ? v => showBottomNav = v : v => showTopNav = v,
                    nav
                );
            }
        };
    }

        function selectChapter(index: number) {
      currentChapter = index;
      currentPanel = 0;
      lastScroll = 0;
      showChapterModal = false;
    }

    $: isLastPanelOfLastChapter =
        currentChapter === chapters.length - 1 &&
        currentPanel === (panels?.length ?? 0) - 1;

    $: canGoForward = !isLastPanelOfLastChapter;

    //$: console.log('showBottomNav', showBottomNav);

    function blurActiveElement() {
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }

    let prevChapter = currentChapter;
    let prevPanel = currentPanel;

    $: (async () => {
        // Only scroll to top if we just navigated to the first panel of a chapter
        if (currentPanel === 0 && prevPanel !== 0) {
            if (typeof window !== 'undefined') {
                await tick();
                //window.scrollTo(0, 0);
            }
        }
        prevChapter = currentChapter;
        prevPanel = currentPanel;
    })();

    $: if (
        chapters.length > 0 &&
        panels.length > 0 &&
        currentChapter >= 0 &&
        currentPanel >= 0
    ) {
        const chapterSlug = chapters[currentChapter]?.slug;
        const panelFile = panels[currentPanel]?.split('/').pop()?.replace(/\.[^/.]+$/, '');
        const url = `/${chapterSlug}/${panelFile}`;
        if (typeof window !== 'undefined' && window.location?.pathname !== url) {
            goto(url, { replaceState: true, keepFocus: true, noScroll: true });
        }
    }
    // Handle manually entered URL, waiting until chapters and panels are loaded
    let lastParams: { chapter: string | null; panel: string | null } = { chapter: null, panel: null };

    $: if (
        chapters.length > 0 &&
        $page.params.chapter &&
        $page.params.panel &&
        (
            $page.params.chapter !== lastParams.chapter ||
            $page.params.panel !== lastParams.panel
        )
    ) {
        const chapterSlug = $page.params.chapter as string;
        const panelFile = $page.params.panel as string;

        const chapterIdx = chapters.findIndex((c: any) => c.slug === chapterSlug);
        if (chapterIdx !== -1) {
            currentChapter = chapterIdx;
            const newPanels = buildPanelsForChapter(chapterIdx, isDesktop);
            const panelIdx = newPanels.findIndex(p => p.includes(panelFile));
            if (panelIdx !== -1) {
                currentPanel = panelIdx;
            }
        }
        lastParams = { chapter: chapterSlug, panel: panelFile };
    }

    /* $: if (chapters.length > 0 && panels.length > 0) {
        const chapterIdx = chapters.findIndex(c => c.slug === chapterParam);
        if (chapterIdx !== -1) {
            currentChapter = chapterIdx;
            const panelIdx = panels.findIndex(p => p.includes(panelParam));
            if (panelIdx !== -1) {
                currentPanel = panelIdx;
            }
        }
    } */

    function updateUrl() {
        const chapterSlug = chapters[currentChapter]?.slug;
        const panelFile = panels[currentPanel]?.split('/').pop()?.replace(/\.[^/.]+$/, '');
        if (chapterSlug && panelFile) {
            goto(`/${chapterSlug}/${panelFile}`, { replaceState: true, keepFocus: true, noScroll: true });
        }
    }

    function saveLocation() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('comic-last-url', window.location.pathname);
            isSaved = true;
        }
    }

    $: if (typeof window !== 'undefined') {
        // When switching between desktop and mobile, hide navs
        showTopNav = false;
        showBottomNav = false;
    }

    
    $: if (isDesktop !== prevIsDesktop) {
        showTopNav = false;
        showBottomNav = false;
        prevIsDesktop = isDesktop;
    }

    // Inquiry/Prompt handling
    let inquiryText = '';
    let userEmail = '';
    let showInquiryModal = false;
    let showEmailPrompt = false;
    let lastInquiryId: string | null = null;

    async function submitInquiry() {
        const userId = getOrCreateUserId();
        // include the current relative pathname as pageSentFrom so the server records where the inquiry came from
        const pageSentFrom = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        const res = await fetch('/api/inquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: inquiryText, userId, pageSentFrom })
        });
        const data = await res.json();
        if (data.id) {
            lastInquiryId = data.id;
            showInquiryModal = false;
            showEmailPrompt = true;
            inquiryText = '';
        }
    }

    async function submitEmail() {
        if (lastInquiryId && userEmail) {
            const userId = getOrCreateUserId();
            await fetch('/api/inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: lastInquiryId, email: userEmail, userId })
            });
        }
        showEmailPrompt = false;
        userEmail = '';
        lastInquiryId = null;
    }

    function getOrCreateUserId() {
        let userId = localStorage.getItem('comic-user-id');
        if (!userId) {
            userId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
            localStorage.setItem('comic-user-id', userId);
        }
        return userId;
    }

    async function checkForReplies() {
        const userId = getOrCreateUserId();
        const res = await fetch(`/api/inquiries?userId=${encodeURIComponent(userId)}`);
        const allInquiries = await res.json();
        userReplies = allInquiries.filter(
            (inq: any) => inq.reply && !inq.seen
        );
        hasUnreadReplies = userReplies.length > 0;
    }

    // Check for replies on mount and whenever the page is shown
    onMount(checkForReplies);

    async function clearReplies() {
        const userId = getOrCreateUserId();
        const inquiryIds = userReplies.map(r => r.id);
        if (inquiryIds.length === 0) return;

        await fetch('/api/inquiry/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, inquiryIds })
        });

        // Update UI immediately
        userReplies = [];
        hasUnreadReplies = false;
        showNotifications = false;
        // Optionally, re-fetch to update the bell
        await checkForReplies();
    }
    async function clearSingleReply(id: string) {
        const userId = getOrCreateUserId();
        await fetch('/api/inquiry/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, inquiryIds: [id] })
        });

        // Remove from UI immediately
        userReplies = userReplies.filter(r => r.id !== id);
        hasUnreadReplies = userReplies.length > 0;
        if (!hasUnreadReplies) showNotifications = false;
    }

    // close modals on Escape and basic focus-trap for dialogs
    let lastFocused: HTMLElement | null = null;

    function saveFocus() {
        if (typeof document !== 'undefined') {
            const active = document.activeElement as HTMLElement | null;
            if (active) lastFocused = active;
        }
    }

    function restoreFocus() {
        if (lastFocused) {
            try { lastFocused.focus(); } catch (e) {}
            lastFocused = null;
        }
    }

    function trapFocus(container: HTMLElement | null): (() => void) | undefined {
        if (!container) return undefined;
        const focusable = Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
        if (focusable.length > 0) focusable[0].focus();
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Tab') {
                const idx = focusable.indexOf(document.activeElement as HTMLElement);
                if (e.shiftKey) {
                    if (idx === 0) { focusable[focusable.length - 1].focus(); e.preventDefault(); }
                } else {
                    if (idx === focusable.length - 1) { focusable[0].focus(); e.preventDefault(); }
                }
            } else if (e.key === 'Escape') {
                // close all modals on Escape
                showChapterModal = false;
                showInquiryModal = false;
                showEmailPrompt = false;
                showNotifications = false;
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }

    // call when a modal opens to save focus and trap
    let chapterModalEl: HTMLElement | null = null;
    let inquiryModalEl: HTMLElement | null = null;
    let emailModalEl: HTMLElement | null = null;
    let notificationsModalEl: HTMLElement | null = null;

    let chapterRelease: (() => void) | undefined = undefined;
    $: if (showChapterModal) {
        saveFocus();
        chapterRelease = trapFocus(chapterModalEl);
    } else if (chapterRelease) {
        chapterRelease();
        chapterRelease = undefined;
        restoreFocus();
    }

    let inquiryRelease: (() => void) | undefined = undefined;
    $: if (showInquiryModal) {
        saveFocus();
        inquiryRelease = trapFocus(inquiryModalEl);
    } else if (inquiryRelease) {
        inquiryRelease();
        inquiryRelease = undefined;
        restoreFocus();
    }

    let emailRelease: (() => void) | undefined = undefined;
    $: if (showEmailPrompt) {
        saveFocus();
        emailRelease = trapFocus(emailModalEl);
    } else if (emailRelease) {
        emailRelease();
        emailRelease = undefined;
        restoreFocus();
    }

    let notificationsRelease: (() => void) | undefined = undefined;
    $: if (showNotifications) {
        saveFocus();
        notificationsRelease = trapFocus(notificationsModalEl);
    } else if (notificationsRelease) {
        notificationsRelease();
        notificationsRelease = undefined;
        restoreFocus();
    }
</script>

{#if isPointerDesktop}
    <div
        class="nav-hover-zone top"
        on:mouseenter={() => showTopNav = true}
        on:mouseleave={() => showTopNav = false}
        role="presentation"
    ></div>
{/if}

<TopNav
    bind:show={showTopNav}
    isDesktop={isPointerDesktop}
    on:show={e => showTopNav = e.detail}
    onChapterSelect={() => showChapterModal = true}
    chaptersCount={chapters.length}
    canGoForward={currentPanel < panels.length - 1 || currentChapter < chapters.length - 1}
    onInquiry={() => showInquiryModal = true}
    hasUnreadReplies={hasUnreadReplies}
    on:showNotifications={() => showNotifications = true}
/>

<main>
    {#if panels.length > 0}
        <ComicPanel
            {panels}
            {currentPanel}
            {lastScroll}
            onNext={next}
            onSwipeUp={handleSwipeUp}
            onSwipeDown={handleSwipeDown}
        />
    {:else}
        <div class="loading"><p>Loading...</p></div>
    {/if}
</main>

{#if isPointerDesktop}
    <div
        class="nav-hover-zone bottom"
        on:mouseenter={() => showBottomNav = true}
        on:mouseleave={() => showBottomNav = false}
        role="presentation"
    ></div>
{/if}

<BottomNav
        bind:show={showBottomNav}
        isDesktop={isPointerDesktop}
        canGoBack={currentPanel > 0 || currentChapter > 0}
        canGoForward={currentPanel < panels.length - 1 || currentChapter < chapters.length - 1}
        onFirst={withNavTimer(first, 'bottom')}
        onBack={withNavTimer(prev, 'bottom')}
        onForward={withNavTimer(next, 'bottom')}
        onChapterSelect={() => showChapterModal = true}
    chaptersCount={chapters.length}
        isSaved={isSaved}
        onSave={saveLocation}
        on:show={e => showBottomNav = e.detail}
    />


{#if showChapterModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- dev-note: Backdrop is an overlay intentionally implemented as a focusable div with role/aria-label, tabindex and a guarded keydown handler (checks e.target === e.currentTarget). Using a div keeps markup simple while preserving keyboard access. -->
    <div class="chapter-modal-backdrop" on:click={() => showChapterModal = false} role="button" aria-label="Close chapter selector" tabindex="0" on:keydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { showChapterModal = false; } }}>
        <div bind:this={chapterModalEl} class="chapter-modal" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation>
            <h2>Select Chapter</h2>
            <div class="chapter-thumbnails">
                {#each chapters as chapter, idx}
                    <figure class="chapter-thumb">
                        <button type="button" class="chapter-thumb-btn" on:click={() => { selectChapter(idx); showChapterModal = false; }} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selectChapter(idx), showChapterModal = false)} aria-label={`Select chapter ${chapter.title}`}>
                            <img
                                src={chapter.thumbnail}
                                alt={chapter.title}
                            />
                        </button>
                        <figcaption>{chapter.title}</figcaption>
                    </figure>
                {/each}
            </div>
        </div>
    </div>
{/if}

{#if showInquiryModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- dev-note: Backdrop is an overlay intentionally implemented as a focusable div with role/aria-label, tabindex and a guarded keydown handler (checks e.target === e.currentTarget). Using a div keeps markup simple while preserving keyboard access. -->
    <div class="modal-backdrop" on:click={() => showInquiryModal = false} role="button" aria-label="Close inquiry dialog" tabindex="0" on:keydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { showInquiryModal = false; } }}>
        <div bind:this={inquiryModalEl} class="modal" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation>
            <h3>Submit a Question or Statement</h3>
            <textarea bind:value={inquiryText} rows="4" placeholder="Type your question or statement here..."></textarea>
            <div class="modal-actions">
                <button on:click={submitInquiry}>Submit</button>
                <button on:click={() => showInquiryModal = false}>Cancel</button>
            </div>
        </div>
    </div>
{/if}

{#if showEmailPrompt}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- dev-note: Backdrop is an overlay intentionally implemented as a focusable div with role/aria-label, tabindex and a guarded keydown handler (checks e.target === e.currentTarget). Using a div keeps markup simple while preserving keyboard access. -->
    <div class="modal-backdrop" on:click={() => showEmailPrompt = false} role="button" aria-label="Close email prompt" tabindex="0" on:keydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { showEmailPrompt = false; } }}>
        <div bind:this={emailModalEl} class="modal" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation>
            <button class="close-x" on:click={() => showEmailPrompt = false} aria-label="Close">&times;</button>
            <h3>Email Address</h3>
            <input type="email" bind:value={userEmail} placeholder="Enter your email (optional)" />
            <div class="modal-actions">
                <button on:click={submitEmail}>Submit</button>
                <button on:click={() => showEmailPrompt = false}>No thanks</button>
            </div>
        </div>
    </div>
{/if}

{#if showNotifications}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- dev-note: Backdrop is an overlay intentionally implemented as a focusable div with role/aria-label, tabindex and a guarded keydown handler (checks e.target === e.currentTarget). Using a div keeps markup simple while preserving keyboard access. -->
    <div class="modal-backdrop" on:click={() => showNotifications = false} role="button" aria-label="Close notifications" tabindex="0" on:keydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { showNotifications = false; } }}>
        <div bind:this={notificationsModalEl} class="modal" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation>
            <button class="close-x" on:click={() => showNotifications = false} aria-label="Close">&times;</button>
            <h3>Your Replies</h3>
            {#if userReplies.length === 0}
                <p>No new replies.</p>
            {:else}
                <ul>
                    {#each userReplies as reply (reply.id)}
                        <li>
                            <strong>Q:</strong> {reply.message}<br>
                            <strong>A:</strong> {reply.reply}
                            <br>
                            <button class="btn btn-warning btn-xs" on:click={() => clearSingleReply(reply.id)}>Clear</button>
                        </li>
                    {/each}
                </ul>
                <button class="btn btn-warning" on:click={clearReplies}>Clear All</button>
            {/if}
        </div>
    </div>
{/if}

<style>
    main {
        position: relative;
        min-height: 100vh;
        background: black;
        overflow-x: hidden;
        overflow-y: auto;
    }
    .chapter-modal-backdrop, .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .chapter-modal, .modal {
        background: #222;
        padding: 2rem;
        border-radius: 1rem;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        border: 2px solid yellow;
        color: yellow;
    }
     .modal textarea, .modal input {
        width: 100%;
        margin: 1em 0;
        padding: 0.5em;
        border-radius: 0.5em;
        border: 1px solid #444;
        background: #111;
        color: #fff;
    }
    .modal-actions {
        display: flex;
        gap: 1em;
        justify-content: center;
    }
    .close-x {
        position: absolute;
        top: 0.5em;
        right: 0.5em;
        background: none;
        border: none;
        color: #fff;
        font-size: 2em;
        cursor: pointer;
    }
    .chapter-modal h2 {
        text-align: center;
        color: yellow;
        margin-bottom: 1rem;
    }
    .chapter-thumbnails {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
    }
    .chapter-thumb {
        width: 100px;
        cursor: pointer;
        background: #111;
        border-radius: 0.5rem;
        overflow: hidden;
        text-align: center;
        transition: box-shadow 0.2s;
    }
    .chapter-thumb:hover {
        box-shadow: 0 0 0 2px #fff;
    }
    .chapter-thumb img {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
        display: block;
    }
    .chapter-thumb figcaption {
        font-size: 0.8rem;
        color: #fff;
        padding: 0.25rem 0.5rem;
        background: rgba(0,0,0,0.5);
    }
    .nav-hover-zone {
        position: fixed;
        width: 100vw;
        height: 60px;
        z-index: 100;
    }
    .nav-hover-zone.top {
        top: 0;
        left: 0;
    }
    .nav-hover-zone.bottom {
        bottom: 0;
        left: 0;
    }
</style>



