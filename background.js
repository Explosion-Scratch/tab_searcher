//background.js
/* 
FILES:
- background.js: This script, searches everything and sends message to the active tab when the extension is activated
- fuse.js: An open source fuzzy searching library with 13k stars: https://github.com/krisk/Fuse
- vue.js: Vue.js: https://github.com/vuejs/vue An extremely popular UI framework
- math.js: An open source math evaluator https://github.com/josdejong/mathjs
- top_sites.csv: A list of the top 1 million websites (from alexa top sites database)
- popup.html: The HTML content of the popup, injected into the tab at runtime.
- main.js: The main script that runs in the tab when the extension is activated. 
- popup_style.css: The CSS for the popup
*/
chrome.commands.onCommand.addListener((command) => {
    if (command === "search"){
        main();
    }
})

chrome.browserAction.onClicked.addListener((tab) => {
    //We already know the tab
    //TODO: Check that this isn't the tab ID but the actual tab
    main(tab);
})

//Declare variables
let stuff = {};
let index = null;
let json;

//Semicolon at the beginning is good luck
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
        //Unique by compare function
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
        //Limit it to 30 items to keep things responsive.
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
        } else if (request.item.url || request.item._url){
            // item._url is used when the URL is present but not shown
            chrome.tabs.create({url: request.item.url || request.item._url});
        } 
        return sendResponse({});
    } else if (request.type === "quickAnswer"){
        ;(async () => {
            try {
                //Get google quick answers!
                let a = await answer(request.query);
                if (a){
                    //sendResponse sends an array of items to display, this is then handled by main.js
                    sendResponse([{
                        highlight: true, 
                        subtitle: "Quick result from google", 
                        title: a, 
                        icon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--ph" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256"><path d="M176.002 232a8 8 0 0 1-8 8h-80a8 8 0 1 1 0-16h80a8 8 0 0 1 8 8zm40-128a87.543 87.543 0 0 1-33.641 69.208a16.23 16.23 0 0 0-6.359 12.768V192a16.018 16.018 0 0 1-16 16h-64a16.018 16.018 0 0 1-16-16v-6.031a16.018 16.018 0 0 0-6.229-12.66a87.576 87.576 0 0 1-33.77-68.814c-.262-47.662 38.264-87.35 85.882-88.47A88.001 88.001 0 0 1 216.002 104zm-16 0a72 72 0 0 0-73.74-71.98c-38.956.918-70.473 33.39-70.259 72.387a71.658 71.658 0 0 0 27.637 56.307a31.922 31.922 0 0 1 12.362 25.255V192h64v-6.024a32.138 32.138 0 0 1 12.468-25.345A71.636 71.636 0 0 0 200.002 104zm-16.788-9.396a55.85 55.85 0 0 0-45.764-45.708a8 8 0 1 0-2.655 15.777a39.84 39.84 0 0 1 32.644 32.604a8.003 8.003 0 0 0 7.878 6.664a8.103 8.103 0 0 0 1.347-.113a8 8 0 0 0 6.55-9.224z" fill="currentColor"></path></svg>`
                    }]);
                } else {
                    //If there's no quick answer send the first link from google instead.
                    // TODO: Add icons to this when results are shown in the page (main.js)
                    sendResponse([{
                        //First link
                        subtitle: "First link from google",
                        //"d" is defined in the answer function
                        title: d.querySelector(".g h3").innerText,
                        _url: d.querySelector(".g a").href,
                    }]);
                }
            } catch(_){ console.error(_); sendResponse([])}
        })();
        //Makes it async (I think)
        return true;
    }
  }
);

setInterval(updateStuff, 2000);

//This is called regularly to prevent delay when the popup is opened, without it it takes ~500ms to open the popup because it has to get bookmarks, tabs, history, downloads etc.
async function updateStuff(){
    //Make it open faster by just polling. Not super efficient, I know
     stuff = {
        tabs: await new Promise(res => chrome.tabs.query({}, res)),
        bookmarks: await getBookmarks(),
        history: await new Promise(res => chrome.history.search({text: ""}, res)),
        downloads: (await new Promise(res => chrome.downloads.search({}, res))).filter(i => i.filename),
    }
    return;
}

//Run the extension
async function main(tab){
    //Fetch requests are cached
    let vue = await fetch("vue.js").then(res => res.text());
    let math = await fetch("math.js").then(res => res.text());
    let script = await fetch("main.js").then(res => res.text());
    //If we pass a tab to the main function
    let {id: tab} = tab.id || await new Promise(res => chrome.tabs.query({currentWindow: true, active : true}, ([t]) => res(t)));
    if (!Object.keys(stuff).length){
        await updateStuff();
    }
    //Generate the code to run in the tab.
    // The interpolate takes an object of variables, and a list of scripts, and bundles one script. See line 245 for details.
    let code = interpolate({
            //These are variables passed
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
         //These are scripts, they can be either strings or functions.
         vue,
         math,
         () => {
            //Don't remove: Caused error but I forgot what
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

//Recursively get bookmarks
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

//Generate a nice script with specified variables, and scripts added in.
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

//Cache fetch requests
;((window) => {
  var _fetch = window.fetch; //Get the original fetch functionm

  window.fetch = (url, opts = {}) => {
    if (!window.FETCH_CACHE) {
      window.FETCH_CACHE = {};
    }
    return new Promise((resolve) => {
      /* 
      Generate a sort of unique key about this fetch request. 
      GET requests will have `opts.method` and `opts.body` as 
      undefined, which will be removed by JSON.stringify.

      For a fetch call such as this:

      fetch("https://apis.explosionscratc.repl.co/google?q=dogs")

      the key would be:
      "{url: 'https://apis.explosionscratc.repl.co'}"
      For a POST/DELETE/PUT request however, the key would also have the opts.method and opts.body (and possibly headers).
      */

      var key = JSON.stringify({
        url,
        method: opts.method,
        body: opts.body,
        headers: JSON.stringify(opts.headers),
      });

      //First check for existing cache entries:
      if (window.FETCH_CACHE[key]) {
        //Important to re-clone the response, otherwise we can't fetch something more than once!
        resolve(window.FETCH_CACHE[key].clone());
        console.log("Fetched from cache");
        return; //Important so we don't fetch anyways!
      }

      _fetch(url, opts).then((res) => {
        window.FETCH_CACHE[key] = res.clone(); //Store the response in the cache
        resolve(res); //Respond with the response of the fetch.
        console.log("Fetched new version");
      });
    });
  };
})(globalThis);

async function answer(q) {
    // This fetches https://google.com/search?q=whatever  using my cors proxy. This cors proxy is cors-anywhere, a popular NPM package.
    // It is open source here: https://replit.com/@ExplosionScratc/cors
    // This proxy was made by me and I solemnly swear it does not log or do anything fishy. See the code for proof.
    // It proxies any request through node.js e.g. https://cors.explosionscratc.repl.co/example.com fetches example.com but avoids CORS errors.
  var html = await fetch(
    `https://cors.explosionscratc.repl.co/google.com/search?q=${encodeURI(q)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; CrOS x86_64 13982.88.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.162 Safari/537.36",
      },
    }
  ).then((res) => res.text());
  // Parses the google results' page as a HTML document then scrapes it for answers
  window.d = new DOMParser().parseFromString(html, "text/html");
  var el =
    d.querySelector("[id*='lrtl-translation-text']") ||
    [...d.querySelectorAll(".kp-header [data-md]")][1] ||
    //Calculator results
    [...document.querySelectorAll(".kCrYT")]?.[1] ||
    [...d.querySelectorAll("*")]
      .filter((i) => i.innerText)
      .filter((i) => i.innerText.includes("Calculator Result"))
      .slice(-2)?.[0]
      ?.innerText?.split("\n")?.[2] ||
    //Snippets
    [...d.querySelectorAll("div, span")]
      .filter((i) => i.innerText)
      .filter(
        (i) =>
          i.innerText.includes("Featured snippet from the web") ||
          i.innerText.includes("Description") ||
          i.innerText.includes("Calculator result")
      )?.slice(-1)?.[0]?.innerText?.replace(/^(?:description|calculator result | featured snippet from the web)/i, "") ||
    //Cards (like at the side)
    d.querySelector(
      ".card-section, [class*='__wholepage-card'] [class*='desc'], .kno-rdesc"
    ) ||
    //Definitions
    [...d.querySelectorAll(".thODed")]
      .map((i) => i.querySelector("div span"))
      .map((i, idx) => `${idx + 1}. ${i?.innerText}`)
      .join("\n") ||
    [...d.querySelectorAll("[data-async-token]")]?.slice(-1)?.[0] ||
    d.querySelector("miniapps-card-header")?.parentElement ||
    d.querySelector("#tw-target");
  var text =
    typeof el == "array" || typeof el == "string" ? el : el?.innerText?.trim();
  if (text?.startsWith("Did you mean") || text?.startsWith("In order to show you the most relevant results,")){
    return;
  }
  if (text?.includes("translation") && text?.includes("Google Translate")) {
    text = text.split("Verified")[0].trim();
  }
  text = text?.split("();")?.slice(-1)?.[0]?.split("http")?.[0];//In case we get a script.
  text = text?.split(/Wikipedia[A-Z]/)?.[0];//Sometimes it adds random stuff to the end. This usually ends in "WikipediaRandomstuff"
  if (
    text?.includes("Calculator Result") &&
    text?.includes("Your calculations and results")
  ) {
    text = text
      .split("them")?.[1]
      .split("(function()")?.[0]
      ?.split("=")?.[1]
      ?.trim();
  }
  return text;
}
