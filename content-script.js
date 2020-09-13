const arrayIncludes = (string, array) => {
    for (let i = 0; i < array.length; i++) {
        if (string.includes(array[i])) return true
    }
    return false
}

const appendButton = (buttonGroup) => {
    if (!buttonGroup) buttonGroup = document.querySelector(".sc-button-group")
    clearButton(buttonGroup)
    const button = document.createElement("button")
    const img = document.createElement("img")
    const text = document.createElement("span")
    img.classList.add("sc-download-img")
    button.classList.add("sc-download-button")
    text.classList.add("sc-download-text")
    text.innerText = "Download"
    img.src = chrome.extension.getURL("assets/dl-icon.png")
    button.setAttribute("title", "Download")
    buttonGroup.appendChild(button)
    button.appendChild(img)
    button.appendChild(text)
    return button
}

const appendSpinner = (buttonGroup) => {
    if (!buttonGroup) buttonGroup = document.querySelector(".sc-button-group")
    clearButton(buttonGroup)
    const div = document.createElement("div")
    const img = document.createElement("img")
    div.classList.add("sc-download-spinner-container")
    img.classList.add("sc-download-spinner")
    img.src = chrome.extension.getURL("assets/loading.gif")
    buttonGroup.appendChild(div)
    div.appendChild(img)
    return div
}

const playlist = (button) => {
    button.onclick = () => {
        chrome.runtime.sendMessage({message: "playlist-clicked"})
        appendSpinner()
    }
}

const user = (button) => {
    button.onclick = () => {
        chrome.runtime.sendMessage({message: "user-clicked"})
        appendSpinner()
    }
}

const track = () => {
    if (arrayIncludes(window.location.href, ["/discover", "/stream", "/messages", "/you", "/search"])) return
    const duplicate = document.querySelector(".sc-download-button")
    if (duplicate) return
    let buttons = document.querySelector(".sc-button-group")
    if (!buttons) {
        setTimeout(() => {
            buttons = document.querySelector(".sc-button-group")
        }, 1000)
    }
    if (!buttons) return
    const button = appendButton(buttons)
    if (window.location.href.includes("/sets")) return playlist(button)
    const urlBit = window.location.href.match(/(?<=soundcloud.com\/)(.*)(?<!\/)$/)?.[0]
    if (!urlBit.includes("/")) {
        return user(button)
    }
    button.onclick = () => {
        chrome.runtime.sendMessage({message: "track-clicked"})
        appendSpinner()
    }
}

const main = () => {
    setTimeout(track, 100)
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        if (request.message == "history-change") {
            chrome.runtime.sendMessage({message: "get-state"}, (response) => {
                if (response !== true) return  
                setTimeout(track, 100)
            })
        }
    })
}

const removeButtons = () => {
    document.querySelectorAll(".sc-download-button").forEach((b) => b.remove())
    document.querySelectorAll(".sc-download-spinner-container").forEach((b) => b.remove())
}

const clearButton = (buttonGroup) => {
    buttonGroup.querySelector(".sc-download-button")?.remove()
    buttonGroup.querySelector(".sc-download-spinner-container")?.remove()
}

chrome.runtime.sendMessage({message: "get-state"}, (response) => {
    if (response !== true) return  
    main()
})

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message === "update-state") {
        if (request.state === false) {
            removeButtons()
        } else {
            main()
        }
    } else if (request.message === "download-stopped") {
        track()
    }
})

const state = localStorage.getItem("sc-ext-state")
if (!state) {
    chrome.runtime.sendMessage({message: "set-state", state: true})
    main()
}
