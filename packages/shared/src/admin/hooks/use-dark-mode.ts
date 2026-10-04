import { useState, useEffect } from "react"

export function useDarkMode(): boolean {
  const check = () =>
    document.documentElement.classList.contains("dark") ||
    document.documentElement.dataset.mode === "dark" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(check())

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const mqHandler = () => setIsDark(check())
    mq.addEventListener("change", mqHandler)

    const observer = new MutationObserver(() => setIsDark(check()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-mode"],
    })

    return () => {
      mq.removeEventListener("change", mqHandler)
      observer.disconnect()
    }
  }, [])

  return isDark
}
