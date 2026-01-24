import fs from 'fs/promises'
import path from 'path'
import SiteBanner from '@/components/SiteBanner'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function prettyTitle(slug) {
  // "print-and-play" -> "Print and Play"
  return String(slug)
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function prettyName(filename) {
  return String(filename).replace(/\.[^/.]+$/, '')
}

async function listDirSafe(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

export default async function ResourcesPage() {
  const baseDir = path.join(process.cwd(), 'public', 'downloads')
  const baseEntries = await listDirSafe(baseDir)

  // Top-level directories become "groups"
  const preferred = ['Rules Documents', 'Game Rulebooks']
  const groupDirs = baseEntries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort((a, b) => {
      const ai = preferred.indexOf(a)
      const bi = preferred.indexOf(b)
      const ax = ai === -1 ? 999 : ai
      const bx = bi === -1 ? 999 : bi
      return ax !== bx ? ax - bx : a.localeCompare(b)
    })

  // Top-level files (optional) => show under "Other"
  const topLevelFiles = baseEntries.filter(e => e.isFile()).map(e => e.name)

  async function buildFileList(groupSlug) {
    const groupDir = path.join(baseDir, groupSlug)
    const entries = await listDirSafe(groupDir)

    const files = await Promise.all(
      entries
        .filter(e => e.isFile())
        .map(async e => {
          const abs = path.join(groupDir, e.name)
          const stat = await fs.stat(abs)
          return {
            name: e.name,
            title: prettyName(e.name),
            href: `/downloads/${encodeURIComponent(groupSlug)}/${encodeURIComponent(e.name)}`,
            size: stat.size,
            mtime: stat.mtimeMs,
          }
        })
    )

    // Newest first (optional). Change to title sort if you prefer.
    files.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))
    return files
  }

  const groups = await Promise.all(
    groupDirs.map(async slug => ({
      slug,
      title: prettyTitle(slug),
      files: await buildFileList(slug),
    }))
  )

  // Include "Other" for any files directly under /public/downloads
  let otherGroup = null
  if (topLevelFiles.length > 0) {
    const files = await Promise.all(
      topLevelFiles.map(async name => {
        const abs = path.join(baseDir, name)
        const stat = await fs.stat(abs)
        return {
          name,
          title: prettyName(name),
          href: `/downloads/${encodeURIComponent(name)}`,
          size: stat.size,
          mtime: stat.mtimeMs,
        }
      })
    )
    files.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))
    otherGroup = { slug: 'other', title: 'Other', files }
  }

  const hasAny = groups.some(g => g.files.length > 0) || (otherGroup && otherGroup.files.length > 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        {/* Banner */}
	   <SiteBanner/>

        {/* Body */}
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          {/* Collapsible Video Section */}
          {(() => {
            const videos = [
              {
                id: 'VIDEO_ID',
                title: ' Tutorial',
                description: ' How to play Pokémon Deckbuilding Game',
              },
		    {
                id: 'VIDEO_ID2',
                title: ' Tabletop Simulator Setup',
                description: ' Configuration and walkthrough for the Tabletop Simulator mod',
              },
		    {
                id: 'VIDEO_ID3',
                title: ' Example Gameplay',
                description: ' Taken from a previous Twitch Stream',
              },
              // Add more later:
              // { id: 'ANOTHER_ID', title: 'Setup', description: 'How to set up the game' },
            ]

            if (videos.length === 0) return null

            return (
              <details className="rounded-lg border border-zinc-800 bg-zinc-950/30 mb-4">
                <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-100">Videos   (Coming Soon!)</div>
                    <div className="text-xs text-zinc-400 truncate">
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {videos.length} video{videos.length === 1 ? '' : 's'}
                  </div>
                </summary>

                <div className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {videos.map(v => (
                      <div
                        key={v.id}
                        className="bg-zinc-850 p-3"
                      >
                        <div className="mb-2">
                          <div className="font-semibold text-zinc-100">{v.title}</div>
                          {v.description && (
                            <div className="text-xs text-zinc-400">{v.description}</div>
                          )}
                        </div>

                        <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                          <div className="relative pt-[56.25%]">
                            <iframe
                              className="absolute inset-0 h-full w-full"
                              src={`https://www.youtube.com/embed/${v.id}`}
                              title={v.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            )
          })()}


          {!hasAny ? (
            <div className="text-sm text-zinc-400">
              No resources found yet. Add folders and files under{' '}
              <code className="text-zinc-200">/public/downloads</code>.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => (
                <details
                  key={group.slug}
                  open
                  className="rounded-lg border border-zinc-800 bg-zinc-950/30"
                >
                  <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                    <div className="font-semibold text-zinc-100">{group.title}</div>
                    <div className="text-xs text-zinc-400">
                      {group.files.length} file{group.files.length === 1 ? '' : 's'}
                    </div>
                  </summary>

                  <div className="px-4 pb-4">
                    {group.files.length === 0 ? (
                      <div className="text-sm text-zinc-500">No files in this folder yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {group.files.map(f => (
                          <a
                            key={`${group.slug}:${f.name}`}
                            href={f.href}
                            className="group flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 hover:border-blue-500 transition"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-100 truncate">{f.title}</div>
                              <div className="text-xs text-zinc-400 truncate">{f.name}</div>
                            </div>

                            <div className="shrink-0 flex items-center gap-3">
                              <div className="text-xs text-zinc-400">{formatBytes(f.size)}</div>
                              <div className="text-sm text-zinc-200 group-hover:text-white">
                                Download →
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}

              {otherGroup && (
                <details open className="rounded-lg border border-zinc-800 bg-zinc-950/30">
                  <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                    <div className="font-semibold text-zinc-100">{otherGroup.title}</div>
                    <div className="text-xs text-zinc-400">
                      {otherGroup.files.length} file{otherGroup.files.length === 1 ? '' : 's'}
                    </div>
                  </summary>

                  <div className="px-4 pb-4">
                    <div className="space-y-3">
                      {otherGroup.files.map(f => (
                        <a
                          key={`other:${f.name}`}
                          href={f.href}
                          className="group flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 hover:border-blue-500 transition"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-100 truncate">{f.title}</div>
                            <div className="text-xs text-zinc-400 truncate">{f.name}</div>
                          </div>

                          <div className="shrink-0 flex items-center gap-3">
                            <div className="text-xs text-zinc-400">{formatBytes(f.size)}</div>
                            <div className="text-sm text-zinc-200 group-hover:text-white">
                              Download →
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
