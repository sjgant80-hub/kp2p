// P2P mesh via WebTorrent tracker - ~50 lines
const TR = 'wss://tracker.openwebtorrent.com'
const ICE = {iceServers:[{urls:'stun:stun.l.google.com:19302'}]}

export const mesh = (room, on = {}) => {
  const id = crypto.randomUUID().slice(0,8)
  const peers = new Map()
  let ws, hash

  const toHash = async r => {
    const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode('p:'+r))
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')
  }

  const setup = (dc, pid) => {
    dc.onopen = () => { peers.set(pid, dc); on.peer?.(pid) }
    dc.onclose = () => { peers.delete(pid); on.left?.(pid) }
    dc.onmessage = e => on.msg?.(JSON.parse(e.data), pid)
  }

  const offer = async () => {
    const pc = new RTCPeerConnection(ICE)
    const dc = pc.createDataChannel('d')
    await pc.createOffer().then(o => pc.setLocalDescription(o))
    await new Promise(r => { pc.onicecandidate = e => { if(!e.candidate) r() }})
    return { pc, dc, sdp: pc.localDescription.sdp }
  }

  const connect = async () => {
    hash = await toHash(room)
    ws = new WebSocket(TR)
    ws.onopen = async () => {
      on.open?.()
      const o = await offer()
      setup(o.dc, 'init')
      ws.send(JSON.stringify({
        action:'announce', info_hash:hash, peer_id:id, numwant:10,
        offers:[{offer_id:'0', offer:{sdp:o.sdp}}]
      }))
    }
    ws.onmessage = async e => {
      const m = JSON.parse(e.data)
      if (m.offer && m.peer_id !== id) {
        const pc = new RTCPeerConnection(ICE)
        pc.ondatachannel = e => setup(e.channel, m.peer_id)
        await pc.setRemoteDescription({type:'offer', sdp:m.offer.sdp})
        const a = await pc.createAnswer()
        await pc.setLocalDescription(a)
        await new Promise(r => { pc.onicecandidate = e => { if(!e.candidate) r() }})
        ws.send(JSON.stringify({
          action:'announce', info_hash:hash, peer_id:id,
          to_peer_id:m.peer_id, offer_id:m.offer_id,
          answer:{sdp:pc.localDescription.sdp}
        }))
      }
    }
    ws.onclose = () => setTimeout(connect, 3000)
  }

  const send = d => {
    const s = JSON.stringify(d)
    peers.forEach(p => p.readyState === 'open' && p.send(s))
  }

  return { id, peers, connect, send }
}
