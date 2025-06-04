var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { SettingsSection } from "spcr-settings";
function fetchAllLikedSongs() {
    return __awaiter(this, void 0, void 0, function* () {
        const limit = 50;
        let offset = 0;
        let allTracks = [];
        let totalFetched = 0;
        while (true) {
            const response = yield Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`);
            const items = (response === null || response === void 0 ? void 0 : response.items) || [];
            allTracks = allTracks.concat(items);
            totalFetched += items.length;
            if (items.length < limit)
                break; // no more data
            offset += limit;
        }
        return allTracks.map(item => ({ uri: item.track.uri }));
    });
}
function getTrackItems() {
    return __awaiter(this, void 0, void 0, function* () {
        const path = Spicetify.Platform.History.location.pathname;
        if (path === "/collection/tracks") {
            const likedTracks = yield fetchAllLikedSongs();
            if (likedTracks.length === 0) {
                Spicetify.showNotification("No liked songs found.");
                return null;
            }
            return {
                playlistId: null,
                tracks: likedTracks
            };
        }
        const match = path.match(/\/playlist\/([a-zA-Z0-9]+)/);
        if (!match) {
            Spicetify.showNotification("Not on a playlist page.");
            return null;
        }
        const playlistId = match[1];
        const playlistUri = `spotify:playlist:${playlistId}`;
        const playlist = yield Spicetify.Platform.PlaylistAPI.getContents(playlistUri);
        if (!Array.isArray(playlist === null || playlist === void 0 ? void 0 : playlist.items) || playlist.items.length === 0) {
            Spicetify.showNotification("This playlist has 0 tracks.");
            return null;
        }
        return {
            playlistId,
            tracks: playlist.items.filter((item) => { var _a; return (_a = item.uri) === null || _a === void 0 ? void 0 : _a.startsWith("spotify:track:"); })
        };
    });
}
function extractUrisFromGPTResponse(data, trackInfos) {
    const message = data.choices[0].message.content.trim();
    const cleaned = message.replace(/[^0-9,\[\]\s]/g, "");
    console.log("GPT score response:", message);
    try {
        let scores = JSON.parse(cleaned);
        // Trim if too long
        if (scores.length > trackInfos.length) {
            scores = scores.slice(0, trackInfos.length);
        }
        // Pad if too short
        while (scores.length < trackInfos.length) {
            scores.push(scores[scores.length - 1]);
        }
        // Pair and sort
        const sorted = trackInfos
            .map((track, i) => (Object.assign(Object.assign({}, track), { score: scores[i] })))
            .filter(t => t.score > 0)
            .sort((a, b) => b.score - a.score);
        return sorted.map(t => t.uri);
    }
    catch (e) {
        console.error("Failed to parse GPT score response", e);
        return [];
    }
}
function sortWithPrompt(trackInfos, userPrompt, mode) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const theme = userPrompt === null || userPrompt === void 0 ? void 0 : userPrompt.trim();
        let prompt = "";
        if (mode === "1") {
            prompt = `You are a music expert.
For each of the following tracks, give a score from 0 to 100 based on how well it matches the theme: "${theme}".
Only return a valid JSON array of numeric scores, one per track, in the same order. Give 0 if the track should be excluded.
Tracks:
${trackInfos.map((t, i) => `${i + 1}. ${t.name} - ${t.artists[0].name}`).join("\n")}
    `.trim();
        }
        else {
            prompt = `You are a music expert.
Sort these tracks by how relevant they are to the theme: "${theme}".
Return ONLY a JSON array of numeric scores from 1 to 100, one for each track in the same order.
Tracks:
${trackInfos.map((t, i) => `${i + 1}. ${t.name} - ${t.artists[0].name}`).join("\n")}
    `.trim();
        }
        const userKey = JSON.parse(localStorage.getItem("smart-sort-settings.openai-key") || "{}").value;
        const userModel = JSON.parse(localStorage.getItem("smart-sort-settings.openai-model") || "{}").value || "gpt-4o";
        ;
        console.log(userKey);
        console.log(localStorage);
        const requestBody = {
            model: userModel,
            messages: [
                { role: "system", content: "You are a music expert assistant." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        };
        try {
            let response;
            if (userKey !== "") {
                response = yield fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${userKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(requestBody)
                });
            }
            else {
                response = yield fetch("https://openai-proxy-nc2l.onrender.com/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": "mySpicetify"
                    },
                    body: JSON.stringify(requestBody)
                });
                console.log("Using my API");
            }
            const data = yield response.json();
            if (!response.ok) {
                const errorMsg = ((_a = data === null || data === void 0 ? void 0 : data.error) === null || _a === void 0 ? void 0 : _a.message) || response.statusText;
                throw new Error(`API Error: ${errorMsg}`);
            }
            return extractUrisFromGPTResponse(data, trackInfos);
        }
        catch (err) {
            console.error("GPT sort failed:", err);
            Spicetify.showNotification("Failed to sort tracks: " + (err.message || "Unknown error"));
            return [];
        }
    });
}
function chunk(arr, size) {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
}
function smartSort(userPrompt, mode) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield getTrackItems();
            const { playlistId, tracks } = result;
            const trackChunks = chunk(tracks, 50);
            const trackInfos = [];
            for (const chunk of trackChunks) {
                const ids = chunk.map(t => t.uri.split(":").pop()).join(",");
                try {
                    const response = yield Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks?ids=${ids}`);
                    const infos = response.tracks.map((track, i) => ({
                        uri: chunk[i].uri,
                        name: track === null || track === void 0 ? void 0 : track.name,
                        artists: track === null || track === void 0 ? void 0 : track.artists,
                    }));
                    trackInfos.push(...infos);
                }
                catch (err) {
                    console.warn("Batch fetch failed:", err);
                    trackInfos.push(...chunk.map(t => ({ uri: t.uri })));
                }
                yield new Promise(resolve => setTimeout(resolve, 250));
            }
            console.log(trackInfos);
            //Sort
            const sortedUris = yield sortWithPrompt(trackInfos, userPrompt, mode);
            //Playlist name
            let originalName = "Liked Songs";
            if (playlistId !== null) {
                const playlistMeta = yield Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/playlists/${playlistId}`);
                originalName = playlistMeta.name;
            }
            const newName = `${originalName} (${userPrompt})`;
            //Create new playlist
            const me = yield Spicetify.CosmosAsync.get("https://api.spotify.com/v1/me");
            const newPlaylist = yield Spicetify.CosmosAsync.post(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
                name: newName,
                public: false,
            });
            //Add sorted tracks
            //Split into chunks of 100
            for (let i = 0; i < sortedUris.length; i += 100) {
                const chunk = sortedUris.slice(i, i + 100);
                yield Spicetify.CosmosAsync.post(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
                    uris: chunk
                });
            }
            Spicetify.showNotification(`Created playlist: ${newName}`);
        }
        catch (err) {
            console.error("Error in smartSort:", err);
            Spicetify.showNotification("Failed to sort");
        }
    });
}
function injectButtonInActionBar() {
    const observer = new MutationObserver(() => {
        const path = Spicetify.Platform.History.location.pathname;
        if (!path.startsWith("/playlist/") && path !== "/collection/tracks")
            return;
        const actionBar = document.querySelector('[data-testid="action-bar-row"]') ||
            document.querySelector('.main-actionBar-ActionBarRow');
        if (!actionBar)
            return;
        if (document.getElementById("smart-sort-container"))
            return;
        const container = document.createElement("div");
        container.id = "smart-sort-container";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "8px";
        container.style.marginLeft = "12px";
        container.style.maxWidth = "400px";
        // Input field
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Sort playlist by prompt...";
        input.className = "x-filterBox-filterInput";
        input.style.all = "unset";
        input.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
        input.style.border = "1px solid rgba(255, 255, 255, 0.2)";
        input.style.color = "#fff";
        input.style.borderRadius = "4px";
        input.style.padding = "6px 12px";
        input.style.height = "32px";
        input.style.fontSize = "14px";
        input.style.width = "200px";
        input.style.boxSizing = "border-box";
        input.style.caretColor = "#fff";
        // Dropdown
        const select = document.createElement("select");
        select.id = "sort-mode-select";
        select.style.height = "32px";
        select.style.borderRadius = "4px";
        select.style.backgroundColor = "#282828";
        select.style.color = "white";
        select.style.border = "1px solid rgba(255, 255, 255, 0.2)";
        select.style.padding = "0 8px";
        ["Sort", "Sort and Filter"].forEach((label, i) => {
            const option = document.createElement("option");
            option.value = i.toString();
            option.textContent = label;
            select.appendChild(option);
        });
        // Go button
        const sortButton = document.createElement("button");
        sortButton.textContent = "Go";
        sortButton.style.backgroundColor = "#1db954";
        sortButton.style.border = "none";
        sortButton.style.color = "white";
        sortButton.style.borderRadius = "4px";
        sortButton.style.cursor = "pointer";
        sortButton.style.padding = "6px 12px";
        sortButton.style.height = "32px";
        sortButton.style.fontWeight = "bold";
        sortButton.onclick = () => {
            const prompt = input.value.trim();
            const mode = select.value;
            if (prompt) {
                Spicetify.showNotification(`Sorting by: "${prompt}"`);
                smartSort(prompt, mode);
            }
        };
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter")
                sortButton.click();
        });
        container.appendChild(input);
        container.appendChild(select);
        container.appendChild(sortButton);
        actionBar.appendChild(container);
        observer.disconnect();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        while (!(Spicetify === null || Spicetify === void 0 ? void 0 : Spicetify.showNotification) || !(Spicetify === null || Spicetify === void 0 ? void 0 : Spicetify.Platform)) {
            yield new Promise(resolve => setTimeout(resolve, 100));
        }
        const settings = new SettingsSection("Smart Sort Settings", "smart-sort-settings");
        settings.addInput("openai-key", "OpenAI API Key", localStorage.getItem("openai_key") || "", ((valueObj) => {
            localStorage.setItem("openai_key", valueObj.value);
        }));
        settings.addDropDown("openai-model", "OpenAI Model (gpt-4o is recommended)", ["gpt-4o", "gpt-4", "gpt-3.5-turbo"], ["gpt-4o", "gpt-4", "gpt-3.5-turbo"].indexOf(localStorage.getItem("openai_model") || "gpt-4o (recommended)"), ((_, valueObj) => {
            localStorage.setItem("openai_model", valueObj.value);
        }));
        settings.pushSettings();
        injectButtonInActionBar();
        Spicetify.Platform.History.listen(() => {
            injectButtonInActionBar();
        });
    });
}
export default main;
