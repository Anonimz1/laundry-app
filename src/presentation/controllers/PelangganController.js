/**
 * Controller: PelangganController
 * Handles HTTP requests and delegates to application layer
 * Uses dependency injection for loose coupling
 */

const CreatePelangganCommand = require('../../application/commands/CreatePelangganCommand');
const UpdatePelangganCommand = require('../../application/commands/UpdatePelangganCommand');
const GetAllPelangganQuery = require('../../application/queries/GetAllPelangganQuery');
const GetPelangganByIdQuery = require('../../application/queries/GetPelangganByIdQuery');
const CreatePelangganHandler = require('../../application/handlers/CreatePelangganHandler');
const GetAllPelangganHandler = require('../../application/handlers/GetAllPelangganHandler');
const ResponseFormatter = require('../../shared/utils/ResponseFormatter');

class PelangganController {
  constructor(pelangganRepository) {
    this.pelangganRepository = pelangganRepository;
  }

  async index(req, res) {
    try {
      const query = new GetAllPelangganQuery(req.query);
      const handler = new GetAllPelangganHandler(this.pelangganRepository);
      const result = await handler.handle(query);

      res.render('pelanggan/index', { 
        pelanggan: result.data,
        meta: result.meta
      });
    } catch (error) {
      console.error('Error fetching pelanggan:', error);
      res.status(500).send('Error fetching data');
    }
  }

  async showCreateForm(req, res) {
    res.render('pelanggan/form', { 
      pelanggan: null, 
      action: 'tambah' 
    });
  }

  async create(req, res) {
    try {
      const command = new CreatePelangganCommand(req.body);
      const handler = new CreatePelangganHandler(this.pelangganRepository);
      const result = await handler.handle(command);

      res.redirect('/pelanggan');
    } catch (error) {
      console.error('Error creating pelanggan:', error);
      res.status(400).send(error.message);
    }
  }

  async showEditForm(req, res) {
    try {
      const query = new GetPelangganByIdQuery({ id_pelanggan: req.params.id });
      const validation = query.validate();
      
      if (!validation.isValid) {
        return res.status(400).send(validation.errors.join(', '));
      }

      const pelanggan = await this.pelangganRepository.findById(query.id_pelanggan);
      
      if (!pelanggan) {
        return res.status(404).send('Pelanggan not found');
      }

      res.render('pelanggan/form', { 
        pelanggan: pelanggan.toJSON(), 
        action: 'edit' 
      });
    } catch (error) {
      console.error('Error fetching pelanggan:', error);
      res.status(500).send('Error fetching data');
    }
  }

  async update(req, res) {
    try {
      const command = new UpdatePelangganCommand({
        id_pelanggan: req.params.id,
        ...req.body
      });

      const validation = command.validate();
      if (!validation.isValid) {
        return res.status(400).send(validation.errors.join(', '));
      }

      await this.pelangganRepository.update(command.id_pelanggan, command);
      res.redirect('/pelanggan');
    } catch (error) {
      console.error('Error updating pelanggan:', error);
      res.status(400).send(error.message);
    }
  }

  async delete(req, res) {
    try {
      await this.pelangganRepository.delete(req.params.id);
      res.redirect('/pelanggan');
    } catch (error) {
      console.error('Error deleting pelanggan:', error);
      res.status(500).send('Error deleting pelanggan');
    }
  }

  // API endpoints (JSON responses)
  async apiGetAll(req, res) {
    try {
      const query = new GetAllPelangganQuery(req.query);
      const handler = new GetAllPelangganHandler(this.pelangganRepository);
      const result = await handler.handle(query);

      res.json(ResponseFormatter.success(result.data, 'Success', result.meta));
    } catch (error) {
      res.status(500).json(ResponseFormatter.error(error.message));
    }
  }

  async apiCreate(req, res) {
    try {
      const command = new CreatePelangganCommand(req.body);
      const handler = new CreatePelangganHandler(this.pelangganRepository);
      const result = await handler.handle(command);

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json(ResponseFormatter.error(error.message));
    }
  }
}

module.exports = PelangganController;
