let coverArt = false

const timeout = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const arrayIncludes = (string, array) => {
    for (let i = 0; i < array.length; i++) {
        if (string.includes(array[i])) return true
    }
    return false
}

const scButton = (noPeriod) => {
    return noPeriod ? "sc-download-button" : ".sc-download-button"
}

const scText = () => {
    return "sc-download-text"
}

const removeButtons = () => {
    document.querySelectorAll(scButton()).forEach((b) => b.remove())
    document.querySelectorAll(".sc-download-spinner-container").forEach((b) => b.remove())
}

const clearButton = (buttonGroup) => {
    buttonGroup.querySelector(scButton())?.remove()
    buttonGroup.querySelector(".sc-download-spinner-container")?.remove()
}

const appendButton = (buttonGroup, small, parentGuest) => {
    if (!buttonGroup) buttonGroup = document.querySelector(".sc-button-group")
    clearButton(buttonGroup)
    const button = document.createElement("button")
    const img = document.createElement("img")
    const text = document.createElement("span")
    img.classList.add("sc-download-img")
    button.classList.add(scButton(true))
    text.classList.add(scText())
    if (small) {
        img.classList.add("sc-download-img-small")
        button.classList.add("sc-download-button-small")
        text.classList.add("sc-download-text-small")
        if (small === "tiny") text.classList.add("sc-download-text-hide")
    }
    text.innerText = "Download"
    img.src = coverArt ? chrome.extension.getURL("assets/dl-icon-pink.png") : chrome.extension.getURL("assets/dl-icon.png")
    button.setAttribute("title", "Download")
    if (parentGuest) {
        parentGuest.parentNode.insertBefore(button, parentGuest.nextSibling)
    } else {
        buttonGroup.appendChild(button)
    }
    button.appendChild(img)
    button.appendChild(text)
    return button
}

const appendSpinner = (buttonGroup, type, parentGuest) => {
    if (!buttonGroup) buttonGroup = document.querySelector(".sc-button-group")
    clearButton(buttonGroup)
    const div = document.createElement("div")
    const img = document.createElement("img")
    div.classList.add("sc-download-spinner-container")
    if (type === "tiny") div.classList.add("sc-download-spinner-small")
    img.classList.add("sc-download-spinner")
    img.src = coverArt ? chrome.extension.getURL("assets/loading-pink.gif") : chrome.extension.getURL("assets/loading.gif")
    if (parentGuest) {
        parentGuest.parentNode.insertBefore(div, parentGuest.nextSibling)
    } else {
        buttonGroup.appendChild(div)
    }
    div.appendChild(img)
    return div
}

const parseHTML = async (url) => {
    const html = await fetch(url).then((r) => r.text())
    const json = JSON.parse(html.match(/(\[{)(.*)(?=;)/gm)[0])
    const parsed = json[json.length - 1].data
    return parsed
}

const playlist = (button, group, id, parentGuest) => {
    button.onclick = async () => {
        const playlist = await parseHTML(window.location.href)
        if (playlist.kind === "track") {
            chrome.runtime.sendMessage({message: "download-track", id, track: playlist})
        } else {
            chrome.runtime.sendMessage({message: "download-playlist", id, playlist})
        }
        appendSpinner(group, false, parentGuest)
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
            const duplicate = g.querySelector(`${scButton()}, .sc-download-spinner-container`)
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
    document.documentElement.style.setProperty("--sc-ext-color",`var(--sc-ext-${ coverArt ? "pink" : "orange" })`)
    if (arrayIncludes(window.location.href, ["/messages", "/you"]) && !window.location.href.includes("history")) return
    const duplicate = document.querySelector(scButton())
    let button = duplicate
    let buttons = document.querySelector(".sc-button-group")
    if (!buttons) {
        await timeout(1000)
        buttons = document.querySelector(".sc-button-group")
    }
    if (!buttons) return
    let urlBit = window.location.href.match(/(soundcloud.com\/)(.*)$/)?.[0].replace("soundcloud.com/", "")
    if (urlBit.endsWith("/")) urlBit = urlBit.slice(0, -1)
    urlBit = urlBit.replace("/popular-tracks", "").replace("/tracks", "").replace("/albums", "").replace("/sets", "").replace("/reposts", "")
    if (window.location.href === `https://soundcloud.com/${urlBit}/sets`) {
        scrollListener()
        return window.addEventListener("scroll", scrollListener)
    }
    if (window.location.href.includes("/sets")) {
        const id = `sc-button-id-${Math.floor(Math.random() * 100)}`
        buttons = document.querySelector(".systemPlaylistDetails__controls")
        const nodes = document.querySelectorAll(".systemPlaylistDetails__button")
        let parentGuest = nodes[nodes.length- 1]
        if (!buttons) {
            buttons = document.querySelector(".sc-button-group")
            parentGuest = null
        }
        buttons.classList.add(id)
        removeButtons()
        button = appendButton(buttons, false, parentGuest)
        window.removeEventListener("scroll", scrollListener)
        return playlist(button, buttons, id, parentGuest)
    }
    if (arrayIncludes(window.location.href, ["/discover", "/stream", "/search", "/likes"]) || window.location.href.includes("history")) {
        scrollListener()
        return window.addEventListener("scroll", scrollListener)
    }
    const id = `sc-button-id-${Math.floor(Math.random() * 100)}`
    buttons.classList.add(id)
    if (!button) button = appendButton(buttons)
    if (!urlBit.includes("/")) {
        scrollListener()
        window.addEventListener("scroll", scrollListener)
        const href = `https://soundcloud.com/${urlBit}`
        return user(button, buttons, id, href)
    }
    removeButtons()
    button = appendButton(buttons)
    window.removeEventListener("scroll", scrollListener)
    button.onclick = async () => {
        const track = await parseHTML(window.location.href)
        chrome.runtime.sendMessage({message: "download-track", track, id})
        appendSpinner(buttons)
    }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message == "history-change") {  
        chrome.storage.sync.get("info", (result) => {
            if (!result?.info?.state || result.info.state === "on") {
                chrome.runtime.sendMessage({message: "set-state", state: "on", coverArt: result?.info?.coverArt === "on" ? "on" : "off"})
                setTimeout(track, 100)
            }
        })
    }
    if (request.message === "update-state") {
        if (request.state === "off") {
            removeButtons()
            window.removeEventListener("scroll", scrollListener)
        } else {
            setTimeout(track, 100)
        }
        if (request.coverArt === "on") {
            if (coverArt === false) removeButtons()
            coverArt = true
        } else {
            if (coverArt === true) removeButtons()
            coverArt = false
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
            let parent = g.parentElement.parentElement.parentElement
            let a = parent.querySelector(".soundTitle__title")
            if (a?.href === request.href) {
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

chrome.storage.sync.get("info", (result) => {
    coverArt = result?.info?.coverArt === "on" ? true : false
    if (!result?.info?.state || result.info.state === "on") {
        setTimeout(track, 100)
    }
})
