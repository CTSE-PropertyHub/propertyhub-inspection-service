const { v4: uuidv4 } = require('uuid');
const store = require('./store');

const VALID_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PROPERTY_SERVICE_URL = process.env.PROPERTY_SERVICE_URL || 'http://propertyhub-property-service';

function httpError(status, message, fields) {
  const err = new Error(message);
  err.status = status;
  if (fields) err.fields = fields;
  return err;
}

function validate(body, required) {
  const fields = {};
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      fields[field] = `${field} is required`;
    }
  }
  if (Object.keys(fields).length > 0) {
    throw httpError(400, 'Validation failed', fields);
  }
}

async function listInspections(userId, userRole) {
  if (!userId || !userRole) throw httpError(403, 'Missing identity headers');
  if (userRole === 'Admin')     return store.getAll();
  if (userRole === 'Inspector') return store.getAll().then(all => all.filter(i => i.inspectorId === userId));
  if (userRole === 'Landlord')  return store.getAll().then(all => all.filter(i => i.requestedById === userId));
  throw httpError(403, `Role '${userRole}' is not permitted for this operation`);
}

async function getInspection(id, userId, userRole) {
  if (!userId || !userRole) throw httpError(403, 'Missing identity headers');
  const inspection = await store.getById(id);
  if (!inspection) throw httpError(404, `Inspection not found: ${id}`);
  if (userRole === 'Admin') return inspection;
  if (inspection.inspectorId === userId || inspection.requestedById === userId) return inspection;
  throw httpError(403, `Role '${userRole}' is not permitted for this operation`);
}

async function assertPropertyExists(propertyId, userId, userRole) {
  let res;
  try {
    res = await fetch(`${PROPERTY_SERVICE_URL}/properties/${encodeURIComponent(propertyId)}`, {
      headers: { 'X-User-Id': userId, 'X-User-Role': userRole },
    });
  } catch {
    throw httpError(502, 'Property service unavailable');
  }
  if (res.status === 404) throw httpError(422, 'Validation failed', { propertyId: 'propertyId does not exist' });
  if (!res.ok) throw httpError(502, 'Property service returned an error');
}

async function createInspection(body, userId, userRole) {
  if (!userId || !userRole) throw httpError(403, 'Missing identity headers');
  if (userRole !== 'Landlord' && userRole !== 'Admin') {
    throw httpError(403, `Role '${userRole}' is not permitted for this operation`);
  }
  validate(body, ['propertyId', 'inspectorId', 'scheduledAt']);
  await assertPropertyExists(body.propertyId, userId, userRole);
  return store.create({
    id:            uuidv4(),
    propertyId:    body.propertyId,
    inspectorId:   body.inspectorId,
    requestedById: userId,
    scheduledAt:   body.scheduledAt,
    status:        'SCHEDULED',
    notes:         body.notes || null,
    report:        null,
  });
}

async function updateInspection(id, body, userId, userRole) {
  if (!userId || !userRole) throw httpError(403, 'Missing identity headers');
  const inspection = await store.getById(id);
  if (!inspection) throw httpError(404, `Inspection not found: ${id}`);
  if (userRole !== 'Admin' && !(userRole === 'Inspector' && inspection.inspectorId === userId)) {
    throw httpError(403, `Role '${userRole}' is not permitted for this operation`);
  }
  const updates = {};
  if (body.notes  !== undefined) updates.notes  = body.notes;
  if (body.report !== undefined) updates.report = body.report;
  return store.update(id, updates);
}

async function updateStatus(id, status, userId, userRole) {
  if (!userId || !userRole) throw httpError(403, 'Missing identity headers');
  if (!status) throw httpError(400, 'Validation failed', { status: 'status is required' });
  if (!VALID_STATUSES.includes(status)) {
    throw httpError(400, 'Validation failed', { status: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  const inspection = await store.getById(id);
  if (!inspection) throw httpError(404, `Inspection not found: ${id}`);
  if (userRole !== 'Admin' && !(userRole === 'Inspector' && inspection.inspectorId === userId)) {
    throw httpError(403, `Role '${userRole}' is not permitted for this operation`);
  }
  return store.update(id, { status });
}

async function deleteInspection(id, userId, userRole) {
  if (!userId || !userRole) throw httpError(403, 'Missing identity headers');
  if (userRole !== 'Admin') throw httpError(403, `Role '${userRole}' is not permitted for this operation`);
  const inspection = await store.getById(id);
  if (!inspection) throw httpError(404, `Inspection not found: ${id}`);
  await store.remove(id);
}

module.exports = { listInspections, getInspection, createInspection, updateInspection, updateStatus, deleteInspection };
