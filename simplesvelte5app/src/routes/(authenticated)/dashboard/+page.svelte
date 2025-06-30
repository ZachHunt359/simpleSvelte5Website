<script lang="ts">
    import type { PageData } from "./$types";
    export let data: PageData;

    let replyText: Record<string, string> = {};
    let sending: Record<string, boolean> = {};
    let error: Record<string, string> = {};
    let editing: Record<string, boolean> = {};

    function formatDate(iso: string) {
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    async function saveReply(id: string, email: string | null) {
        sending[id] = true;
        error[id] = '';
        const res = await fetch('/api/inquiry/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, reply: replyText[id] })
        });
        const result = await res.json();
        sending[id] = false;
        if (!result.success) error[id] = result.error || 'Failed to save';
        else {
            // Update the reply in the local data
            const inquiry = data.inquiries.find((inq) => inq.id === id);
            if (inquiry) {
                inquiry.reply = replyText[id];
            }
            editing[id] = false;
        }
    }

    function startEditReply(id: string, currentReply: string) {
        replyText[id] = currentReply;
        editing[id] = true;
    }

    async function sendEmailAndDelete(id: string, email: string, message: string, reply: string) {
        const res = await fetch('/api/inquiry/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, email, message, reply })
        });
        const result = await res.json();
        if (result.success) {
            // Remove from UI immediately
            data.inquiries = data.inquiries.filter(inq => inq.id !== id);
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
            // Fetch existing files from the server
            const res = await fetch('http://localhost:5174/api/panels/list');
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
        const res = await fetch('http://localhost:5174/api/panels/upload', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        uploading = false;
        if (result.success) {
            uploadSuccess = 'Upload complete!';
            selectedFiles = [];
            filesToUpload = [];
        } else {
            uploadError = result.error || 'Upload failed.';
        }
    }
</script>

<div class="dashboard-header">
    <span class="username">{data.user?.email}</span>
    <form method="POST" action="?/logout" style="display:inline;">
        <button class="btn btn-error btn-sm" type="submit">Logout</button>
    </form>
</div>

<section class="prose upload-section">
    <h2>Upload New Panels</h2>
    <form on:submit|preventDefault={handleUpload}>
        <input
            type="file"
            webkitdirectory
            directory
            multiple
            on:change={handleFileSelect}
            class="input input-bordered"
        />
        <button class="btn btn-primary" type="submit" disabled={uploading || !selectedFiles.length}>
            {uploading ? 'Uploading...' : 'Upload All'}
        </button>
    </form>
    {#if uploadError}
        <div class="error">{uploadError}</div>
    {/if}
    {#if uploadSuccess}
        <div class="success">{uploadSuccess}</div>
    {/if}
    {#if filesToUpload.length}
        <div class="file-list-preview">
            <strong>Files to upload (after removing duplicates):</strong>
            {#if filesToUpload.length <= 6 || showAllFiles}
                <ul>
                    {#each filesToUpload as file}
                        <li>{file.webkitRelativePath || file.name}</li>
                    {/each}
                </ul>
                {#if filesToUpload.length > 6 && showAllFiles}
                    <button class="btn btn-xs" on:click={() => showAllFiles = false}>Show less</button>
                {/if}
            {:else}
                <ul>
                    {#each filesToUpload.slice(0, 3) as file}
                        <li>{file.webkitRelativePath || file.name}</li>
                    {/each}
                    <li>…</li>
                    {#each filesToUpload.slice(-3) as file}
                        <li>{file.webkitRelativePath || file.name}</li>
                    {/each}
                </ul>
                <button class="btn btn-xs" on:click={() => showAllFiles = true}>Show all {filesToUpload.length} files</button>
            {/if}
        </div>
    {/if}
</section>

<section class="prose inbox">
    <h1>Inbox</h1>
    {#if !data.inquiries || data.inquiries.length === 0}
        <p>No inquiries yet.</p>
    {:else}
        <div class="inbox-list">
            {#each data.inquiries as inquiry (inquiry.id)}
                <div class="inquiry-card">
                    <div class="inquiry-header">
                        <span class="user-id">User: <code>{inquiry.userId}</code></span>
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
                            <button
                                class="btn btn-primary"
                                on:click={() => saveReply(inquiry.id, inquiry.email)}
                                disabled={sending[inquiry.id]}
                            >
                                {sending[inquiry.id] ? 'Saving...' : 'Save Reply'}
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
.dashboard-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 1em;
    margin-bottom: 1.5em;
}
.username {
    font-weight: bold;
    color: #ffd700;
}
.file-list-preview ul {
    margin: 0.5em 0 0.5em 1.5em;
    padding: 0;
    font-size: 0.95em;
    text-align: left;
}
.file-list-preview button {
    margin-top: 0.5em;
}
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
</style>
