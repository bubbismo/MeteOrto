/** State of the app update: a new version is downloaded and waits for the person to accept it. */
class PwaUpdate {
  ready = $state(false)
  /** Installs the waiting version and reloads (set by main.ts). */
  apply: () => void = () => {}
}

export const pwaUpdate = new PwaUpdate()
