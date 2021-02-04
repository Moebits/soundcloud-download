let extensionEnabled = true
let trackURL = ""
let userURL = ""
let playlistURL = ""
let playlistLock = false
let clientID = ""

chrome.webRequest.onSendHeaders.addListener((details) => {
  if (details.url.includes("https://api-v2.soundcloud.com/tracks/")) {
    const url = details.url.split("?")
    const id = url[0].match(/(?<=tracks\/)(.*?)(?=\/)/)?.[0]
    if (!id) return
    const params = new URLSearchParams(`?${url[1]}`)
    clientID = params.get("client_id")
    if (params.has("secret_token")) {
      trackURL = `https://api-v2.soundcloud.com/tracks/soundcloud:tracks:${id}?client_id=${clientID}&secret_token=${params.get("secret_token")}`
    } else {
      trackURL = `https://api-v2.soundcloud.com/tracks/soundcloud:tracks:${id}?client_id=${clientID}`
    } 
  }
  if (details.url.includes("https://api-v2.soundcloud.com/users/soundcloud:users")) {
    const url = details.url.split("?")
    const id = details.url.match(/(?<=soundcloud:users:)(.*?)(?=\/)/)?.[0]
    const params = new URLSearchParams(`?${url[1]}`)
    clientID = params.get("client_id")
    userURL = `https://api-v2.soundcloud.com/users/${id}/tracks?client_id=${clientID}&limit=100`
  }
  if (!playlistLock && details.url.includes("https://api-v2.soundcloud.com/playlists")) {
    const id = details.url.match(/(?<=playlists\/)(.*?)(?=\/|\?)/)?.[0]
    const url = details.url.split("?")
    const params = new URLSearchParams(`?${url[1]}`)
    clientID = params.get("client_id")
    playlistURL = `https://api-v2.soundcloud.com/playlists/${id}?client_id=${clientID}`
    playlistLock = true
  }
}, {urls: ["https://*.soundcloud.com/*"]})

const getDownloadURL = async (track, album) => {
    let url = track.media.transcodings[1].url
    url += url.includes("secret_token") ? `&client_id=${clientID}` : `?client_id=${clientID}`
    const mp3 = await fetch(url).then((r) => r.json()).then((m) => m.url)
    const imageBuffer = await fetch(track.artwork_url).then((r) => r.arrayBuffer())
    const arrayBuffer = await fetch(mp3).then((r) => r.arrayBuffer())
    const writer = new ID3Writer(arrayBuffer)
    writer.setFrame("TIT2", track.title)
        .setFrame("TPE1", [track.user.username])
        .setFrame("TLEN", track.duration)
        .setFrame("TYER", new Date(track.created_at).getFullYear())
        .setFrame("TCON", [track.genre])
        .setFrame("COMM", {
          description: "Description",
          text: track.description,
          language: "eng"
        })
        .setFrame("APIC", {
          type: 3,
          data: imageBuffer,
          description: track.title,
          useUnicodeEncoding: false
      })
    if (album) {
      writer.setFrame("TALB", album)
            .setFrame("TPE2", track.user.username)
    }
    writer.addTag()
    return writer.getURL()
}

const setIcon = () => {
  if (extensionEnabled === true) {
    chrome.browserAction.setIcon({path: "assets/icon.png"})
  } else {
    chrome.browserAction.setIcon({path: "assets/icon-off.png"})
  }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message === "download-track") {
      const track = request.track
      const url = await getDownloadURL(track)
      chrome.downloads.download({url, filename: `${track.title}.mp3`, conflictAction: "overwrite"})
      if (request.href) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {message: "clear-spinner", href: request.href})
        })
      } else {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {message: "download-stopped", id: request.id})
        })
      }
    }

    if (request.message === "download-user") {
      const trackArray = []
      let user = await fetch(`https://api-v2.soundcloud.com/users/${request.user.id}/tracks?client_id=${clientID}&limit=100`).then(r => r.json())
      trackArray.push(...user.collection)
      while (user.next_href) {
        user = await fetch(`${user.next_href}&client_id=${clientID}`).then(r => r.json())
        trackArray.push(...user.collection)
      }
      const urlArray = await Promise.all(trackArray.map((t) => getDownloadURL(t)))
      for (let i = 0; i < urlArray.length; i++) {
        chrome.downloads.download({url: urlArray[i], filename: `${trackArray[i].title}.mp3`, conflictAction: "overwrite"})
      }
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {message: "download-stopped", id: request.id})
      })
    }

    if (request.message === "download-playlist") {
      const playlist = request.playlist
      for (let i = 0; i < playlist.tracks.length; i++) {
        if (!playlist.tracks[i].media) playlist.tracks[i] = await fetch(`https://api-v2.soundcloud.com/tracks/soundcloud:tracks:${playlist.tracks[i].id}?client_id=${clientID}`).then(r => r.json())
      }
      const urlArray = await Promise.all(playlist.tracks.map((t) => getDownloadURL(t, playlist.title)))
      for (let i = 0; i < urlArray.length; i++) {
        chrome.downloads.download({url: urlArray[i], filename: `${playlist.tracks[i].title}.mp3`, conflictAction: "overwrite"})
      }
      if (request.href) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {message: "clear-spinner", href: request.href})
        })
      } else {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {message: "download-stopped", id: request.id})
        })
      }
    }

    if (request.message === "set-state") {
      extensionEnabled = request.state === "on" ? true : false
      setIcon()
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {message: "update-state", state: request.state})
      })
    }
})

let historyUrl = ""

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (historyUrl !== details.url) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      playlistLock = false
      chrome.tabs.sendMessage(tabs[0].id, {message: "history-change"})
    })
  }
  historyUrl = details.url
})

setIcon()