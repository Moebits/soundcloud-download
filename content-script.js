const injectScript = (url) => {
    const script = document.createElement("script")
    script.setAttribute("src", url)
    const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement
    head.insertBefore(script, head.lastChild)
}

const arrayIncludes = (string, array) => {
    for (let i = 0; i < array.length; i++) {
        if (string.includes(array[i])) return true
    }
    return false
}

const appendButton = (buttonGroup) => {
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

const playlist = (button) => {
    button.onclick = () => {
        chrome.runtime.sendMessage({message: "playlist-clicked"})
    }
}

const user = (button) => {
    button.onclick = () => {
        chrome.runtime.sendMessage({message: "user-clicked"})
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

const removeBoxes = () => {
    document.querySelectorAll(".sc-download-button").forEach((b) => b.remove())
}

chrome.runtime.sendMessage({message: "get-state"}, (response) => {
    if (response !== true) return  
    main()
})

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message == "update-state") {
        if (request.state === false) {
            removeBoxes()
        } else {
            main()
        }
    }
})

