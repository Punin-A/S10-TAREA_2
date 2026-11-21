import { categoryFilter, positiveId, productData } from '../middleware/validation.js';
import { HttpError } from '../utils/http-error.js';

export function productsController(products) {
  return {
    list(req, res) {
      res.json({ products: products.list(categoryFilter(req.query)) });
    },
    get(req, res) {
      const product = products.findById(positiveId(req.params.id));
      if (!product) throw new HttpError(404, 'Producto no encontrado.');
      res.json({ product });
    },
    create(req, res) {
      const product = products.create(productData(req.body));
      res.location(`/api/products/${product.id}`).status(201).json({ product });
    },
    update(req, res) {
      const id = positiveId(req.params.id);
      const product = products.update(id, productData(req.body));
      if (!product) throw new HttpError(404, 'Producto no encontrado.');
      res.json({ product });
    },
    remove(req, res) {
      if (!products.remove(positiveId(req.params.id))) throw new HttpError(404, 'Producto no encontrado.');
      // ON DELETE CASCADE elimina todos sus favoritos en la misma operación.
      res.status(204).end();
    },
  };
}
