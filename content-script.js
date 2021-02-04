const timeout = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const arrayIncludes = (string, array) => {
    for (let i = 0; i < array.length; i++) {
        if (string.includes(array[i])) return true
    }
    return false
}

const appendButton = (buttonGroup, small) => {
    if (!buttonGroup) buttonGroup = document.querySelector(".sc-button-group")
    clearButton(buttonGroup)
    const button = document.createElement("button")
    const img = document.createElement("img")
    const text = document.createElement("span")
    img.classList.add("sc-download-img")
    button.classList.add("sc-download-button")
    text.classList.add("sc-download-text")
    if (small) {
        img.classList.add("sc-download-img-small")
        button.classList.add("sc-download-button-small")
        text.classList.add("sc-download-text-small")
        if (small === "tiny") text.classList.add("sc-download-text-hide")
    }
    text.innerText = "Download"
    img.src = chrome.extension.getURL("assets/dl-icon.png")
    button.setAttribute("title", "Download")
    buttonGroup.appendChild(button)
    button.appendChild(img)
    button.appendChild(text)
    return button
}

const appendSpinner = (buttonGroup, type) => {
    if (!buttonGroup) buttonGroup = document.querySelector(".sc-button-group")
    clearButton(buttonGroup)
    const div = document.createElement("div")
    const img = document.createElement("img")
    div.classList.add("sc-download-spinner-container")
    if (type === "tiny") div.classList.add("sc-download-spinner-small")
    img.classList.add("sc-download-spinner")
    img.src = chrome.extension.getURL("assets/loading.gif")
    buttonGroup.appendChild(div)
    div.appendChild(img)
    return div
}

const parseHTML = async (url) => {
    const html = await fetch(url).then((r) => r.text())
    const json = JSON.parse(html.match(/(?<=,)\[{(.*?)(?=\);<)/gm)[0])
    return json[`${json.length - 1}`].data[0]
}

const playlist = (button, group, id) => {
    button.onclick = async () => {
        const playlist = await parseHTML(window.location.href)
        chrome.runtime.sendMessage({message: "download-playlist", id, playlist})
        appendSpinner(group)
    }
}

const user = (button, group, id, href) => {
    button.onclick = async () => {
        const user = await parseHTML(href)
        chrome.runtime.sendMessage({message: "download-user", id, user})
        appendSpinner(group)
    }
}

const scrollListener = () => {
    const buttonGroups = document.querySelectorAll(".soundActions.sc-button-toolbar")
        buttonGroups.forEach((g) => {
            const duplicate = g.querySelector(".sc-download-button, .sc-download-spinner-container")
            if (duplicate) return
            const parent = g.parentElement.parentElement.parentElement
            let button = null
            let type = true
            if (parent.classList.contains("soundBadge__content")) {
                button = appendButton(g, "tiny")
                type = "tiny"
            } else {
                button = appendButton(g, true)
            }
            button.onclick = async () => {
                const a = parent.querySelector(".soundTitle__title")
                appendSpinner(g, type)
                const json = await parseHTML(a.href)
                if (json.hasOwnProperty("tracks")) {
                    chrome.runtime.sendMessage({message: "download-playlist", playlist: json, href: a.href})
                } else {
                    chrome.runtime.sendMessage({message: "download-track", track: json, href: a.href})
                }
                
            }
    })
}

const track = async () => {
    if (arrayIncludes(window.location.href, ["/discover", "/messages", "/you"])) return
    if (arrayIncludes(window.location.href, ["/stream", "/search", "/likes"])) {
        scrollListener()
        return window.addEventListener("scroll", scrollListener)
    }
    const duplicate = document.querySelector(".sc-download-button")
    let button = duplicate
    let buttons = document.querySelector(".sc-button-group")
    if (!buttons) {
        await timeout(1000)
        buttons = document.querySelector(".sc-button-group")
    }
    if (!buttons) return
    if (!button) button = appendButton(buttons)
    let urlBit = window.location.href.match(/(?<=soundcloud.com\/)(.*)(?<!\/)$/)?.[0]
    urlBit = urlBit.replace("/popular-tracks", "").replace("/tracks", "").replace("/albums", "").replace("/sets", "").replace("/reposts", "")
    if (window.location.href === `https://soundcloud.com/${urlBit}/sets`) {
        scrollListener()
        return window.addEventListener("scroll", scrollListener)
    }
    const id = `sc-button-id-${Math.floor(Math.random() * 100)}`
    buttons.classList.add(id)
    if (window.location.href.includes("/sets")) {
        window.removeEventListener("scroll", scrollListener)
        return playlist(button, buttons, id)
    }
    if (!urlBit.includes("/")) {
        scrollListener()
        window.addEventListener("scroll", scrollListener)
        const href = `https://soundcloud.com/${urlBit}`
        return user(button, buttons, id, href)
    }
    button.onclick = async () => {
        const track = await parseHTML(window.location.href)
        chrome.runtime.sendMessage({message: "download-track", track, id})
        appendSpinner(buttons)
    }
    window.removeEventListener("scroll", scrollListener)
}

const main = () => {
    setTimeout(track, 100)
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        if (request.message == "history-change") {   
            chrome.storage.sync.get("state", (result) => {
                if (!result || result.state === "on") {
                    chrome.runtime.sendMessage({message: "set-state", state: "on"})
                    setTimeout(track, 100)
                }
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

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message === "update-state") {
        if (request.state === "off") {
            removeButtons()
        } else {
            main()
        }
    } else if (request.message === "download-stopped") {
        if (request.id) {
            const group = document.querySelector(`.${request.id}`)
            group.classList.remove(request.id)
            clearButton(group)
            appendButton(group)
        }
        track()
    } else if (request.message === "clear-spinner") {
        const buttonGroups = document.querySelectorAll(".soundActions.sc-button-toolbar")
        buttonGroups.forEach((g) => {
            const parent = g.parentElement.parentElement.parentElement
            const a = parent.querySelector(".soundTitle__title")
            if (a.href === request.href) {
                clearButton(g)
                let button = null
                let type = true
                if (parent.classList.contains("soundBadge__content")) {
                    button = appendButton(g, "tiny")
                    type = "tiny"
                } else {
                    button = appendButton(g, true)
                }
                button.onclick = async () => {
                    appendSpinner(g, type)
                    const json = await parseHTML(a.href)
                    if (json.hasOwnProperty("tracks")) {
                        chrome.runtime.sendMessage({message: "download-playlist", playlist: json, href: a.href})
                    } else {
                        chrome.runtime.sendMessage({message: "download-track", track: json, href: a.href})
                    }
                }
            }
        })
    }
})

chrome.storage.sync.get("state", (result) => {
    if (!result || result.state === "on") {
        chrome.runtime.sendMessage({message: "set-state", state: "on"})
        main()
    }
})
    