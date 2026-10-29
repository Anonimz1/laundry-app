/**
 * Routes: Pelanggan
 * Clean routing with dependency injection
 */

const express = require('express');
const router = express.Router();

module.exports = (pelangganController) => {
  // Web routes (HTML views)
  router.get('/', (req, res) => pelangganController.index(req, res));
  router.get('/tambah', (req, res) => pelangganController.showCreateForm(req, res));
  router.post('/', (req, res) => pelangganController.create(req, res));
  router.get('/:id/edit', (req, res) => pelangganController.showEditForm(req, res));
  router.post('/:id', (req, res) => pelangganController.update(req, res));
  router.post('/:id/delete', (req, res) => pelangganController.delete(req, res));

  // API routes (JSON responses)
  router.get('/api', (req, res) => pelangganController.apiGetAll(req, res));
  router.post('/api', (req, res) => pelangganController.apiCreate(req, res));

  return router;
};
