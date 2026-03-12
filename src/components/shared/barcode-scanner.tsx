'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2, CheckCircle2, Flashlight } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (code: string) => void
}

const CONFIRM_READS = 2
const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] as const

function hasBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

async function startQuagga(
  videoEl: HTMLVideoElement,
  onDetect: (code: string) => void,
): Promise<() => void> {
  const Quagga = (await import('@ericblade/quagga2')).default

  return new Promise((resolve, reject) => {
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: videoEl,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        locator: { patchSize: 'medium', halfSample: true },
        numOfWorkers: typeof navigator !== 'undefined' ? Math.min(navigator.hardwareConcurrency ?? 2, 4) : 2,
        decoder: {
          readers: ['ean_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader', 'code_39_reader'],
        },
        locate: true,
      },
      (err) => {
        if (err) { reject(err); return }
        Quagga.start()
        resolve(() => { try { Quagga.stop() } catch { /* ok */ } })
      },
    )

    Quagga.onDetected((result) => {
      const code = result.codeResult?.code
      // Filter low-confidence reads: require all checksum-validated or at least 70% bars correct
      const errors = result.codeResult?.decodedCodes?.filter((c) => c.error !== undefined).map((c) => c.error ?? 1) ?? []
      const avgError = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 1
      if (code && avgError < 0.25) onDetect(code)
    })
  })
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'confirming' | 'error'>('idle')
  const [lastCode, setLastCode] = useState('')
  const [confirmCount, setConfirmCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [engine, setEngine] = useState<'native' | 'quagga' | ''>('')
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number | null>(null)
  const stopQuaggaRef = useRef<(() => void) | null>(null)
  const committedRef = useRef(false)
  const lastCodeRef = useRef('')
  const countRef = useRef(0)

  function handleDetected(code: string) {
    if (committedRef.current) return

    if (code === lastCodeRef.current) {
      countRef.current += 1
    } else {
      lastCodeRef.current = code
      countRef.current = 1
    }

    setLastCode(code)
    setConfirmCount(countRef.current)

    if (countRef.current >= CONFIRM_READS) {
      committedRef.current = true
      setStatus('confirming')
      setTimeout(() => { stopScanner(); onScan(code) }, 350)
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ torch: next } as any] })
      setTorchOn(next)
    } catch { /* device doesn't support torch */ }
  }

  async function startNative(video: HTMLVideoElement) {
    // @ts-expect-error — BarcodeDetector not yet in TS lib
    const detector = new BarcodeDetector({ formats: SCAN_FORMATS })

    function tick() {
      if (committedRef.current) return
      detector.detect(video)
        .then((results: Array<{ rawValue: string }>) => {
          if (results.length > 0) handleDetected(results[0].rawValue)
          animRef.current = requestAnimationFrame(tick)
        })
        .catch(() => { animRef.current = requestAnimationFrame(tick) })
    }
    animRef.current = requestAnimationFrame(tick)
  }

  async function startScanner() {
    setOpen(true)
    setStatus('starting')
    committedRef.current = false
    lastCodeRef.current = ''
    countRef.current = 0
    setLastCode('')
    setConfirmCount(0)
    setTorchOn(false)
    setTorchAvailable(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // @ts-expect-error — advanced not in TS types but works on Android Chrome
          advanced: [{ focusMode: 'continuous' }],
        },
      })
      streamRef.current = stream

      // Detect torch support
      const track = stream.getVideoTracks()[0]
      if (track) {
        const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
        if (caps.torch) setTorchAvailable(true)
      }

      if (hasBarcodeDetector()) {
        setEngine('native')
        const video = document.createElement('video')
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        videoRef.current = video

        const container = document.getElementById('barcode-video-container')
        if (container) {
          container.innerHTML = ''
          video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
          container.appendChild(video)
        }

        await video.play()
        setStatus('scanning')
        await startNative(video)
      } else {
        setEngine('quagga')
        // Quagga2 needs a pre-existing <video> element inside the container
        const container = document.getElementById('barcode-video-container')
        let video = container?.querySelector('video') as HTMLVideoElement | null
        if (!video) {
          video = document.createElement('video')
          video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
          container?.appendChild(video)
        }
        video.srcObject = stream
        videoRef.current = video
        video.setAttribute('playsinline', 'true')
        video.muted = true
        await video.play()
        setStatus('scanning')
        const stop = await startQuagga(video, handleDetected)
        stopQuaggaRef.current = stop
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Câmera indisponível'
      setErrorMsg(msg.toLowerCase().includes('permission') ? 'Permissão de câmera negada.' : msg)
      setStatus('error')
    }
  }

  function stopScanner() {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    if (stopQuaggaRef.current) { stopQuaggaRef.current(); stopQuaggaRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    videoRef.current = null
    setOpen(false)
    setStatus('idle')
    setEngine('')
    setLastCode('')
    setConfirmCount(0)
    setTorchOn(false)
    setTorchAvailable(false)
  }

  useEffect(() => () => stopScanner(), [])

  const isScanning = status === 'scanning'

  return (
    <>
      <button
        type="button"
        title="Escanear código de barras"
        onClick={startScanner}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
      >
        <Camera className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={stopScanner} aria-hidden />
          <div className="relative z-50 w-full max-w-sm mx-4 rounded-xl bg-background border border-border shadow-xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Scanner de código de barras</span>
                {engine && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {engine === 'native' ? 'BarcodeDetector' : 'Quagga2'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isScanning && torchAvailable && (
                  <button
                    onClick={toggleTorch}
                    title={torchOn ? 'Apagar lanterna' : 'Ligar lanterna'}
                    className={`p-1.5 rounded transition-colors ${
                      torchOn
                        ? 'text-yellow-400 bg-yellow-400/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <Flashlight className="h-4 w-4" />
                  </button>
                )}
                <button onClick={stopScanner} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Video */}
            <div className="relative bg-black" style={{ height: 260 }}>
              <div id="barcode-video-container" className="w-full h-full">
                {/* Quagga2 needs a pre-existing <video>; native injects its own */}
                {typeof window !== 'undefined' && !hasBarcodeDetector() && (
                  <video className="w-full h-full object-cover" playsInline muted />
                )}
              </div>

              {/* Aim guide for 1D barcodes */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4/5 h-16 border-2 border-primary/70 rounded-sm relative">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-px h-px bg-red-500/70" />
                    <div className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-primary" />
                    <div className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-primary" />
                    <div className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-primary" />
                    <div className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-primary" />
                  </div>
                </div>
              )}

              {/* Live feedback */}
              {isScanning && (
                <div className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none">
                  {lastCode ? (
                    <span className="bg-yellow-500/90 text-black text-xs px-3 py-1 rounded-full font-mono font-semibold">
                      {lastCode}
                      <span className="ml-1.5 opacity-60">({confirmCount}/{CONFIRM_READS})</span>
                    </span>
                  ) : (
                    <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                      Alinhe o código dentro da moldura
                    </span>
                  )}
                </div>
              )}

              {status === 'confirming' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-green-950/85 z-10">
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                  <span className="text-white font-mono text-lg font-semibold">{lastCode}</span>
                  <span className="text-green-300 text-xs">Código confirmado!</span>
                </div>
              )}

              {status === 'starting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                  <span className="text-white text-sm">Iniciando câmera...</span>
                </div>
              )}

              {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black p-6 text-center z-10">
                  <Camera className="h-8 w-8 text-white/30" />
                  <p className="text-white text-sm font-medium">Erro ao acessar câmera</p>
                  <p className="text-white/60 text-xs">{errorMsg}</p>
                  <button onClick={stopScanner} className="mt-2 text-xs text-primary underline">
                    Fechar
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 text-xs text-muted-foreground text-center border-t border-border">
              Scanners USB/Bluetooth funcionam diretamente no campo de busca.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
