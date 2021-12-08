![logo](logo.png)

# Tab searching extension
A beautiful tab, bookmarks, history, and downloads searcher (beta)
| Images | More images |  |
|---|---|---|
| <img src="https://user-images.githubusercontent.com/61319150/143915304-d37d3496-b238-4afa-a171-b61e67bdf9c9.png"> | <img src="https://user-images.githubusercontent.com/61319150/143895130-8a0ee5d3-f014-4c7c-886f-5cb0dfaae2f6.png"> |  |
| <img src="https://user-images.githubusercontent.com/61319150/143894871-e7c081eb-1b89-452d-9c02-4031b2135a26.png"> | <img src="https://user-images.githubusercontent.com/61319150/143894895-eb40d963-46da-4c72-a515-2c3c931a6b83.png"> |  |
| <img src="https://user-images.githubusercontent.com/61319150/143895231-8f60b59e-fc43-4d52-9a94-9a3c05a59ce4.png"> | <img src="https://user-images.githubusercontent.com/61319150/143915246-1d2f0024-f651-41d8-bdd3-e87e68fa120e.png"> |  |
| <img src="https://user-images.githubusercontent.com/61319150/143915393-c4ff95b5-7675-48fc-b174-10324a710ec4.png"> |  |  |

# Permissions this extension requests and why:

## At a glance:
- No data of yours is collected or sent anywhere outside of this extension
- There is only **one** time your data is sent away from your browser:
    - This extension gets quick results from google (like when you search google for "When did the civil war end" and it gives you "April 9, 1865"), anyways, google makes it so scraping their site is hard, so to work around this I proxy the request to google through a CORS proxy. Read more [here](https://javascript.info/fetch-crossorigin) This cors proxy is [open source](https://replit.com/@ExplosionScratc/cors).
    - This data is NEVER collected, logged, or tracked in any way

## Details
You might see this:
```json
"permissions": ["tabs", "history", "bookmarks", "commands", "<all_urls>", "downloads"],
```
and be like "NOOOOO HELP THiS EXTENSION CAN READ MY BROWSING HISTORY AND ALL PAGES I VISIT???!??!", but I promise it doesn't, here's why each of these permissions are requested:

- `tabs`: This permission is needed to run the main extensions's script and create that neat little popup that you see when running the extension. Without this permission we'd have to use the omnibox (the browser's search bar) to provide suggestions, and that wouldn't be as nice. No data from your tab is collected whatsoever. 
    - I should disclose that URLs and titles of the tabs are read to search open tabs when you search open tabs, but this data is **never** sent anywhere outside of your browser.
- `history`: Part of the extension is quickly searching your history and showing results from it in the popup. Again, this data is kept within your browser. 
- `bookmarks`: It also searches your bookmarks, the reasoning behind this is the same as for the `history` permission, and no data leaves your browser.
- `commands`: The `commands` permission allows extensions to register a keyboard shortcut. In the case of this extension it allows you to set a keyboard shortcut to open the extension at `chrome://extensions/shortcuts`
- `<all_urls>`: This means that the extension can look at and change the content of every page you visit with the extension on. You should be mindful of this permission. In the case of this extension this is needed to inject a script which shows the popup box where you can search. This is seperate from the `tabs` permission, which allows extensions to open, close, and view the URLs of your tabs
- `downloads`: It also searches your downloads. Same reasoning here.