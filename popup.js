const checkBox = document.querySelector(".sc-ext-enable-checkbox")
const artCheckBox = document.querySelector(".sc-ext-art-checkbox")
const text = document.querySelectorAll(".sc-ext-text")

const state = () => {
    return {state: checkBox.checked ? "on" : "off", coverArt: artCheckBox.checked ? "on" : "off"}
}

chrome.storage.sync.get("info", (result) => {
    if (result.info?.state === "off") checkBox.checked = false
    if (result.info?.coverArt === "on") artCheckBox.checked = true
    if (artCheckBox.checked) {
        artCheckBox.classList.add("pink-filter")
        checkBox.classList.add("pink-filter")
        text.forEach((t) => t.classList.add("pink-text"))
    } else {
        artCheckBox.classList.remove("pink-filter")
        checkBox.classList.remove("pink-filter")
        text.forEach((t) => t.classList.remove("pink-text"))
    }
    chrome.runtime.sendMessage({message: "set-state", ...state()})
})

checkBox.onclick = () => {
    chrome.storage.sync.set({info: state()})
    chrome.runtime.sendMessage({message: "set-state", ...state()})
}

artCheckBox.onclick = () => {
    if (artCheckBox.checked) {
        artCheckBox.classList.add("pink-filter")
        checkBox.classList.add("pink-filter")
        text.forEach((t) => t.classList.add("pink-text"))
    } else {
        artCheckBox.classList.remove("pink-filter")
        checkBox.classList.remove("pink-filter")
        text.forEach((t) => t.classList.remove("pink-text"))
    }
    chrome.storage.sync.set({info: state()})
    chrome.runtime.sendMessage({message: "set-state", ...state()})
}