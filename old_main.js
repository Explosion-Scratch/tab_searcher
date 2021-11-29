document.activeElement.blur();
document.querySelector("#popup_app input").focus();
let app = Vue.createApp({
		data() {
			return {
				listHeight: null,
				query: "",
				searchTypes: {
					tabs: "tabs",
					bookmarks: "bookmarks",
					history: "history entries",
					combined: "items",
				},
				searchType: "combined",
				tabs,
				bookmarks,
				history,
			};
		},
		mounted() {
			setInterval(() => {
				let height = document.querySelector(".entries")?.clientHeight;
				this.listHeight = height;
			}, 300);
            document.documentElement.addEventListener("keyup", ({key}) => {
                if (key === "Escape"){
                    this.destroy();
                }
            })
		},
		methods: {
            destroy(){
                console.log("Exiting");
                (app || this).$.appContext.app.unmount();
                document.querySelector("#popup_app").remove();
            },
			focusListener: ({ key, target: { tagName: type } }) => {
                return;
				console.log({ type });
				if (type === "INPUT" && ["ArrowDown", "ArrowRight"].includes(key)) {
					let el = document.querySelector(".entries li");
					document.activeElement.blur();
					setTimeout(() => {
						el.focus();
						console.log(document.activeElement);
					}, 1000);
					return;
				}
				if (key === "Enter") {
					let el = document
						.querySelector(":focus")
						?.closest("li")
						?.querySelector("a");
					console.log({ el });
					el.click();
				}
				if (key === "ArrowRight" || key === "ArrowDown") {
					document.querySelector("*:focus").nextElementSibling.focus();
				}
				if (key === "ArrowLeft" || key === "ArrowUp") {
					document.querySelector("*:focus").previousElementSibling.focus();
				}
			},
			formatURL: (i) => {
				let segments = i.replace(/^http?s:\/\//, "").split("/");
				if (segments.length > 4) {
					segments = [segments[0], "...", ...segments.slice(-2)];
				}
				let joined = segments.join(" › ");
				if (joined.length >= 40) {
					joined = joined.slice(0, 37) + "...";
				}
				return joined;
			},
			detectBroken(el) {
				if (el.naturalHeight === 16) {
					el.style.display = "none";
				} else {
					el.style.display = "block";
				}
			},
			domain(url) {
				return new URL(url).hostname;
			},
		},
		computed: {
			results() {
                worker(async () => {
                    return fuse;
                }, {}).then(console.log);
				let items = [];
				if (this.searchType === "combined") {
					let results = Object.keys(this.searchTypes)
						.filter((i) => i !== "combined")
						.map((key) => [key, this[key]])
						.map(([key, val]) => [
							...val.map((item) => ({ ...item, type: key })),
						])
						.flat();
					items = results;
				} else {
					items = this[this.searchType];
				}
				if (this.query === "") {
					return items.slice(0, 10);
				}
				const fuse = new Fuse(items, {
					includeScore: true,
                    threshold: 0.3,
					keys: ["url", "title"],
				});
				return fuse
					.search(this.query)
					.sort((a, b) => a.score - b.score)
					.map((i) => i.item).slice(0, 30);
			},
		},
	}).mount("#popup_app");

async function worker(fn, vars, scripts){
	const worker = new Worker(
		URL.createObjectURL(
            new Blob([`
                (async () => {
                    ${scripts.join("\n\n")}
                    let result = await ((${Object.keys(vars)}) => {
                        return (${fn})();
                    })(${Object.values(vars).map(JSON.stringify)})
                    postMessage(result);
                })();
            `]), 
            { type: "application/javascript; charset=utf-8" }
        ),
	);
	return new Promise((res, rej) => {
		worker.onmessage = ({ data }) => {
			res(data), worker.terminate();
		};
		worker.onerror = (err) => {
			rej(err), worker.terminate();
		};
	});
};