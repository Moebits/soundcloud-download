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

function setColorState(pink){
    document.documentElement.style.setProperty("--sc-ext-color",`var(--sc-ext-${ pink ? "pink" : "orange" })`)
}

chrome.storage.sync.get("info", (result) => {
    if (result.info?.state === "off") checkBox.checked = false
    if (result.info?.coverArt === "on") artCheckBox.checked = true
    if (result.info?.reposts === "on") repostCheckBox.checked = true
    if (result.info?.playlists === "on") playlistsCheckBox.checked = true
    setColorState(artCheckBox.checked)
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
    setColorState(artCheckBox.checked)
    chrome.storage.sync.set({info: state()})
    chrome.runtime.sendMessage({message: "set-state", ...state()})
}

setTimeout(function(){
    document.body.classList.remove("preload"); // stops animations from playing when we open the popup
},500);