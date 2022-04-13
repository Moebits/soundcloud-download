const checkBox = document.querySelector(".sc-ext-enable-checkbox")
const artCheckBox = document.querySelector(".sc-ext-art-checkbox")
const repostCheckBox = document.querySelector(".sc-ext-repost-checkbox")
const playlistsCheckBox = document.querySelector(".sc-ext-playlists-checkbox")
const text = document.querySelectorAll(".sc-ext-text")

const state = () => {
    return {
        state: checkBox.checked ? "on" : "off", 
        coverArt: artCheckBox.checked ? "on" : "off", 
        reposts: repostCheckBox.checked ? "on" : "off",
        playlistsForUser: playlistsCheckBox.checked ? "on" : "off"
    }
}

chrome.storage.sync.get("info", (result) => {
    if (result.info?.state === "off") checkBox.checked = false
    if (result.info?.coverArt === "on") artCheckBox.checked = true
    if (result.info?.reposts === "on") repostCheckBox.checked = true
    if (result.info?.playlistsForUser === "on") playlistsCheckBox.checked = true
    if (artCheckBox.checked) {
        artCheckBox.classList.add("pink-filter")
        checkBox.classList.add("pink-filter")
        repostCheckBox.classList.add("pink-filter")
        playlistsCheckBox.classList.add("pink-filter")
        text.forEach((t) => t.classList.add("pink-text"))
    } else {
        artCheckBox.classList.remove("pink-filter")
        checkBox.classList.remove("pink-filter")
        repostCheckBox.classList.remove("pink-filter")
        playlistsCheckBox.classList.remove("pink-filter")
        text.forEach((t) => t.classList.remove("pink-text"))
    }
    chrome.runtime.sendMessage({message: "set-state", ...state()})
})

checkBox.onclick = () => {
    chrome.storage.sync.set({info: state()})
    chrome.runtime.sendMessage({message: "set-state", ...state()})
}

repostCheckBox.onclick = () => {
    chrome.storage.sync.set({info: state()})
    chrome.runtime.sendMessage({message: "set-state", ...state()})
}

playlistsCheckBox.onclick = () => {
    chrome.storage.sync.set({info: state()})
    chrome.runtime.sendMessage({message: "set-state", ...state()})
}

artCheckBox.onclick = () => {
    if (artCheckBox.checked) {
        artCheckBox.classList.add("pink-filter")
        checkBox.classList.add("pink-filter")
        repostCheckBox.classList.add("pink-filter")
        playlistsCheckBox.classList.add("pink-filter")
        text.forEach((t) => t.classList.add("pink-text"))
    } else {
        artCheckBox.classList.remove("pink-filter")
        checkBox.classList.remove("pink-filter")
        repostCheckBox.classList.remove("pink-filter")
        playlistsCheckBox.classList.remove("pink-filter")
        text.forEach((t) => t.classList.remove("pink-text"))
    }
    chrome.storage.sync.set({info: state()})
    chrome.runtime.sendMessage({message: "set-state", ...state()})
}
