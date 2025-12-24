// P2P mesh via WebTorrent tracker
const TR = 'wss://tracker.openwebtorrent.com'
const ICE = {iceServers:[{urls:'stun:stun.l.google.com:19302'}]}

export const mesh = (room, on = {}) => {
  const id = crypto.randomUUID().slice(0,8)
  const peers = new Map()
  const pcs = new Map() // track RTCPeerConnections
  let ws, hash

  const log = (...a) => { console.log('[mesh]', ...a); on.log?.(...a) }

  const toHash = async r => {
    const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode('p:'+r))
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')
  }

  const setup = (dc, pid) => {
    log('DataChannel setup for', pid, 'state:', dc.readyState)
    dc.onopen = () => {
      log('DataChannel OPEN with', pid)
      peers.set(pid, dc)
      on.peer?.(pid)
    }
    dc.onclose = () => {
      log('DataChannel CLOSED with', pid)
      peers.delete(pid)
      on.left?.(pid)
    }
    dc.onerror = e => log('DataChannel ERROR', pid, e)
    dc.onmessage = e => on.msg?.(JSON.parse(e.data), pid)
  }

  const offer = async () => {
    log('Creating offer...')
    const pc = new RTCPeerConnection(ICE)
    pc.oniceconnectionstatechange = () => log('ICE state:', pc.iceConnectionState)
    pc.onconnectionstatechange = () => log('Connection state:', pc.connectionState)
    const dc = pc.createDataChannel('d')
    await pc.createOffer().then(o => pc.setLocalDescription(o))
    log('Waiting for ICE candidates...')
    await new Promise(r => { pc.onicecandidate = e => { if(!e.candidate) r() }})
    log('Offer ready, SDP length:', pc.localDescription.sdp.length)
    return { pc, dc, sdp: pc.localDescription.sdp }
  }

  const connect = async () => {
    hash = await toHash(room)
    log('Connecting to tracker...', 'room:', room, 'hash:', hash.slice(0,8))
    ws = new WebSocket(TR)

    ws.onopen = async () => {
      log('Tracker connected!')
      on.open?.()
      const o = await offer()
      pcs.set('0', o.pc)
      setup(o.dc, 'init')
      const msg = {
        action:'announce', info_hash:hash, peer_id:id, numwant:10,
        offers:[{offer_id:'0', offer:{sdp:o.sdp}}]
      }
      log('Sending announce...', msg.action)
      ws.send(JSON.stringify(msg))
    }

    ws.onmessage = async e => {
      const m = JSON.parse(e.data)
      log('Tracker message:', m.info_hash ? 'announce response' : m.offer ? 'offer from '+m.peer_id : m.answer ? 'answer' : m)

      if (m.offer && m.peer_id !== id) {
        log('Got offer from', m.peer_id, 'creating answer...')
        const pc = new RTCPeerConnection(ICE)
        pc.oniceconnectionstatechange = () => log('ICE state:', pc.iceConnectionState)
        pc.ondatachannel = e => {
          log('Got data channel from', m.peer_id)
          setup(e.channel, m.peer_id)
        }
        await pc.setRemoteDescription({type:'offer', sdp:m.offer.sdp})
        const a = await pc.createAnswer()
        await pc.setLocalDescription(a)
        await new Promise(r => { pc.onicecandidate = e => { if(!e.candidate) r() }})
        log('Sending answer to', m.peer_id)
        ws.send(JSON.stringify({
          action:'announce', info_hash:hash, peer_id:id,
          to_peer_id:m.peer_id, offer_id:m.offer_id,
          answer:{sdp:pc.localDescription.sdp}
        }))
        pcs.set(m.peer_id, pc)
      }

      if (m.answer) {
        log('Got answer for offer', m.offer_id)
        const pc = pcs.get(m.offer_id) || pcs.get('0')
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription({type:'answer', sdp:m.answer.sdp})
          log('Set remote description, state:', pc.connectionState)
        }
      }
    }

    ws.onerror = e => log('Tracker error:', e)
    ws.onclose = () => { log('Tracker closed, reconnecting in 3s...'); setTimeout(connect, 3000) }
  }

  const send = d => {
    const s = JSON.stringify(d)
    peers.forEach(p => p.readyState === 'open' && p.send(s))
  }

  return { id, peers, connect, send, log }
}
