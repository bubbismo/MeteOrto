import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import { pwaUpdate } from './app/pwaUpdate.svelte'
import './ui/theme.css'
import App from './ui/App.svelte'

// the app decides where to scroll after a reload (see navState), not the browser
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

// A new version never reloads the page by itself: the person is asked, and returns to the same screen.
const updateSW = registerSW({
  onNeedRefresh() {
    pwaUpdate.apply = () => void updateSW(true)
    pwaUpdate.ready = true
  },
  onRegisteredSW(_url, registration) {
    // look for a new version once an hour and every time the app comes back to the foreground
    if (!registration) return
    setInterval(() => void registration.update(), 3600 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update()
    })
  },
})

const app = mount(App, { target: document.getElementById('app')! })

export default app
