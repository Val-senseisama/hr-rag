import { useEffect, useMemo, useRef, useState } from 'react'
import Session from '../helpers/Session'
import { Button } from '../components/ui/button'

type Message = { id: string; role: 'user' | 'assistant'; content: string; ts: number }

export default function Chat() {
  const currentCompany = useMemo(() => {
    const fromSession = Session.get('current_company')
    if (fromSession?.id) return fromSession
    const params = new URLSearchParams(window.location.search)
    const id = params.get('company')
    const name = params.get('company_name')
    if (id) return { id, name }
    return fromSession
  }, [])
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentCompany?.id) {
      window.location.href = '/companies'
    }
  }, [currentCompany])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const assistantIdRef = useRef<string | null>(null)

  const send = async () => {
    if (!input.trim()) return
    const msg: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim(), ts: Date.now() }
    setMessages((m) => [...m, msg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': Session.getCookie('x-access-token'),
          'x-refresh-token': Session.getCookie('x-refresh-token'),
        },
        body: JSON.stringify({ company: currentCompany?.id, message: msg.content })
      })
      if (!res.ok || !res.body) {
        let errText = ''
        try { errText = await res.text() } catch {}
        throw new Error(errText || 'Chat failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      assistantIdRef.current = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by two newlines
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 2)
          if (!frame.startsWith('data:')) continue
          const json = frame.slice(5).trim()
          if (!json) continue
          try {
            const evt = JSON.parse(json)
            if (evt.chunk) {
              if (!assistantIdRef.current) {
                const a: Message = { id: crypto.randomUUID(), role: 'assistant', content: evt.chunk, ts: Date.now() }
                assistantIdRef.current = a.id
                setMessages((m) => [...m, a])
              } else {
                const id = assistantIdRef.current
                setMessages((m) => m.map(mm => mm.id === id ? { ...mm, content: mm.content + evt.chunk } : mm))
              }
            }
            if (evt.done) {
              // Optionally store references somewhere if needed
              break
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-200">Chat</h1>
          <p className="text-zinc-400 text-sm">Company: {currentCompany?.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => (window.location.href = '/companies')}>
            <i className="fa-solid fa-building mr-2"></i> Companies
          </Button>
        </div>
      </div>

      <div ref={listRef} className="border border-neutral-800 rounded-lg h-[70vh] p-4 overflow-y-auto bg-neutral-900 max-w-5xl mx-auto">
        {messages.length === 0 ? (
          <div className="text-zinc-500 text-sm">Ask a question about your company documents…</div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={(m.role === 'user' ? 'text-right' : 'text-left') + ' '}>
                <div className={
                  'inline-block rounded-lg px-3 py-2 whitespace-pre-wrap break-words ' +
                  (m.role === 'user'
                    ? 'max-w-[85%] md:max-w-[70%] bg-zinc-200 text-neutral-900'
                    : 'max-w-[100%] md:max-w-[85%] bg-neutral-800 text-zinc-200')
                }>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type your message…"
          className="flex-1 px-3 py-2 rounded-md border border-neutral-800 bg-neutral-800 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
        <Button onClick={send} disabled={loading || !input.trim()}>
          {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
        </Button>
      </div>
    </div>
  )
}


