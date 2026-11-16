import { Component } from 'react'

// Si una parte de la página falla al dibujarse (por ejemplo, un archivo que no se pudo
// descargar por mala conexión, o que cambió con una versión nueva de la tienda), solo esa
// parte muestra su aviso: sin esto, un solo error deja toda la tienda en blanco.
// `fallback` es lo que se muestra en su lugar.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('No se pudo mostrar una parte de la página:', error?.message)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
