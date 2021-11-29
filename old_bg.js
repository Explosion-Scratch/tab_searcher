chrome.commands.onCommand.addListener((command) => {
    if (command === "search"){
        main();
    }
})

async function main(){
    let vue = await fetch("vue.js").then(res => res.text());
    let fuse = await fetch("fuse.js").then(res => res.text());
    let script = await fetch("main.js").then(res => res.text());
    let {id: tab} = await new Promise(res => chrome.tabs.query({currentWindow: true, active : true}, ([t]) => res(t)));
    let code = interpolate({
            style: await fetch("popup_style.css").then(res => res.text()),
            popupHTML: await fetch("popup.html").then(res => res.text()),
            tabs: await new Promise(res => chrome.tabs.query({}, res)),
            bookmarks: await getBookmarks(),
            history: await new Promise(res => chrome.history.search({text: ""}, res)),
            $fuse: fuse,
        }, [
         vue,
         fuse,
         () => {
            window.Vue = Vue;
            let s = document.createElement("style");
            s.innerHTML = style;
            let meta = document.createElement("meta");
            meta.setAttribute("charset", "utf-8");
            (document.head || document.body || document.documentElement).appendChild(meta);
            (document.head || document.body || document.documentElement).appendChild(s);
            let popup = document.createElement("div");
            popup.id = "popup_app";
            popup.innerHTML = popupHTML,
            (document.body || document.documentElement).appendChild(popup);
        },
        script,
    ]);
    console.log(script.slice(0, 30));
    chrome.tabs.executeScript(tab, {
        code,
    })
}

async function getBookmarks(){
    return new Promise(res => {
        let bookmarks = [];
        chrome.bookmarks.getTree(function(itemTree){
            itemTree.forEach(function(item){
                processNode(item);
            });
            res(bookmarks.filter(b => {
                try {new URL(b.url)} catch(_){
                    return false;
                }
                return b.url.startsWith("http");
            }));
        });

        function processNode(node) {
            // recursively process child nodes
            if(node.children) {
                node.children.forEach(function(child) { processNode(child); });
            }

            // print leaf nodes URLs to console
            bookmarks.push({url: node.url, title: node.title});
        }
    });
}


function interpolate(vars, scripts){
    scripts = scripts.map(i => {
        if (typeof i === "function"){
            return `;(${i.toString()})();`;
        }
        return i;
    })
    return `
;((${Object.keys(vars).join(", ")}) => {
 
${scripts.join("\n\n")}

})(${Object.values(vars).map((i) => {
    if (typeof i === "function"){
        return i.toString();
    } else {return JSON.stringify(i)}
}).join(", ")});
`.trim();
}