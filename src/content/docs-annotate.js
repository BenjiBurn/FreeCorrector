// Google Docs draws its text in a <canvas>: there is no text to read in the page.
// Run in the page's own world before Docs loads (manifest: world "MAIN",
// document_start), this asks Docs for its "annotated canvas": an invisible copy
// of each line, with its text, font and place, which docs-field.js reads.
// Docs wants the id of the extension that asks: ours on the Chrome Web Store.
window._docs_annotate_canvas_by_ext = "pbojifdopikeihflcjikofbpfgebahdi";
