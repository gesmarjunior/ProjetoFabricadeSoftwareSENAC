/** Contrato assíncrono consumido pelas páginas, independente da persistência. */
export class OccurrenceRepository {
  async init() {
    throw new Error('Implemente init().');
  }
  async list() {
    throw new Error('Implemente list().');
  }
  async get() {
    throw new Error('Implemente get().');
  }
  async create() {
    throw new Error('Implemente create().');
  }
  async updateStatus() {
    throw new Error('Implemente updateStatus().');
  }
  async getImageUrl() {
    throw new Error('Implemente getImageUrl().');
  }
}
