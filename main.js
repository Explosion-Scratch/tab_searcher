let app = Vue.createApp({
		data() {
			return {
                showHome: true,
                actions: [
					{
						title: "Search tabs",
						label: "Search all open tabs",
						id: "tabs",
						icon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--mdi-light" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M6 4h11a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zm0 1a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-8h-8V5H6zm13 2a2 2 0 0 0-2-2h-5v4h7V7z" fill="currentColor"></path></svg>`,
					},
					{
						title: "Search bookmarks",
						label: "Search all bookmarks",
						id: "bookmarks",
						icon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--ph" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256"><path d="M183.988 34h-112a14.016 14.016 0 0 0-14 14v176a6 6 0 0 0 9.18 5.088l60.813-38.013l60.828 38.013a6 6 0 0 0 9.18-5.088V48a14.016 14.016 0 0 0-14-14zm-112 12h112a2.002 2.002 0 0 1 2 2v117.175l-54.827-34.263a5.996 5.996 0 0 0-6.36 0l-54.813 34.262V48a2.002 2.002 0 0 1 2-2zm59.173 132.912a6 6 0 0 0-6.36 0l-54.813 34.262v-33.849l57.993-36.25l58.007 36.25v33.85z" fill="currentColor"></path></svg>`,
					},
					{
						title: "Search history",
						label: "Search through your history",
						id: "history",
						icon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--clarity" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 36 36"><path d="M18 9.83a1 1 0 0 0-1 1v8.72l5.9 4a1 1 0 0 0 1.1-1.67l-5-3.39v-7.66a1 1 0 0 0-1-1z" class="clr-i-outline clr-i-outline-path-1" fill="currentColor"></path><path d="M18 2a16.09 16.09 0 0 0-14 8.26V5.2a1 1 0 0 0-2 0V14h8.8a1 1 0 0 0 0-2H5.35a14 14 0 1 1 3.23 16.35a1 1 0 0 0-1.35 1.48A16 16 0 1 0 18 2z" class="clr-i-outline clr-i-outline-path-2" fill="currentColor"></path></svg>`,
					},
				],
                length: itemsLength,
                results: [],
				listHeight: null,
				query: "",
                shortcuts: {
                    ">": "tabs",
                    "*": "bookmarks",
                    "!": "combined",
                    "<": "history",
                    "_": "downloads",
                },
				searchTypes: {
					tabs: "tabs",
					bookmarks: "bookmarks",
					history: "history entries",
					combined: "items",
                    downloads: "downloads",
				},
				searchType: "combined",
			};
		},
        watch: {
            query(){
                //Debounced
                this.fetchWolframAlpha();
                if (Object.keys(this.shortcuts).includes(this.query.split(" ")[0]) && this.query.endsWith(" ")){
                    this.searchType = this.shortcuts[this.query.split(" ")[0]];
                    this.query = "";
                }
            },
            searchType(){
                //Show suggestions if someone uses a shortcut
                this.showHome = false;
            }
        },
		mounted() {
            this.results = items[this.searchType];
            document.activeElement.blur();
            document.querySelector("#popup_app input").focus();
			setInterval(() => {
				let height = document.querySelector(".measure")?.clientHeight;
				this.listHeight = height;
			}, 300);
            document.documentElement.addEventListener("keyup", ({key}) => {
                if (key === "Escape"){
                    this.destroy();
                }
            });
            document.documentElement.addEventListener("focus", (e) => e.preventDefault());
            document.documentElement.addEventListener("keydown", (e) => {
                //Prevent arrow keys from scrolling
                e.key.includes("Arrow") && e.preventDefault();
                //Focus on key press non arrow/enter
                if (e.target.tagName === "LI" && !e.key.includes("Arrow") && e.key !== "Enter"){
                    document.querySelector(".popup_container input").focus();
                }
            });
		},
		methods: {
            runAction(id){
                if (["history", "bookmarks", "tabs", "combined"].includes(id)){
                    this.searchType = id;
                    this.showHome = false;
                }
            },
            formatBytes(bytes, decimals = 1) {
                if (bytes === 0) return '0 Bytes';

                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

                const i = Math.floor(Math.log(bytes) / Math.log(k));

                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            },
            resizeSelect(e) {
				const displayedText = e.options[e.selectedIndex].innerText;
				const dummy = document.createElement("div");
				dummy.innerText = displayedText;
				dummy.style.position = "absolute";
				dummy.style.visibility = "hidden";
				document.body.insertBefore(dummy, document.body.firstChild);
				const measuredWidth = dummy.clientWidth;
				document.body.removeChild(dummy);
				e.style.width = measuredWidth + 20 + "px";
                this.getResults();
			},
            fetchWolframAlpha: debounce(() => {
                return;
                console.log("Searching");
                chrome.runtime.sendMessage({type: "quickAnswer", query: app.query}, (r) => {
                    console.log({r});
                    if (!r) return;
                    app.results = [...r, ...app.results];
                })
            }, 500),
            open(item){
                if (item.noClick){
                    return;
                }
                chrome.runtime.sendMessage({type: "itemClicked", item, searchType: this.searchType});
            },
            getResults: debounce(() => {
                chrome.runtime.sendMessage({
                    type: "search",
                    query: app.query,
                    searchType: app.searchType,
                    searchTypes: app.searchTypes,
                }, (res) => {
                    //Getting results at the same time
                    let mathRes = [];
                    try {
                        let r = math.evaluate(app.query);
                        //Sometimes math.evaluate returns a function which makes for weird results
                        if (r.toString().length && typeof r !== "function"){
                            mathRes.push({title: r.toString(), subtitle: "Math result", noClick: true, highlight: true, icon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--ph" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256"><path d="M80 120h96a8 8 0 0 0 8-8V64a8 8 0 0 0-8-8H80a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8zm8-48h80v32H88zm112-47.992H56a16.018 16.018 0 0 0-16 16v176a16.018 16.018 0 0 0 16 16h144a16.018 16.018 0 0 0 16-16v-176a16.018 16.018 0 0 0-16-16zm0 192l-144 .01V40.008h144zM140 148a12 12 0 1 1-12-12a12.014 12.014 0 0 1 12 12zm0 40a12 12 0 1 1-12-12a12.014 12.014 0 0 1 12 12zm-40-40a12 12 0 1 1-12-12a12.014 12.014 0 0 1 12 12zm0 40a12 12 0 1 1-12-12a12.014 12.014 0 0 1 12 12zm80-40a12 12 0 1 1-12-12a12.014 12.014 0 0 1 12 12zm0 40a12 12 0 1 1-12-12a12.014 12.014 0 0 1 12 12z" fill="currentColor"></path></svg>`})
                        }
                    } catch(_){}
                    console.log(res, [...app.results]);
                    app.results = [...mathRes, ...res];
                    if (app.results.length < 2){
                        app.results = [...app.results, {
                            highlight: true, 
                            title: `Search google for ${app.query}`, 
                            url: `https://google.com/search?q=${encodeURIComponent(app.query)}`,
                            icon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--akar-icons" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g fill="none"><path d="M21.456 10.154c.123.659.19 1.348.19 2.067c0 5.624-3.764 9.623-9.449 9.623A9.841 9.841 0 0 1 2.353 12a9.841 9.841 0 0 1 9.844-9.844c2.658 0 4.879.978 6.583 2.566l-2.775 2.775V7.49c-1.033-.984-2.344-1.489-3.808-1.489c-3.248 0-5.888 2.744-5.888 5.993c0 3.248 2.64 5.998 5.888 5.998c2.947 0 4.953-1.685 5.365-3.999h-5.365v-3.839h9.26z" fill="currentColor"></path></g></svg>`,
                        }];
                    }
                })
            }, 90),
            destroy(){
                console.log("Exiting");
                (app || this).$.appContext.app.unmount();
                document.querySelector("#popup_app").remove();
            },
			focusListener: (e) => {
                if (e.key.includes("Arrow")){
                    e.preventDefault();
                }
                let opts = {preventScroll: true};
                let { key, target: { tagName: type } } = e;
                if (type === "INPUT" && key === "Enter"){
                    document.querySelector(".popup_container .entries li").click();
                    setTimeout(() => app.destroy(), 200);
                }
                if (type === "LI" && key === "Enter"){
                    return document.activeElement.click();
                }
                if (type === "INPUT" && key === "ArrowDown"){
                    document.activeElement.blur();
                    document.querySelector(".popup_container .entries li").focus(opts);
                } else if (type === "LI" && key.includes("Arrow")){
                    e.preventDefault();
                    if (["ArrowDown", "ArrowRight"].includes(key)){
                        document.activeElement.nextElementSibling.focus(opts)
                    } else if (["ArrowUp", "ArrowRight"]){
                        document.activeElement.previousElementSibling.focus(opts)
                    }
                    document.activeElement.scrollIntoViewIfNeeded();
                }
			},
			formatURL(i){
                i = i.replace(/\/$/, "");
                i = i.split(/[\?#]/)[0];
				let segments = i.replace(/^http?s:\/\//, "").split("/");
				if (segments.length > 4) {
					segments = [segments[0], "...", ...segments.slice(-2)];
				}
				let joined = segments.join(" › ");
				return this.clip(joined, 60);
			},
            clip(text, length = 40){
                if (!text) return text;
                return text.length >= (length - 3) ? `${text.slice(0, length - 3)}...` : text;
            },
			detectBroken(el) {
				if (el.naturalHeight === 16) {
					let p = el.parentElement;
                    el.remove();
                    p.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--ph" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256"><path d="M224.326 161.548a102.003 102.003 0 0 0-.01-67.123a5.927 5.927 0 0 0-.303-.86a102.001 102.001 0 0 0-192.022-.01a5.948 5.948 0 0 0-.312.885a102.002 102.002 0 0 0 .014 67.16a5.957 5.957 0 0 0 .288.817a102 102 0 0 0 192.024.039a5.988 5.988 0 0 0 .32-.908zM99.74 166h56.518c-5.677 18.28-15.375 34.698-28.259 47.263c-12.884-12.565-22.582-28.983-28.26-47.263zm-3.088-12a128.714 128.714 0 0 1 0-52h62.694a128.714 128.714 0 0 1 0 52zM38 128a89.707 89.707 0 0 1 3.834-26H84.35a145.058 145.058 0 0 0 0 52H41.834A89.707 89.707 0 0 1 38 128zm118.26-38H99.74c5.677-18.28 15.376-34.698 28.26-47.263C140.884 55.302 150.583 71.72 156.26 90zm15.39 12h42.516a90.065 90.065 0 0 1 0 52H171.65a145.058 145.058 0 0 0 0-52zm37.922-12h-40.675a124.677 124.677 0 0 0-27.854-51.051A90.253 90.253 0 0 1 209.572 90zM114.957 38.95A124.672 124.672 0 0 0 87.103 90H46.428a90.253 90.253 0 0 1 68.529-51.051zM46.428 166h40.675a124.683 124.683 0 0 0 27.854 51.052A90.254 90.254 0 0 1 46.428 166zm94.615 51.052A124.683 124.683 0 0 0 168.897 166h40.675a90.254 90.254 0 0 1-68.529 51.052z" fill="currentColor"></path></svg>
                    `.trim();
				} else {
					el.style.display = "block";
				}
			},
			domain(url) {
				return new URL(url).hostname;
			},
		}
	}).mount("#popup_app");

function debounce(callback, wait) {
  let timeout;
  return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(function () { callback.apply(this, args); }, wait);
  };
}

function throttle (callback, limit) {
    var waiting = false;                      // Initially, we're not waiting
    return function () {                      // We return a throttled function
        if (!waiting) {                       // If we're not waiting
            callback.apply(this, arguments);  // Execute users function
            waiting = true;                   // Prevent future invocations
            setTimeout(function () {          // After a period of time
                waiting = false;              // And allow future invocations
            }, limit);
        }
    }
}

