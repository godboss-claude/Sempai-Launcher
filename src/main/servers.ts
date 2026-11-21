import net from 'node:net'
import type { PingResult, ServerEntry } from '../shared/types'

const PROTOCOL_VERSION = 47

function writeVarInt(value: number): Buffer {
  const bytes: number[] = []
  let current = value >>> 0
  do {
    let byte = current & 0x7f
    current >>>= 7
    if (current !== 0) byte |= 0x80
    bytes.push(byte)
  } while (current !== 0)
  return Buffer.from(bytes)
}

function readVarInt(buffer: Buffer, offset: number): { value: number; size: number } | null {
  let value = 0
  let shift = 0
  let size = 0
  while (true) {
    if (offset + size >= buffer.length) return null
    const byte = buffer[offset + size]
    size += 1
    value |= (byte & 0x7f) << shift
    if ((byte & 0x80) === 0) return { value, size }
    shift += 7
    if (shift > 35) return null
  }
}

function mcString(value: string): Buffer {
  const body = Buffer.from(value, 'utf8')
  return Buffer.concat([writeVarInt(body.length), body])
}

function packet(id: number, payload: Buffer): Buffer {
  const body = Buffer.concat([writeVarInt(id), payload])
  return Buffer.concat([writeVarInt(body.length), body])
}

function flattenMotd(description: unknown): string {
  if (!description) return ''
  if (typeof description === 'string') return description
  if (typeof description !== 'object') return String(description)
  const node = description as { text?: unknown; extra?: unknown[] }
  let result = typeof node.text === 'string' ? node.text : ''
  if (Array.isArray(node.extra)) {
    for (const part of node.extra) result += flattenMotd(part)
  }
  return result
}

function cleanMotd(value: string): string {
  return value.replace(/§[0-9a-fk-or]/gi, '').replace(/\s+/g, ' ').trim()
}

export function pingServer(server: Pick<ServerEntry, 'id' | 'host' | 'port'>): Promise<PingResult> {
  return new Promise((resolve) => {
    const started = Date.now()
    let settled = false
    let buffer = Buffer.alloc(0)
    const socket = new net.Socket()
    socket.setNoDelay(true)

    const finish = (result: PingResult): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(result)
    }

    const timer = setTimeout(() => {
      finish({
        id: server.id,
        online: false,
        ping: null,
        error: 'Сервер не отвечает'
      })
    }, 5000)

    socket.once('connect', () => {
      const port = Buffer.alloc(2)
      port.writeUInt16BE(server.port, 0)
      const handshake = packet(
        0,
        Buffer.concat([
          writeVarInt(PROTOCOL_VERSION),
          mcString(server.host),
          port,
          writeVarInt(1)
        ])
      )
      socket.write(Buffer.concat([handshake, packet(0, Buffer.alloc(0))]))
    })

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)])
      const length = readVarInt(buffer, 0)
      if (!length) return
      if (buffer.length < length.size + length.value) return

      const id = readVarInt(buffer, length.size)
      if (!id || id.value !== 0) return
      const stringLength = readVarInt(buffer, length.size + id.size)
      if (!stringLength) return
      const jsonStart = length.size + id.size + stringLength.size
      const jsonText = buffer
        .subarray(jsonStart, jsonStart + stringLength.value)
        .toString('utf8')

      try {
        const data = JSON.parse(jsonText) as {
          version?: { name?: string }
          players?: { online?: number; max?: number }
          description?: unknown
          favicon?: string
        }
        clearTimeout(timer)
        finish({
          id: server.id,
          online: true,
          ping: Date.now() - started,
          players: {
            online: Number(data.players?.online ?? 0),
            max: Number(data.players?.max ?? 0)
          },
          version: data.version?.name,
          motd: cleanMotd(flattenMotd(data.description)),
          icon: typeof data.favicon === 'string' ? data.favicon : undefined
        })
      } catch {
        finish({
          id: server.id,
          online: false,
          ping: null,
          error: 'Некорректный ответ сервера'
        })
      }
    })

    socket.once('error', (error) => {
      clearTimeout(timer)
      finish({
        id: server.id,
        online: false,
        ping: null,
        error: error.message || 'Ошибка подключения'
      })
    })

    socket.once('close', () => {
      clearTimeout(timer)
      if (!settled) {
        finish({
          id: server.id,
          online: false,
          ping: null,
          error: 'Соединение закрыто'
        })
      }
    })

    try {
      socket.connect(server.port, server.host)
    } catch (error) {
      clearTimeout(timer)
      finish({
        id: server.id,
        online: false,
        ping: null,
        error: error instanceof Error ? error.message : 'Ошибка подключения'
      })
    }
  })
}
