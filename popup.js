const checkBox = document.getElementById("sc-ext-enable-checkbox")
const artCheckBox = document.getElementById("sc-ext-art-checkbox")
const repostCheckBox = document.getElementById("sc-ext-repost-checkbox")
const playlistsCheckBox = document.getElementById("sc-ext-playlists-checkbox")
const text = document.querySelectorAll(".sc-ext-text")
const switches = document.querySelectorAll(".sc-ext-slider")

const state = () => {
    return {
        state: checkBox.checked ? "on" : "off", 
        coverArt: artCheckBox.checked ? "on" : "off", 
        reposts: repostCheckBox.checked ? "on" : "off",
        playlists: playlistsCheckBox.checked ? "on" : "off"
    }
}

function setPink(shouldBePink){
    artCheckBox.classList.toggle("pink-filter",shouldBePink)
    checkBox.classList.toggle("pink-filter",shouldBePink)
    repostCheckBox.classList.toggle("pink-filter",shouldBePink)
    playlistsCheckBox.classList.toggle("pink-filter",shouldBePink)
    text.forEach((t) => t.classList.toggle("pink-text",shouldBePink))
    switches.forEach((s) => s.classList.toggle("pink-slider",shouldBePink))
}

chrome.storage.sync.get("info", (result) => {
    if (result.info?.state === "off") checkBox.checked = false
    if (result.info?.coverArt === "on") artCheckBox.checked = true
    if (result.info?.reposts === "on") repostCheckBox.checked = true
    if (result.info?.playlists === "on") playlistsCheckBox.checked = true
    setPink(artCheckBox.checked)
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
    setPink(artCheckBox.checked)
    chrome.storage.sync.set({info: state()})
    chrome.runtime.sendMessage({message: "set-state", ...state()})
}
