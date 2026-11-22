import { HeartPulse } from 'lucide-react'

export function Header({ patients }) {
  // Calculate ward status badges from sample patients
  const counts = { high: 0, medium: 0, stable: 0 }
  patients.forEach(p => {
    if (p.news2Total >= 5) counts.high++
    else if (p.news2Total >= 3) counts.medium++
    else counts.stable++
  })

  return (
    <header className="sticky top-0 z-10 bg-slate-900 text-white border-b border-slate-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">

        {/* Left: Rose-600 icon box with HeartPulse icon */}
        <div className="flex items-center gap-2">
          <div className="bg-rose-600 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <HeartPulse className="h-4 w-4" />
            <span className="font-bold">WardWatch</span>
          </div>
          <span className="text-sm opacity-80">Ward 4B — Acute General Medicine & Sepsis Triage</span>
        </div>

        {/* Right: Three live ward status badges */}
        <div className="flex items-center gap-3">
          {/* High Risk - rose */}
          <span className="bg-rose-100 text-rose-800 rounded-full px-2.5 py-0.5 text-sm font-medium">
            High Risk
            <span className="ml-1 text-xs font-normal opacity-90">({counts.high})</span>
          </span>

          {/* Medium - amber */}
          <span className="bg-amber-100 text-amber-800 rounded-full px-2.5 py-0.5 text-sm font-medium">
            Medium
            <span className="ml-1 text-xs font-normal opacity-90">({counts.medium})</span>
          </span>

          {/* Stable - emerald */}
          <span className="bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-0.5 text-sm font-medium">
            Stable
            <span className="ml-1 text-xs font-normal opacity-90">({counts.stable})</span>
          </span>
        </div>
      </div>
    </header>
  )
}