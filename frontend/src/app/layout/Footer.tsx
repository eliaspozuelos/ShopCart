import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="footer-logo">ShopCart.</p>
          <p>Tienda conectada al catálogo, carrito, cupones y pedidos de la API.</p>
        </div>
        <div>
          <h2>Tienda</h2>
          <Link to="/tienda">Productos</Link>
          <Link to="/carrito">Carrito</Link>
          <Link to="/pedidos">Pedidos</Link>
        </div>
        <div>
          <h2>Cuenta</h2>
          <Link to="/ingresar">Ingresar</Link>
          <Link to="/registro">Crear cuenta</Link>
          <Link to="/cuenta">Direcciones</Link>
        </div>
        <div>
          <h2>Compra</h2>
          <p>Precios en GTQ con IVA incluido.</p>
          <p>La reserva del carrito vence a los 15 minutos.</p>
        </div>
      </div>
    </footer>
  )
}
