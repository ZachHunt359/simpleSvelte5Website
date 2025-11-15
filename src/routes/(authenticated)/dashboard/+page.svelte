<script lang="ts">
    import type { PageData } from "./$types";
    export let data: PageData;

    // Strongly-typed inquiries to avoid 'unknown' errors from PageData
    interface Inquiry {
        id: string;
        userId: string;
        message: string;
        email?: string | null;
        reply?: string | null;
        replyImageUrl?: string | null;
        timestamp: number; // epoch seconds
        pageSentFrom?: string | null;
    }

    // reactive local copy typed as Inquiry[]; keeps the template typesafe
    let inquiries: Inquiry[] = [];
    $: inquiries = (data.inquiries ?? []) as Inquiry[];

    let replyText: Record<string, string> = {};
    let replyImage: Record<string, File | null> = {};
    let replyImageUrl: Record<string, string> = {};
    let uploadingImage: Record<string, boolean> = {};
    let sending: Record<string, boolean> = {};
    let error: Record<string, string> = {};
    let editing: Record<string, boolean> = {};

    function pageSentFromToHref(s?: string | null) {
        if (!s) return '#';
        const trimmed = s.replace(/^\/+/, '').replace(/\/+$/, '');
        return '/' + encodeURI(trimmed);
    }

    function formatDate(ts: number | string) {
        // server returns epoch seconds; handle both numbers and ISO strings
        const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    async function saveReply(id: string, email?: string | null) {
        // mark sending and clear previous error (reassign to trigger Svelte reactivity)
        sending = { ...sending, [id]: true };
        error = { ...error, [id]: '' };

        // Upload image if one was selected
        let imageUrl = replyImageUrl[id] || null;
        if (replyImage[id]) {
            const formData = new FormData();
            formData.append('image', replyImage[id]!);
            
            uploadingImage = { ...uploadingImage, [id]: true };
            const uploadRes = await fetch('/api/inquiry/reply-image', {
                method: 'POST',
                body: formData
            });
            uploadingImage = { ...uploadingImage, [id]: false };

            if (!uploadRes.ok) {
                const uploadResult = await uploadRes.json();
                sending = { ...sending, [id]: false };
                error = { ...error, [id]: uploadResult.error || 'Image upload failed' };
                return;
            }

            const uploadResult = await uploadRes.json();
            imageUrl = uploadResult.url;
        }

        const res = await fetch('/api/inquiry/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, reply: replyText[id], imageUrl })
        });

        const result = await res.json();
        sending = { ...sending, [id]: false };

        if (!result.success) {
            error = { ...error, [id]: result.error || 'Failed to save' };
        } else {
            // Update the reply in the local data (make a shallow copy so Svelte updates)
            inquiries = inquiries.map((inq) => inq.id === id ? { ...inq, reply: replyText[id], replyImageUrl: imageUrl } : inq);
            // mark editing false reactively
            editing = { ...editing, [id]: false };
            // Clear image selection
            replyImage = { ...replyImage, [id]: null };
            replyImageUrl = { ...replyImageUrl, [id]: imageUrl || '' };
        }
    }

    function startEditReply(id: string, currentReply: string | null | undefined) {
        replyText = { ...replyText, [id]: currentReply ?? '' };
        editing = { ...editing, [id]: true };
    }

    function handleImageSelect(id: string, event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            replyImage = { ...replyImage, [id]: input.files[0] };
        }
    }

    function removeImage(id: string) {
        replyImage = { ...replyImage, [id]: null };
        replyImageUrl = { ...replyImageUrl, [id]: '' };
    }

    async function sendEmailAndDelete(id: string, email?: string | null, message?: string, reply?: string | null) {
        if (!email) {
            alert('No email address available for this inquiry.');
            return;
        }

        // If the admin is currently editing a reply (unsaved), prefer that live value.
        const liveReply = replyText[id] !== undefined ? replyText[id] : reply ?? '';

        const res = await fetch('/api/inquiry/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ id, email, message, reply: liveReply })
        });
        const result = await res.json();
            if (result.success) {
                // Remove from UI immediately when send succeeds
                inquiries = inquiries.filter(inq => inq.id !== id);
            } else {
                alert(result.error || "Failed to send email.");
            }
    }

    // File upload handling
    let selectedFiles: File[] = [];
    let filesToUpload: File[] = [];
    let existingFiles: string[] = [];
    let loadingExisting = false;
    let uploading = false;
    let uploadError = '';
    let uploadSuccess = '';
    let showAllFiles = false;

    async function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            selectedFiles = Array.from(input.files);
            uploadError = '';
            uploadSuccess = '';
            loadingExisting = true;

            // Use same-origin API path (don't hardcode port) and send cookies
            const res = await fetch('/api/panels/list', { credentials: 'same-origin' });
            if (!res.ok) {
                loadingExisting = false;
                uploadError = `Failed to fetch existing files: ${res.status}`;
                return;
            }

            existingFiles = await res.json(); // Array of relative paths
            loadingExisting = false;

            // Remove duplicates
            filesToUpload = selectedFiles.filter(file => {
                let relPath = file.webkitRelativePath || file.name;
                // If the path starts with "panels/", strip it
                if (relPath.startsWith('panels/')) {
                    relPath = relPath.slice('panels/'.length);
                }
                return !existingFiles.includes(relPath);
            });
        }
    }

    async function handleUpload() {
        if (!filesToUpload.length) return;
        uploading = true;
        uploadError = '';
        uploadSuccess = '';
        const formData = new FormData();
        for (const file of filesToUpload) {
            let relPath = file.webkitRelativePath || file.name;
            if (relPath.startsWith('panels/')) {
                relPath = relPath.slice('panels/'.length);
            }
            formData.append('files', file, relPath);
            formData.append('relativePaths', relPath);
        }

        // Use same-origin API path and send cookies
        const res = await fetch('/api/panels/upload', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });

        uploading = false;
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            uploadError = `Upload failed: ${res.status} ${text}`;
            return;
        }

        const result = await res.json();
        if (result.success) {
            uploadSuccess = 'Upload complete!';
            selectedFiles = [];
            filesToUpload = [];
        } else {
            uploadError = result.error || 'Upload failed.';
        }
    }
</script>

<!-- header moved to layout -->

<!-- Upload moved to /upload -->

<section class="prose inbox">
    <h1>Inbox</h1>
    {#if !data.inquiries || data.inquiries.length === 0}
        <p>No inquiries yet.</p>
    {:else}
        <div class="inbox-list">
            {#each inquiries as inquiry (inquiry.id)}
                <div class="inquiry-card">
                    <div class="inquiry-header">
                        <span class="user-id">User: <code>{inquiry.userId}</code></span>
                        {#if inquiry.pageSentFrom}
                            <span class="from">from: <a href={pageSentFromToHref(inquiry.pageSentFrom)} target="_blank" rel="noopener noreferrer"><code>{inquiry.pageSentFrom}</code></a></span>
                        {/if}
                        <span class="timestamp">{formatDate(inquiry.timestamp)}</span>
                    </div>
                    <div class="inquiry-meta">
                        <span>
                            {#if inquiry.email}
                                <strong>Email:</strong> {inquiry.email}
                            {/if}
                        </span>
                    </div>
                    <div class="inquiry-message">
                        <strong>Q:</strong> {inquiry.message}
                    </div>
                    {#if inquiry.reply && !editing[inquiry.id]}
                        <div class="inquiry-reply">
                            <strong>Reply:</strong> {inquiry.reply}
                            {#if inquiry.replyImageUrl}
                                <div class="reply-image-container">
                                    <img src={inquiry.replyImageUrl} alt="Reply attachment" class="reply-image" />
                                </div>
                            {/if}
                            <button class="btn btn-secondary btn-xs" style="margin-left:1em"
                                on:click={() => startEditReply(inquiry.id, inquiry.reply)}>
                                Edit Reply
                            </button>
                            {#if inquiry.email}
                                <button class="btn btn-success btn-xs" style="margin-left:1em"
                                    on:click={() => sendEmailAndDelete(inquiry.id, inquiry.email, inquiry.message, inquiry.reply)}>
                                    Send Email
                                </button>
                            {/if}
                        </div>
                        
                    {:else}
                        <div class="inquiry-reply-form">
                            <textarea
                                bind:value={replyText[inquiry.id]}
                                rows="2"
                                placeholder="Type your reply..."
                                class="input input-bordered w-full"
                            ></textarea>
                            
                            <div class="image-upload-section">
                                <label for="image-{inquiry.id}" class="image-upload-label">
                                    📎 Attach Image (optional)
                                </label>
                                <input
                                    id="image-{inquiry.id}"
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    on:change={(e) => handleImageSelect(inquiry.id, e)}
                                    class="file-input"
                                />
                                {#if replyImage[inquiry.id]}
                                    <div class="selected-image">
                                        <span>✓ {replyImage[inquiry.id]?.name}</span>
                                        <button type="button" class="btn btn-xs" on:click={() => removeImage(inquiry.id)}>Remove</button>
                                    </div>
                                {/if}
                                {#if inquiry.replyImageUrl && !replyImage[inquiry.id]}
                                    <div class="existing-image">
                                        <img src={inquiry.replyImageUrl} alt="Current attachment" class="reply-image-preview" />
                                        <button type="button" class="btn btn-xs" on:click={() => removeImage(inquiry.id)}>Remove Image</button>
                                    </div>
                                {/if}
                            </div>

                            <button
                                class="btn btn-primary"
                                on:click={() => saveReply(inquiry.id, inquiry.email)}
                                disabled={sending[inquiry.id] || uploadingImage[inquiry.id]}
                            >
                                {uploadingImage[inquiry.id] ? 'Uploading Image...' : sending[inquiry.id] ? 'Saving...' : 'Save Reply'}
                            </button>
                            {#if error[inquiry.id]}
                                <span class="error">{error[inquiry.id]}</span>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</section>

<style>
.inbox {
    margin: auto;
    max-width: 60%;
    text-align: center;
    overflow-wrap: break-word;
}
.inbox-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 2rem;
    
}
.inquiry-card {
    border: 2px solid #ffd700;
    border-radius: 1rem;
    background: #181818;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    transition: box-shadow 0.2s;
}
.inquiry-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
}
.inquiry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.95em;
    margin-bottom: 0.5em;
    color: #ffd700;
}
.user-id code {
    background: #222;
    color: #ffd700;
    padding: 0.1em 0.4em;
    border-radius: 0.3em;
    font-size: 0.95em;
}
.timestamp {
    font-size: 0.95em;
    color: #aaa;
}
.inquiry-message {
    margin-bottom: 0.5em;
    font-size: 1.1em;
}
.inquiry-meta {
    font-size: 0.95em;
    margin-bottom: 0.5em;
    color: #ccc;
}
.inquiry-reply {
    background: #222;
    border-left: 4px solid #ffd700;
    padding: 0.5em 1em;
    margin-top: 0.5em;
    border-radius: 0.5em;
    color: #ffd700;
}
.inquiry-reply-form {
    margin-top: 0.5em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
}
.error {
    color: #ff4d4f;
    font-size: 0.95em;
}
.image-upload-section {
    margin: 0.5em 0;
    padding: 0.5em;
    background: #222;
    border-radius: 0.5em;
}
.image-upload-label {
    display: block;
    font-size: 0.9em;
    color: #ffd700;
    margin-bottom: 0.5em;
}
.file-input {
    font-size: 0.9em;
    color: #ccc;
}
.selected-image, .existing-image {
    margin-top: 0.5em;
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-size: 0.9em;
    color: #ccc;
}
.reply-image-container {
    margin: 0.5em 0;
}
.reply-image {
    max-width: 400px;
    max-height: 300px;
    border-radius: 0.5em;
    display: block;
}
.reply-image-preview {
    max-width: 200px;
    max-height: 150px;
    border-radius: 0.5em;
}
</style>
