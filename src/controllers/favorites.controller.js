import { favoriteData, positiveId } from '../middleware/validation.js';
import { HttpError } from '../utils/http-error.js';

export function favoritesController(favorites, products) {
  return {
    list(req, res) {
      res.json({ favorites: favorites.list(req.user.id) });
    },
    add(req, res) {
      const productId = favoriteData(req.body);
      const product = products.findById(productId);
      if (!product) throw new HttpError(404, 'Producto no encontrado.');
      try {
        favorites.add(req.user.id, productId);
      } catch (error) {
        if (error.errcode === 1555 || error.errcode === 2067) {
          throw new HttpError(409, 'El producto ya está en tus favoritos.');
        }
        throw error;
      }
      res.location(`/api/favorites/${productId}`).status(201).json({ product });
    },
    remove(req, res) {
      const productId = positiveId(req.params.productId, 'productId');
      if (!favorites.remove(req.user.id, productId)) throw new HttpError(404, 'Favorito no encontrado.');
      res.status(204).end();
    },
  };
}
