const checkBox = document.querySelector(".sc-ext-enable-checkbox")
const state = localStorage.getItem("sc-ext-state")
if (state && state === "false") checkBox.checked = false

if (checkBox.checked) {
    browser.runtime.sendMessage({message: "set-state", state: true})
} else {
    browser.runtime.sendMessage({message: "set-state", state: false})
}

checkBox.onclick = () => {
    if (checkBox.checked) {
        browser.runtime.sendMessage({message: "set-state", state: true})
        localStorage.setItem("sc-ext-state", "true")
    } else {
        browser.runtime.sendMessage({message: "set-state", state: false})
        localStorage.setItem("sc-ext-state", "false")
    }
}
