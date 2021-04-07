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

const downloadM3U = async (url, title) => {
  const m3u = await fetch(url).then((r) => r.text())
  const urls = m3u.match(/(http).*?(?=\s)/gm)
  let crunker = new Crunker.default({sampleRate: 48000})
  const buffers = await crunker.fetchAudio(...urls)
  const merged = await crunker.concatAudio(buffers)
  const output = await crunker.export(merged, "audio/mp3")
  await crunker.download(output.blob, title)
  return null
}

const getDownloadURL = async (track, album) => {
    let url = track.media.transcodings.find((t) => t.format.mime_type === "audio/mpeg" && t.format.protocol === "progressive")?.url
    if (!url) {
      url = track.media.transcodings.find((t) => t.format.mime_type === "audio/mpeg" && t.format.protocol === "hls").url
      url += url.includes("secret_token") ? `&client_id=${clientID}` : `?client_id=${clientID}`
      const m3u = await fetch(url).then((r) => r.json()).then((m) => m.url)
      return downloadM3U(m3u, track.title)
    }
    url += url.includes("secret_token") ? `&client_id=${clientID}` : `?client_id=${clientID}`
    const mp3 = await fetch(url).then((r) => r.json()).then((m) => m.url)
    let artwork = track.artwork_url ? track.artwork_url : track.user.avatar_url
    artwork = artwork.replace("-large", "-t500x500")
    const imageBuffer = await fetch(artwork).then((r) => r.arrayBuffer())
    const arrayBuffer = await fetch(mp3).then((r) => r.arrayBuffer())
    const writer = new ID3Writer(arrayBuffer)
    writer.setFrame("TIT2", track.title)
        .setFrame("TPE1", [track.user.username])
        .setFrame("TLEN", track.duration)
        .setFrame("TYER", new Date(track.created_at).getFullYear())
        .setFrame("TCON", [track.genre])
        .setFrame("COMM", {
          description: "Description",
          text: track.description ?? "",
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
      const filename = `${track.title.replace(/[^a-z0-9_-\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf【】()\[\] ]/gi, "").replace(/ +/g, " ")}.mp3`.trim()
      if (url) chrome.downloads.download({url, filename, conflictAction: "overwrite"})
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
        const filename = `${trackArray[i].title.replace(/[^a-z0-9_-\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf【】()\[\] ]/gi, "").replace(/ +/g, " ")}.mp3`.trim()
        if (urlArray[i]) chrome.downloads.download({url: urlArray[i], filename, conflictAction: "overwrite"})
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
        const filename = `${playlist.tracks[i].title.replace(/[^a-z0-9_-\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf【】()\[\] ]/gi, "").replace(/ +/g, " ")}.mp3`.trim()
        if (urlArray[i]) chrome.downloads.download({url: urlArray[i], filename, conflictAction: "overwrite"})
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