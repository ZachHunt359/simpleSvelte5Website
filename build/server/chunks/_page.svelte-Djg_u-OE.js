import { w as push, I as escape_html, K as attr, M as ensure_array_like, y as pop } from './index2-D9CDRCtq.js';

function _page($$payload, $$props) {
  push();
  let chooserInfo;
  let selectedFiles = [];
  let filesToUpload = [];
  let showAllFiles = false;
  let regenerating = false;
  chooserInfo = selectedFiles.length ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} found, ${filesToUpload.length} new` : "No folder chosen";
  $$payload.out += `<section class="prose upload-section svelte-1s3mh7j"><h1>Upload New Panels</h1> <form class="upload-form svelte-1s3mh7j"><div class="chooser svelte-1s3mh7j"><button type="button" class="btn btn-outline">Choose Folder</button> <span class="chooser-info svelte-1s3mh7j" aria-live="polite">${escape_html(chooserInfo)}</span> <input id="panel-folder-input" type="file" webkitdirectory multiple class="file-input svelte-1s3mh7j" aria-hidden="true"/></div> <div class="actions svelte-1s3mh7j"><button class="btn btn-primary" type="submit"${attr("disabled", !selectedFiles.length, true)}>${escape_html("Upload All")}</button> <button type="button" class="btn btn-secondary" style="margin-left:0.5rem"${attr("disabled", regenerating, true)}>${escape_html("Regenerate panels")}</button></div></form> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (filesToUpload.length) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="file-list-preview svelte-1s3mh7j"><strong>Files to upload (after removing duplicates):</strong> `;
    if (filesToUpload.length <= 6 || showAllFiles) {
      $$payload.out += "<!--[-->";
      const each_array = ensure_array_like(filesToUpload);
      $$payload.out += `<ul class="svelte-1s3mh7j"><!--[-->`;
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let file = each_array[$$index];
        $$payload.out += `<li>${escape_html(file.webkitRelativePath || file.name)}</li>`;
      }
      $$payload.out += `<!--]--></ul>`;
    } else {
      $$payload.out += "<!--[!-->";
      const each_array_1 = ensure_array_like(filesToUpload.slice(0, 3));
      const each_array_2 = ensure_array_like(filesToUpload.slice(-3));
      $$payload.out += `<ul class="svelte-1s3mh7j"><!--[-->`;
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let file = each_array_1[$$index_1];
        $$payload.out += `<li>${escape_html(file.webkitRelativePath || file.name)}</li>`;
      }
      $$payload.out += `<!--]--><li>…</li><!--[-->`;
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let file = each_array_2[$$index_2];
        $$payload.out += `<li>${escape_html(file.webkitRelativePath || file.name)}</li>`;
      }
      $$payload.out += `<!--]--></ul> <button class="btn btn-xs svelte-1s3mh7j">Show all ${escape_html(filesToUpload.length)} files</button>`;
    }
    $$payload.out += `<!--]--></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></section>`;
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Djg_u-OE.js.map
