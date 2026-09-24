import { useEffect, type ReactNode } from 'react'
import { href, type Route } from '../router.ts'

// The frame around every screen: top bar with an optional Back link and
// button, then the page title and content.
export function Page({ title, back, action, hideTitle, children }: {
  title: string
  back?: Route
  action?: ReactNode
  hideTitle?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    document.title = title === 'Society Poker' ? title : `${title}: Society Poker`
  }, [title])

  return (
    <>
      <header className="top">
        {back ? <a className="back" href={href(back)}>← Back</a> : <span />}
        {action}
      </header>
      <main>
        {!hideTitle && <h1 className="page-title">{title}</h1>}
        {children}
      </main>
    </>
  )
}
