chrome.commands.onCommand.addListener((command) => {
    if (command === "search"){
        main();
    }
})
let stuff = {};
let index = null;
let json;

;(async () => {
    //Sometimes throws an error if you don't do this, no idea why.
    json = (await fetch("top.csv").then(res => res.text())).split("\n").map(i => i.split(",")[1]);
    json = json.filter(i => i && typeof i === "string");
})();

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {    
    if (request.type === "search") {
        console.log("Searching", request);
        let items = [];
        if (request.searchType === "combined") {
            let results = Object.keys(request.searchTypes)
                .filter((i) => i !== "combined")
                .map((key) => [key, stuff[key]])
                .map(([key, val]) => [
                    ...val.map((item) => ({ ...item, type: key })),
                ])
                .flat();
            items = results;
        } else {
            items = stuff[request.searchType];
        }
        if (request.searchType === "downloads"){
            items = stuff.downloads.map(i => ({
                type: "downloads",
                title: i.filename.split("/").slice(-1)[0], 
                url: i.finalUrl, 
                icon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--ph" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256"><path d="M81.758 114.254a6 6 0 0 1 8.484-8.486L122 137.518V40a6 6 0 0 1 12 0v97.517l31.758-31.75a6 6 0 0 1 8.484 8.487l-42 41.99c-.099.098-.214.168-.318.259c-.082.07-.166.139-.252.206a5.933 5.933 0 0 1-.777.516l-.098.052a5.948 5.948 0 0 1-1.012.424h-.001a5.47 5.47 0 0 1-3.568 0a5.948 5.948 0 0 1-1.013-.424l-.098-.052a5.933 5.933 0 0 1-.777-.516a5.934 5.934 0 0 1-.252-.206c-.104-.09-.22-.161-.318-.26zM216 146a6 6 0 0 0-6 6v56a2.003 2.003 0 0 1-2 2H48a2.003 2.003 0 0 1-2-2v-56a6 6 0 0 0-12 0v56a14.016 14.016 0 0 0 14 14h160a14.016 14.016 0 0 0 14-14v-56a6 6 0 0 0-6-6z" fill="currentColor"></path></svg>`,
                ...i,//Arbitrary keys are fine
            }))
        }
        if (request.query === "") {
            return sendResponse(items.slice(0, 30));
        }
        const fuse = new Fuse(items, {
            includeScore: true,
            keys: ["url", "title"],
            threshold: request.query.length > 10 ? .5 : .4,
        });
        let out = fuse
            .search(request.query)
            .sort((a, b) => a.score - b.score)
            .map((i) => i.item)
        console.log("Done", out);
        if (request.query.length > 5){
            let item = json.find(i => i.includes(request.query.trim().toLowerCase()));
            if (item){
                out = [{
                    title: `Suggested website`,
                    url: `https://${item}`,
                    highlight: true,
                }, ...out];
                console.log(out[0]);
            }
        }
        out = (unique(out, (a, b) => {
            try {
            a = new URL(a.url);
            b = new URL(b.url);
            } catch(_){
                //Keep errored ones
                return false;
            }
            return (a.hostname === b.hostname && a.pathname === b.pathname);
        }));
        console.log("Unique: ", out);
        return sendResponse(out.slice(0, 30));
    } else if (request.type === "itemClicked"){
        console.log(request.item);
        let type = request.item.type || request.searchType;
        if (request.item.highlight){
            //Just go to the URL instead of trying to open a tab
            type = "history";
        };
        if (type === "tabs"){
            chrome.windows.update(request.item.windowId, {focused: true});
            chrome.tabs.update(request.item.id, {active: true});
        } else if (["bookmarks", "history"].includes(type)){
            chrome.tabs.create({url: request.item.url});
        };
        return sendResponse({});
    } else if (request.type === "quickAnswer"){
        return sendResponse([]);
        fetch(`https://apis.explosionscratc.repl.co/quick-answer?q=${encodeURIComponent(request.query)}`)
            .then(res => res.json())
            .then((quickAnswer) => {
                console.log({quickAnswer});
                if (!quickAnswer.error){
                    let r = [{
                        highlight: true, 
                        subtitle: "Quick answer from Wolfram Alpha AI", 
                        title: quickAnswer.text, 
                        icon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--ph" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256"><path d="M176.002 232a8 8 0 0 1-8 8h-80a8 8 0 1 1 0-16h80a8 8 0 0 1 8 8zm40-128a87.543 87.543 0 0 1-33.641 69.208a16.23 16.23 0 0 0-6.359 12.768V192a16.018 16.018 0 0 1-16 16h-64a16.018 16.018 0 0 1-16-16v-6.031a16.018 16.018 0 0 0-6.229-12.66a87.576 87.576 0 0 1-33.77-68.814c-.262-47.662 38.264-87.35 85.882-88.47A88.001 88.001 0 0 1 216.002 104zm-16 0a72 72 0 0 0-73.74-71.98c-38.956.918-70.473 33.39-70.259 72.387a71.658 71.658 0 0 0 27.637 56.307a31.922 31.922 0 0 1 12.362 25.255V192h64v-6.024a32.138 32.138 0 0 1 12.468-25.345A71.636 71.636 0 0 0 200.002 104zm-16.788-9.396a55.85 55.85 0 0 0-45.764-45.708a8 8 0 1 0-2.655 15.777a39.84 39.84 0 0 1 32.644 32.604a8.003 8.003 0 0 0 7.878 6.664a8.103 8.103 0 0 0 1.347-.113a8 8 0 0 0 6.55-9.224z" fill="currentColor"></path></svg>`
                    }];
                    console.log({r, sendResponse});
                    sendResponse(r);
                } else {sendResponse([])};
            });
        //Makes it async (I think)
        return true;
    }
  }
);


async function main(){
    let vue = await fetch("vue.js").then(res => res.text());
    let math = await fetch("math.js").then(res => res.text());
    let script = await fetch("main.js").then(res => res.text());
    let {id: tab} = await new Promise(res => chrome.tabs.query({currentWindow: true, active : true}, ([t]) => res(t)));
    stuff = {
        tabs: await new Promise(res => chrome.tabs.query({}, res)),
         bookmarks: await getBookmarks(),
         history: await new Promise(res => chrome.history.search({text: ""}, res)),
        downloads: (await new Promise(res => chrome.downloads.search({}, res))).filter(i => i.filename),
    }
    let code = interpolate({
            style: await fetch("popup_style.css").then(res => res.text()),
            popupHTML: await fetch("popup.html").then(res => res.text()),
            ...stuff,
            items: {
                combined: [
                    ...stuff.tabs.slice(0, 10).map(i => ({...i, type: "tabs"})),
                    ...stuff.history.slice(0, 10).map(i => ({...i, type: "bookmarks"})),
                ],
                bookmarks: stuff.bookmarks.slice(0, 30),
                history: stuff.history.slice(0, 30),
            },
            itemsLength: {downloads: stuff.downloads.length, combined: Object.values(stuff).flat().length, history: stuff.history.length, bookmarks: stuff.bookmarks.length, tabs: stuff.tabs.length},
        }, [
         vue,
         math,
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
    chrome.tabs.executeScript(tab, {
        code,
    });
    index = Fuse.createIndex(["url", "title"], Object.values(stuff).flat());
    console.log({index});
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

function unique(array, compareObjects) {
    return array.reduce((r, o) => {
        if (!r.some(compareObjects.bind(null, o))) {
            r.push(o);
        }
        return r;
    }, []);
}