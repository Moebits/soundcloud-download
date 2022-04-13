let extensionEnabled = true
let coverArt = false
let reposts = false
let playlistsForUser = false
let trackURL = ""
let userURL = ""
let playlistURL = ""
let playlistLock = false
let clientID = ""
let trackAuth = ""
let authToken = ""

chrome.webRequest.onBeforeRequest.addListener((details) => {
  if (details.url.includes("soundcloud.com/me")) {
    if (!details.requestBody?.raw) return
    const decoder = new TextDecoder("utf-8")
    const json = JSON.parse(decoder.decode(details.requestBody.raw[0].bytes))
    authToken = json.auth_token
  }
}, {urls: ["https://*.soundcloud.com/*"]}, ["requestBody"])

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
  if (details.url.includes("https://api-v2.soundcloud.com/media")) {
    const url = details.url.split("?")
    const params = new URLSearchParams(`?${url[1]}`)
    trackAuth = params.get("track_authorization")
  }
}, {urls: ["https://*.soundcloud.com/*"]})

const clean = (text) => {
  return text?.replace(/[^a-z0-9_-\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf【】()\[\]&!#. ]/gi, "").replace(/~/g, "").replace(/ +/g, " ").trim() ?? ""
}

const downloadM3U = async (url) => {
  const m3u = await fetch(url).then((r) => r.text())
  const urls = m3u.match(/(http).*?(?=\s)/gm)
  let crunker = new Crunker.default({sampleRate: 48000})
  const buffers = await crunker.fetchAudio(...urls)
  const merged = await crunker.concatAudio(buffers)
  const output = await crunker.export(merged, "audio/mp3")
  return output.url
}

const getDownloadURL = async (track, album) => {
    let url = track.media.transcodings.find((t) => t.format.mime_type === "audio/mpeg" && t.format.protocol === "progressive")?.url
    if (!url) {
      url = track.media.transcodings.find((t) => t.format.mime_type === "audio/mpeg" && t.format.protocol === "hls")?.url
      url += url.includes("secret_token") ? `&client_id=${clientID}` : `?client_id=${clientID}`
      if (trackAuth) url += `&track_authorization=${trackAuth}`
      const m3u = await fetch(url, {headers: {"Authorization": `OAuth ${authToken}`}}).then((r) => r.json()).then((m) => m.url)
      return downloadM3U(m3u)
    }
    url += url.includes("secret_token") ? `&client_id=${clientID}` : `?client_id=${clientID}`
    const mp3 = await fetch(url).then((r) => r.json()).then((m) => m.url)
    const arrayBuffer = await fetch(mp3).then((r) => r.arrayBuffer())
    let artwork = track.artwork_url ? track.artwork_url : track.user.avatar_url
    artwork = artwork.replace("-large", "-t500x500")
    const imageBuffer = await fetch(artwork).then((r) => r.arrayBuffer())
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

const getArtURL = (track) => {
  let artwork = track.artwork_url ? track.artwork_url : track.user.avatar_url
  artwork = artwork.replace("-large", "-t500x500")
  return artwork
}

const setIcon = () => {
  if (extensionEnabled === true) {
    if (coverArt) {
      chrome.browserAction.setIcon({path: "assets/icon-pink.png"})
    } else {
      chrome.browserAction.setIcon({path: "assets/icon.png"})
    }
  } else {
    if (coverArt) {
      chrome.browserAction.setIcon({path: "assets/icon-off-pink.png"})
    } else {
      chrome.browserAction.setIcon({path: "assets/icon-off.png"})
    }
  }
}

const downloadPlaylist = async (request, playlist, pathPrefix) => {
  for (let i = 0; i < playlist.tracks.length; i++) {
    if (!playlist.tracks[i].media) playlist.tracks[i] = await fetch(`https://api-v2.soundcloud.com/tracks/soundcloud:tracks:${playlist.tracks[i].id}?client_id=${clientID}`).then(r => r.json())
  }
  for (let i = 0; i < playlist.tracks.length; i++) {
    try {
      const url = coverArt ? getArtURL(playlist.tracks[i]) : await getDownloadURL(playlist.tracks[i], playlist.title)
      let filename = `${clean(playlist.tracks[i].title)}.${coverArt ? "jpg" : "mp3"}`.trim()
      if (url) chrome.downloads.download({url, filename: `${pathPrefix}${clean(playlist.title)}/${filename}`, conflictAction: "overwrite"})
    } catch (e) {
      console.log(e)
      continue
    }
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

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message === "download-track") {
      const track = request.track
      const url = coverArt ? getArtURL(track) : await getDownloadURL(track)
      const filename = `${clean(track.title)}.${coverArt ? "jpg" : "mp3"}`.trim()
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
      if (reposts) {
        let reposts = await fetch(`https://api-v2.soundcloud.com/stream/users/${request.user.id}/reposts?client_id=${clientID}&limit=100`).then(r => r.json())
        trackArray.push(...reposts.collection.map(repost => repost.track))
        while (reposts.next_href) {
          reposts = await fetch(`${reposts.next_href}&client_id=${clientID}`).then(r => r.json())
          trackArray.push(...reposts.collection.map(repost => repost.track))
        }
      }
      for (let i = 0; i < trackArray.length; i++) {
        try {
          const url = coverArt ? getArtURL(trackArray[i]) : await getDownloadURL(trackArray[i])
          const filename = `${clean(trackArray[i].title)}.${coverArt ? "jpg" : "mp3"}`.trim()
          if (url) chrome.downloads.download({url, filename: `${clean(request.user.username)}/${filename}`, conflictAction: "overwrite"})
        } catch (e) {
          console.log(e)
          continue
        }
      }
      if (playlistsForUser) {
        try {
          const playlistArray = []
          let playlists = await fetch(`https://api-v2.soundcloud.com/users/${request.user.id}/playlists?client_id=${clientID}&limit=100`).then(r => r.json())
          playlistArray.push(...playlists.collection)
          while (playlists.next_href) {
            playlists = await fetch(`https://api-v2.soundcloud.com/users/${request.user.id}/playlists?client_id=${clientID}&limit=100`).then(r => r.json())
            playlistArray.push(...playlists.collection)
          }
          for (let playlist of playlistArray) {
            await downloadPlaylist(request, playlist, `${clean(request.user.username)}/`)
          }
        }
        catch (e) {
          console.log(e)
        }
      }      
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {message: "download-stopped", id: request.id})
      })
    }

    if (request.message === "download-playlist") {
      await downloadPlaylist(request, request.playlist)
    }

    if (request.message === "set-state") {
      extensionEnabled = request.state === "on" ? true : false
      coverArt = request.coverArt === "on" ? true : false
      reposts = request.reposts === "on" ? true : false
      playlistsForUser = request.playlistsForUser === "on" ? true : false
      setIcon()
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {message: "update-state", state: request.state, coverArt: request.coverArt, reposts: request.reposts, playlistsForUser: request.playlistsForUser})
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
