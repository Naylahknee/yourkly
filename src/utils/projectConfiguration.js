export const PROJECT_TYPES=[
 {id:'website',label:'Website',description:'A site people visit in a browser.'},
 {id:'app',label:'App',description:'A web or mobile application.'},
 {id:'writing',label:'Writing project',description:'Documents, research, or a book.'},
 {id:'empty',label:'Start empty',description:'No starter structure.'},
 {id:'other',label:'Something else',description:'Use simple, safe defaults.'},
]

export const IGNORE_DEFAULTS={
 website:`node_modules/
dist/
build/
.env
.env.*
.DS_Store
.vscode/
`,
 app:`node_modules/
dist/
build/
coverage/
.env
.env.*
.DS_Store
.vscode/
`,
 writing:`.DS_Store
~$*
*.tmp
`,
 empty:`.DS_Store
.env
.env.*
`,
 other:`.DS_Store
.env
.env.*
`,
}

export function aboutContent(name,description,type){
 return `# ${name}\n\n${description||'A project managed with Yourkly.'}\n\n## What this is\n\n${PROJECT_TYPES.find(t=>t.id===type)?.description||'Project files and notes.'}\n`
}

export function starterFiles(type){
 if(type==='website') return [{path:'index.html',content:'<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My project</title>\n</head>\n<body>\n  <main>Start building here.</main>\n</body>\n</html>\n'}]
 if(type==='writing') return [{path:'draft.md',content:'# Draft\n\nStart writing here.\n'}]
 return []
}

export function mitLicense(owner='Project owner'){
 const year=new Date().getFullYear()
 return `MIT License\n\nCopyright (c) ${year} ${owner}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n`
}
