# Comprehensive Upload Interface & Scheduling System Plan

## Project Context
**Date Created:** October 30, 2025  
**Project:** Simple Svelte 5 Webcomic Website  
**Current Status:** Basic upload functionality exists, needs enhancement for production use  

## Current Folder Structure Analysis
```
static/panels/
└── chapter-1/
    ├── chapter-1.thumb.jpg (chapter thumbnail)
    ├── desktop/ (Story1.png → Story9gif.png - 9 files)
    └── mobile/ (Story1.png, Story2.png, Story3.png, Story5.png, Story7.png, Story8.png - 6 files)
```

**Key Observations:**
- Clean chapter-based organization
- Desktop/mobile device separation
- Some mobile panels missing (Story4gif, Story6gif, Story9gif)
- Naming convention: Story[N].png or Story[N]gif.png

## Required Features (User-Specified)

### Core Upload Interface
1. **Compact "Upload Summary" bar** - file counts, size, ETA, inferred chapters
2. **Validation and conflict report** - duplicates, missing files, structure issues  
3. **Chapter structure and "upload plan" diff** - collapsible tree with thumbnails and reordering
4. **Per-file metadata side panel** - title, alt text, content rating, tags (optional)
5. **Progress and controls** - per-file and overall progress with pause/resume
6. **Conflict resolution dialog** - handle naming collisions intelligently
7. **Post-upload "next steps" strip** - success counts, regenerate panels, view chapter
8. **Dark mode theming** - consistency with admin styling
9. **Sticky footer** - keep actions visible while scrolling

### Scheduling System (Critical New Feature)
- **Date/time picker** with timezone awareness
- **Admin timezone preferences** stored in localStorage
- **IP-based timezone detection** as fallback
- **Chapter-level** and **individual panel-level** scheduling
- **Content visibility control** - hide unpublished content from readers
- **Admin preview mode** - allow admins to see scheduled content

## Technical Architecture

### Frontend Stack
- **Uppy.js Dashboard** with SvelteKit integration (`@uppy/svelte`)
- **Flatpickr** for datetime selection with timezone support
- **Tailwind CSS** with dark theme support
- **Native browser APIs** for timezone detection (`Intl.DateTimeFormat`)

### Backend Requirements
- **Database schema extensions** for scheduling
- **Publication middleware** to filter content by publish dates
- **Background job system** for automated publishing (optional)
- **Admin preview routes** to bypass publication filters

## Implementation Phases

### Phase 1: Core Upload Interface (Priority 1)
**Dependencies to install:**
```bash
npm install @uppy/core @uppy/dashboard @uppy/svelte @uppy/thumbnail-generator @uppy/xhr-upload
npm install @tailwindcss/forms  # For consistent form styling
```

**Components to build:**
1. Enhanced upload summary bar with chapter detection
2. File validation system (types, sizes, naming patterns)
3. Thumbnail gallery with drag-and-drop reordering
4. Chapter structure visualization (tree view)
5. Conflict resolution UI

**Key Features:**
- Dark theme: `theme: 'dark'`
- Progress details: `showProgressDetails: true`
- Thumbnail generation: `waitForThumbnailsBeforeUpload: true`
- Custom validation rules for webcomic structure

### Phase 2: Scheduling System (Priority 2)
**Dependencies to install:**
```bash
npm install flatpickr
```

**Database Schema Updates:**
```sql
-- Extend existing panels table
ALTER TABLE panels ADD COLUMN publish_date DATETIME DEFAULT NULL;
ALTER TABLE panels ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE panels ADD COLUMN scheduled_by VARCHAR(255);
ALTER TABLE panels ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- New chapters table for chapter-level scheduling
CREATE TABLE chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(255),
  publish_date DATETIME DEFAULT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  thumbnail_path VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Timezone Handling Strategy:**
```javascript
// Client-side timezone detection
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
localStorage.setItem('adminTimezone', userTimezone);

// Flatpickr configuration
flatpickr('#publish-datetime', {
  enableTime: true,
  dateFormat: 'Y-m-d H:i',
  time_24hr: true,
  defaultDate: new Date(),
  onChange: (selectedDates) => {
    const utcDate = new Date(selectedDates[0].getTime() - selectedDates[0].getTimezoneOffset() * 60000);
    scheduleData.publishDate = utcDate.toISOString();
    scheduleData.timezone = userTimezone;
  }
});
```

### Phase 3: Advanced Features (Priority 3)
1. **Batch scheduling operations** - apply publish dates to multiple files/chapters
2. **Background upload resumability** - handle network interruptions
3. **Auto-regeneration** - trigger panels.json rebuild after successful uploads
4. **Publishing queue** - background job to publish content at scheduled times
5. **Notification system** - alerts for failed uploads, publishing events

## API Routes to Modify/Create

### Upload Enhancement
- `POST /api/admin/upload` - Enhanced with scheduling data
- `GET /api/admin/upload/validate` - Pre-upload validation
- `POST /api/admin/upload/resolve-conflicts` - Handle naming conflicts

### Scheduling System
- `POST /api/admin/schedule` - Set publish dates for panels/chapters
- `GET /api/admin/scheduled` - List scheduled content
- `PUT /api/admin/publish/:id` - Manually publish content
- `DELETE /api/admin/unpublish/:id` - Unpublish content

### Content Filtering
- **Middleware enhancement** for all panel/chapter routes to filter by publish dates
- **Admin preview routes** with `?preview=true` parameter to bypass filters

## Key Design Patterns

### Upload Summary Component
```svelte
<UploadSummary 
  files={selectedFiles}
  conflicts={detectedConflicts}
  chapters={inferredChapters}
  totalSize={calculatedSize}
  estimatedTime={uploadETA} 
/>
```

### Chapter Structure Tree
```svelte
<ChapterTree>
  {#each chapters as chapter}
    <ChapterNode bind:chapter>
      <DeviceFolder type="desktop" files={chapter.desktop} />
      <DeviceFolder type="mobile" files={chapter.mobile} />
    </ChapterNode>
  {/each}
</ChapterTree>
```

### Scheduling Interface
```svelte
<SchedulePanel>
  <TimezoneSelector bind:timezone={adminTimezone} />
  <DateTimePicker bind:publishDate />
  <ScheduleOptions 
    allowChapterLevel={true}
    allowPanelLevel={true}
  />
</SchedulePanel>
```

## Reference Links & Resources

### Libraries Documentation
- **Uppy.js Dashboard:** https://uppy.io/docs/dashboard/
- **Uppy Svelte Integration:** https://uppy.io/docs/svelte/
- **Flatpickr:** https://flatpickr.js.org/
- **Intl.DateTimeFormat:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

### UI Pattern References
- **Uppy Status Bar:** https://uppy.io/docs/status-bar/ (progress, details)
- **Thumbnail Generator:** https://uppy.io/docs/thumbnail-generator/
- **Cloudinary Upload Widget:** https://cloudinary.com/documentation/upload_widget (validation patterns)
- **Dropzone.js:** https://www.dropzone.dev/ (drag-drop patterns)

### Timezone Handling
- **Temporal API** (future): For advanced date/time operations
- **Browser timezone detection:** `Intl.DateTimeFormat().resolvedOptions().timeZone`
- **IP geolocation APIs:** For fallback timezone detection (optional)

## Success Criteria

### Phase 1 Complete When:
- [ ] Admins can drag-drop multiple files with instant feedback
- [ ] System detects chapter structure and conflicts before upload
- [ ] Thumbnail gallery shows correct panel order with drag-reorder capability
- [ ] Upload progress is granular and pauseable
- [ ] Dark theme matches existing admin interface

### Phase 2 Complete When:
- [ ] Admins can schedule individual panels or entire chapters
- [ ] Timezone handling works correctly across different admin locations
- [ ] Unpublished content is hidden from readers but visible to admins
- [ ] Database stores scheduling information reliably

### Phase 3 Complete When:
- [ ] Batch operations work smoothly for multiple chapters
- [ ] System handles network interruptions gracefully
- [ ] Publishing automation works without manual intervention
- [ ] Error handling and notifications provide clear feedback

## Notes

### Current System Status (as of Oct 30, 2025)
- ✅ Basic deployment infrastructure working (PM2, multi-env, git pipeline)
- ✅ File upload functionality exists but needs enhancement
- ✅ Database schema supports basic panels
- ⚠️ No scheduling system exists
- ⚠️ No advanced upload validation
- ⚠️ No content publication controls

### Potential Challenges
1. **File size handling** - Large image batches may need chunked uploads
2. **Browser compatibility** - Ensure drag-drop works across browsers
3. **Timezone edge cases** - Daylight saving time transitions
4. **Database migrations** - Plan for zero-downtime schema updates
5. **Upload reliability** - Network interruption recovery

### Future Enhancements (Beyond Current Scope)
- **Multi-admin collaboration** - Track who scheduled what
- **Content versioning** - Allow panel updates without losing scheduling
- **Advanced scheduling** - Recurring publications, seasonal schedules
- **Analytics integration** - Track upload patterns and publishing success
- **Mobile admin interface** - Touch-friendly upload on tablets

---

**Next Steps:** Choose which phase to implement first and begin with component architecture planning.