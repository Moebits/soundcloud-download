const checkBox = document.querySelector(".sc-ext-enable-checkbox")
chrome.storage.sync.get("state", (result) => {
    if (result.state === "off") checkBox.checked = false
    if (checkBox.checked) {
        chrome.runtime.sendMessage({message: "set-state", state: "on"})
    } else {
        chrome.runtime.sendMessage({message: "set-state", state: "off"})
    }
})

checkBox.onclick = () => {
    if (checkBox.checked) {
        chrome.runtime.sendMessage({message: "set-state", state: "on"})
        chrome.storage.sync.set({state: "on"})
    } else {
        chrome.runtime.sendMessage({message: "set-state", state: "off"})
        chrome.storage.sync.set({state: "off"})
    }
}
